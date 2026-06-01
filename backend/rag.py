"""RAG pipeline: вопрос → поиск в ChromaDB → промпт → стриминг ответа Gemini."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

from google import genai
from google.genai import types

from config import (
    DISTANCE_THRESHOLD,
    GENERATION_CONFIG,
    GENERATION_MODEL,
    GEMINI_API_KEY,
    N_RESULTS,
)
from embeddings import embed_query, get_collection

SYSTEM_PROMPT = """Ты — корпоративный AI ассистент для сотрудников-операторов БЦК Банка (Банк ЦентрКредит, Казахстан).
Твоя задача — помогать операторам мгновенно находить точные ответы на вопросы клиентов.

ПРАВИЛА (обязательные, не нарушать):
1. Отвечай ТОЛЬКО на основе предоставленного контекста из базы знаний BCC.
2. Если ответ НЕ найден в контексте — отвечай СТРОГО: "Эта информация не найдена в базе знаний. Пожалуйста, обратитесь к руководителю или продукт-оунеру."
3. НИКОГДА не выдумывай цифры, условия или факты.
4. Отвечай на том же языке, на котором задан вопрос:
   - Вопрос на русском → ответ на русском
   - Вопрос на казахском → ответ на казахском
5. Ответ должен быть ЧЁТКИМ и СТРУКТУРИРОВАННЫМ — оператор должен сразу дать ответ клиенту.
6. Если в вопросе есть расчёт (платёж, кэшбэк, переплата) — покажи формулу и пример.
7. Используй нумерованные списки и **жирный текст** для ключевых цифр.
8. Не используй длинные вступления. Начинай сразу с ответа.

ФОРМАТ ОТВЕТА:
- Короткий ответ: 2-4 предложения для простых вопросов
- Структурированный ответ: список для сложных вопросов
- Расчёт: формула + пример с конкретными числами

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ BCC:
{context}

ВОПРОС ОПЕРАТОРА:
{question}"""

NOT_FOUND_MESSAGE = (
    "Эта информация не найдена в базе знаний. "
    "Пожалуйста, обратитесь к руководителю или продукт-оунеру."
)


@dataclass
class RetrievedChunk:
    document: str
    source_file: str
    distance: float


def retrieve(question: str) -> list[RetrievedChunk]:
    """Найти топ-N релевантных чанков, отфильтровав по порогу дистанции."""
    collection = get_collection()
    query_vec = embed_query(question)
    res = collection.query(
        query_embeddings=[query_vec],
        n_results=N_RESULTS,
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    chunks: list[RetrievedChunk] = []
    for doc, meta, dist in zip(docs, metas, dists):
        if dist is not None and dist > DISTANCE_THRESHOLD:
            continue
        chunks.append(
            RetrievedChunk(
                document=doc,
                source_file=(meta or {}).get("source_file", "неизвестно"),
                distance=dist,
            )
        )
    return chunks


def build_prompt(question: str, chunks: list[RetrievedChunk]) -> str:
    context = "\n\n".join(
        f"--- Из файла: {c.source_file} ---\n{c.document}" for c in chunks
    )
    return SYSTEM_PROMPT.format(context=context, question=question)


def answer_stream(question: str) -> Iterator[dict]:
    """Сгенерировать ответ потоком.

    Yields словари:
      {"text": "..."}                      — фрагмент ответа
      {"done": True, "sources": [...]}     — финальное событие со списком источников
    """
    chunks = retrieve(question)

    if not chunks:
        yield {"text": NOT_FOUND_MESSAGE}
        yield {"done": True, "sources": []}
        return

    prompt = build_prompt(question, chunks)

    client = genai.Client(api_key=GEMINI_API_KEY)
    gen_config = types.GenerateContentConfig(
        temperature=GENERATION_CONFIG["temperature"],
        top_p=GENERATION_CONFIG["top_p"],
        top_k=GENERATION_CONFIG["top_k"],
        max_output_tokens=GENERATION_CONFIG["max_output_tokens"],
    )

    for part in client.models.generate_content_stream(
        model=GENERATION_MODEL,
        contents=prompt,
        config=gen_config,
    ):
        text = part.text if part.text else ""
        if text:
            yield {"text": text}

    sources = list(dict.fromkeys(c.source_file for c in chunks))
    yield {"done": True, "sources": sources}
