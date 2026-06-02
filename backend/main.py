"""BCC Assistant — FastAPI backend (OpenAI gpt-4o-mini).

Контекст не отправляется целиком — chunk-level keyword retrieval отбирает
самые релевантные фрагменты базы знаний (см. retrieval.py): это даёт точные
источники операторам и экономит токены.
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
from openai import OpenAI
from pydantic import BaseModel, Field

from context import get_context, get_file_count
from retrieval import find_relevant, relevant_sources

load_dotenv()

OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
MODEL             = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
CORS_ORIGINS      = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "30000"))

SYSTEM_PROMPT = """\
Ты — корпоративный AI ассистент для сотрудников-операторов БЦК Банка (Банк ЦентрКредит, Казахстан).
Твоя задача — помогать операторам мгновенно находить точные ответы на вопросы клиентов.

ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе предоставленной базы знаний BCC.
2. Если ответ не найден в базе — отвечай: "Эта информация не найдена в базе знаний. Обратитесь к руководителю или продукт-оунеру."
3. НИКОГДА не выдумывай цифры, условия, ставки или факты.
4. Отвечай на том же языке что и вопрос (русский или казахский).
5. Используй **жирный текст** для ключевых цифр и нумерованные списки для сложных ответов.
6. Если есть расчёт (платёж, кэшбэк, переплата) — покажи формулу и пример с числами.
7. Начинай сразу с ответа, без длинных вступлений.

РЕЛЕВАНТНЫЕ РАЗДЕЛЫ БАЗЫ ЗНАНИЙ BCC:
{context}"""


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
    loop     = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    full_ctx = get_context()
    ctx      = find_relevant(question, full_ctx, max_total_chars=MAX_CONTEXT_CHARS)
    sources  = relevant_sources(question, full_ctx)[:3]

    def _produce() -> None:
        try:
            client = OpenAI(api_key=OPENAI_API_KEY)
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

    yield f"data: {json.dumps({'done': True, 'sources': sources}, ensure_ascii=False)}\n\n"


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
