"""BCC Assistant — FastAPI backend (Groq + Llama 3.3 70B).

Контекст не отправляется целиком — ищем топ-5 релевантных разделов
по ключевым словам чтобы уложиться в лимит токенов Groq free tier.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq
from pydantic import BaseModel, Field

from context import get_context, get_file_count

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL        = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
TOP_K        = int(os.getenv("TOP_K", "5"))

SYSTEM_PROMPT = """\
Ты — корпоративный AI ассистент для сотрудников-операторов БЦК Банка (Банк ЦентрКредит, Казахстан).
Твоя задача — помогать операторам мгновенно находить точные ответы на вопросы клиентов.

ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе предоставленной базы знаний BCC.
2. Если ответ не найден — отвечай: "Эта информация не найдена в базе знаний. Обратитесь к руководителю."
3. НИКОГДА не выдумывай цифры, условия или факты.
4. Отвечай на том же языке что и вопрос (русский или казахский).
5. Используй **жирный текст** для ключевых цифр и списки для сложных ответов.
6. Начинай сразу с ответа, без длинных вступлений.

РЕЛЕВАНТНЫЕ РАЗДЕЛЫ БАЗЫ ЗНАНИЙ BCC:
{context}"""


def find_relevant_sections(question: str, full_context: str, top_k: int = TOP_K) -> str:
    """Найти топ-N разделов базы знаний по ключевым словам вопроса."""
    # Разбиваем контекст на разделы по === filename ===
    header_re = re.compile(r"(=== .+? ===)", re.MULTILINE)
    parts = header_re.split(full_context)

    sections: list[str] = []
    i = 1
    while i < len(parts):
        header  = parts[i]
        content = parts[i + 1] if i + 1 < len(parts) else ""
        sections.append(f"{header}\n{content.strip()}")
        i += 2

    if not sections:
        return full_context[:15000]

    # Скорим каждый раздел по пересечению слов с вопросом
    q_words = set(re.findall(r"\w+", question.lower()))
    scored: list[tuple[int, str]] = []
    for section in sections:
        s_words = set(re.findall(r"\w+", section.lower()))
        score   = len(q_words & s_words)
        scored.append((score, section))

    scored.sort(key=lambda x: x[0], reverse=True)
    return "\n\n".join(s for _, s in scored[:top_k])


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_context()
    yield


app = FastAPI(title="BCC Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None


async def _sse_stream(question: str):
    loop  = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    ctx   = find_relevant_sections(question, get_context())

    def _produce() -> None:
        try:
            client = Groq(api_key=GROQ_API_KEY)
            stream = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT.format(context=ctx)},
                    {"role": "user",   "content": question},
                ],
                stream=True,
                temperature=0.1,
                max_tokens=1024,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    loop.call_soon_threadsafe(queue.put_nowait, {"text": text})
        except Exception as exc:  # noqa: BLE001
            loop.call_soon_threadsafe(queue.put_nowait, {"text": f"Ошибка: {exc}", "done": True, "sources": []})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _produce)

    while True:
        event = await queue.get()
        if event is None:
            break
        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'done': True, 'sources': []}, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        _sse_stream(req.question),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    ctx = get_context()
    return {"status": "ok", "files_loaded": get_file_count(), "context_chars": len(ctx), "model": MODEL}
