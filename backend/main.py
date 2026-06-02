"""BCC Assistant — FastAPI backend (Claude claude-sonnet-4-6).

Контекст не отправляется целиком — ищем топ-5 релевантных разделов
по ключевым словам вопроса.
"""
from __future__ import annotations

import json
import os
import re
from contextlib import asynccontextmanager

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from context import get_context, get_file_count

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL             = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
CORS_ORIGINS      = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
TOP_K             = int(os.getenv("TOP_K", "5"))

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


def find_relevant_sections(question: str, full_context: str, top_k: int = TOP_K, max_total_chars: int = 80000) -> str:
    """Найти топ-N разделов базы знаний по ключевым словам вопроса."""
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
        return full_context[:max_total_chars]

    q_words = set(re.findall(r"\w+", question.lower()))
    scored: list[tuple[int, str]] = []
    for section in sections:
        s_words = set(re.findall(r"\w+", section.lower()))
        score   = len(q_words & s_words)
        scored.append((score, section))

    scored.sort(key=lambda x: x[0], reverse=True)

    result_parts: list[str] = []
    total = 0
    for _, section in scored[:top_k]:
        remaining = max_total_chars - total
        if remaining <= 500:
            break
        chunk = section[:remaining]
        result_parts.append(chunk)
        total += len(chunk)

    return "\n\n".join(result_parts)


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
    ctx = find_relevant_sections(question, get_context())

    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        async with client.messages.stream(
            model=MODEL,
            max_tokens=1024,
            temperature=0.1,
            system=SYSTEM_PROMPT.format(context=ctx),
            messages=[{"role": "user", "content": question}],
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text}, ensure_ascii=False)}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'text': f'Ошибка: {exc}', 'done': True, 'sources': []}, ensure_ascii=False)}\n\n"
        return

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
