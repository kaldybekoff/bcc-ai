"""BCC Assistant — FastAPI backend (OpenAI).

Гибридный retrieval (эмбеддинги + ключевые слова, см. retrieval.py) отбирает
самые релевантные фрагменты базы знаний и передаёт их модели вместе с историей
диалога. Это даёт точные источники операторам и углублённые ответы.
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
from retrieval import retrieve, warmup

load_dotenv()

OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
MODEL             = os.getenv("OPENAI_MODEL", "gpt-4o")
CORS_ORIGINS      = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "30000"))
MAX_TOKENS        = int(os.getenv("MAX_OUTPUT_TOKENS", "3000"))
MAX_HISTORY       = int(os.getenv("MAX_HISTORY_MESSAGES", "8"))

SYSTEM_PROMPT = """\
Ты — корпоративный AI-ассистент для сотрудников-операторов БЦК Банка (Банк ЦентрКредит, Казахстан).
Оператор разговаривает с клиентом и спрашивает тебя — ты помогаешь дать точный и исчерпывающий ответ.

ГЛАВНЫЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе раздела «БАЗА ЗНАНИЙ» ниже. Ничего не выдумывай.
2. НИКОГДА не придумывай и не округляй цифры, ставки, сроки, проценты, лимиты — приводи их ровно как в базе.
3. Если ответа в базе нет — честно скажи: "Эта информация не найдена в базе знаний. Обратитесь к руководителю или продукт-оунеру." Не пытайся угадать.
4. Отвечай на языке вопроса (русский или казахский).

КАК ОТВЕЧАТЬ ГЛУБОКО И ЧЁТКО (это важно):
5. Давай ПОЛНЫЙ ответ: не только прямую цифру, но и связанные условия, исключения и нюансы, если они есть в базе (например к ставке — ГЭСВ, срок, валюта, способ оформления).
6. Структурируй ответ: **жирным** — ключевые цифры; нумерованные/маркированные списки — для условий и шагов.
7. Если в базе несколько продуктов/вариантов (разные карты, депозиты, виды кредита) — НЕ смешивай их. Явно укажи, к какому продукту относится каждая цифра.
8. Если есть расчёт (платёж, кэшбэк, переплата, первоначальный взнос) — покажи формулу и пример с конкретными числами.
9. Если данные в базе выглядят неоднозначно или зависят от условий — перечисли варианты и от чего они зависят, а не давай один наугад.
10. Начинай сразу с сути, без длинных вступлений. В конце, если уместно, одной строкой добавь практический совет оператору.

БАЗА ЗНАНИЙ BCC (релевантные разделы под этот вопрос):
{context}"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    ctx = get_context()
    warmup(ctx)          # построить индекс + эмбеддинги (с диск-кэшем)
    yield


app = FastAPI(title="BCC Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryMessage(BaseModel):
    role: str                       # "user" | "ai"
    text: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None
    history: list[HistoryMessage] = Field(default_factory=list)


def _build_messages(question: str, ctx: str, history: list[HistoryMessage]) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT.format(context=ctx)}]
    for h in history[-MAX_HISTORY:]:
        role = "assistant" if h.role == "ai" else "user"
        if h.text.strip():
            messages.append({"role": role, "content": h.text})
    messages.append({"role": "user", "content": question})
    return messages


async def _sse_stream(question: str, history: list[HistoryMessage]):
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    full_ctx = get_context()
    ctx, sources = retrieve(question, full_ctx, max_total_chars=MAX_CONTEXT_CHARS)
    messages = _build_messages(question, ctx, history)

    def _produce() -> None:
        try:
            client = OpenAI(api_key=OPENAI_API_KEY)
            stream = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=True,
                temperature=0.1,
                max_tokens=MAX_TOKENS,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    loop.call_soon_threadsafe(queue.put_nowait, {"text": text})
        except Exception as exc:  # noqa: BLE001
            loop.call_soon_threadsafe(queue.put_nowait, {"text": f"Ошибка: {exc}"})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _produce)

    while True:
        event = await queue.get()
        if event is None:
            break
        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'done': True, 'sources': sources[:3]}, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        _sse_stream(req.question, req.history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    ctx = get_context()
    return {"status": "ok", "files_loaded": get_file_count(), "context_chars": len(ctx), "model": MODEL}
