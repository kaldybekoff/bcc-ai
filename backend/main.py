"""
BCC Assistant — FastAPI backend.

Архитектура: полный контекст (не RAG).
Все 16 .doc файлов загружаются один раз при старте и передаются
Gemini целиком в каждом запросе.

Endpoints:
  POST /api/chat   — SSE стриминг ответа
  GET  /api/health — статус + размер контекста
"""
from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from context import get_context, get_file_count

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GENERATION_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# ── Prompt ────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
Ты — корпоративный AI ассистент для сотрудников-операторов БЦК Банка (Банк ЦентрКредит, Казахстан).
Твоя задача — помогать операторам мгновенно находить точные ответы на вопросы клиентов.

ПРАВИЛА (обязательные):
1. Отвечай ТОЛЬКО на основе предоставленной базы знаний BCC.
2. Если ответ не найден — отвечай СТРОГО: "Эта информация не найдена в базе знаний. Пожалуйста, обратитесь к руководителю или продукт-оунеру."
3. НИКОГДА не выдумывай цифры, условия или факты.
4. Отвечай на том же языке, на котором задан вопрос (русский или казахский).
5. Ответ должен быть ЧЁТКИМ и СТРУКТУРИРОВАННЫМ.
6. Если есть расчёт (платёж, кэшбэк, переплата) — покажи формулу и пример.
7. Используй нумерованные списки и **жирный текст** для ключевых цифр.
8. Начинай сразу с ответа, без длинных вступлений.

ФОРМАТ:
- Простые вопросы: 2–4 предложения
- Сложные вопросы: структурированный список
- Расчёты: формула + пример с числами

БАЗА ЗНАНИЙ BCC:
{context}

ВОПРОС ОПЕРАТОРА:
{question}"""


def build_prompt(question: str, context: str) -> str:
    return SYSTEM_PROMPT.format(context=context, question=question)


# ── Startup ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    get_context()   # загрузить и кэшировать при старте
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="BCC Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None


# ── SSE streaming ─────────────────────────────────────────────────────────────
async def _sse_stream(question: str):
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    context = get_context()

    def _produce() -> None:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = build_prompt(question, context)
            cfg = types.GenerateContentConfig(
                temperature=0.1,
                top_p=0.8,
                top_k=40,
                max_output_tokens=1024,
            )
            for part in client.models.generate_content_stream(
                model=GENERATION_MODEL,
                contents=prompt,
                config=cfg,
            ):
                text = part.text if part.text else ""
                if text:
                    loop.call_soon_threadsafe(queue.put_nowait, {"text": text})
        except Exception as exc:  # noqa: BLE001
            loop.call_soon_threadsafe(
                queue.put_nowait,
                {"text": f"Ошибка: {exc}", "done": True, "sources": []},
            )
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _produce)

    while True:
        event = await queue.get()
        if event is None:
            break
        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'done': True, 'sources': []}, ensure_ascii=False)}\n\n"


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        _sse_stream(req.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    ctx = get_context()
    return {
        "status":        "ok",
        "files_loaded":  get_file_count(),
        "context_chars": len(ctx),
        "model":         GENERATION_MODEL,
    }
