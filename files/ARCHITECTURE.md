# Архитектура BCC Assistant

## Общая схема

```
[Сотрудник BCC]
      │ вопрос (RU или KZ)
      ▼
┌─────────────────────────────────────┐
│         FRONTEND (Vercel)           │
│   Next.js 16 + React 19 + Tailwind  │
│   + Framer Motion + react-markdown  │
│                                     │
│  ┌──────────────┐ ┌───────────────┐ │
│  │ FAQSidebar   │ │  ChatWindow   │ │
│  │ (клик →      │ │  (SSE стрим)  │ │
│  │  автовставка)│ │  + история    │ │
│  └──────────────┘ └───────────────┘ │
└──────────────┬──────────────────────┘
               │ POST /api/chat (SSE), body: {question, history}
               ▼
┌─────────────────────────────────────┐
│        BACKEND (Render, Docker)     │
│            FastAPI                  │
│                                     │
│  1. retrieve(): топ-14 чанков базы  │
│     (эмбеддинги + keyword)          │
│  2. system(ctx) + история + вопрос  │
│  3. стрим ответа из OpenAI          │
│                                     │
│   ┌─────────────┐  ┌─────────────┐  │
│   │ gpt-4o-mini │  │ embeddings  │  │
│   │  (ответы)   │  │ 3-small     │  │
│   └─────────────┘  └─────────────┘  │
└─────────────────────────────────────┘
```

❌ Gemini, ChromaDB, RAG-фреймворк, full-context — НЕ используются.

---

## Почему chunk-level retrieval, а не full-context

База ~600k символов (~150k токенов). Передавать её целиком на каждый запрос:
- дорого по токенам;
- ухудшает фокус модели;
- не даёт точных источников оператору.

Вместо этого режем базу на чанки и отбираем самые релевантные. Поиск **гибридный**:
семантика (эмбеддинги понимают смысл: «сколько стоит обслуживание» → «обслуживание 0 ₸»)
плюс бонус за точные термины (`#картакарта`, MCC-коды, названия продуктов).

---

## Backend pipeline

### При старте сервера (один раз, lifespan)
```
[21 .doc в backend/knowledge/ (подпапки)]
        │  context.py: get_context()
        ▼
   BeautifulSoup-парсинг:
     • <table> → markdown
     • aura-card → "**заголовок** — значение"
     • фильтр base64-картинок
     • Word97 (общие условия.doc) → LibreOffice → python-docx
        ▼
   KNOWLEDGE (единая строка ~600k символов, в памяти)
        │  retrieval.py: warmup()
        ▼
   чанки ~2000 симв  →  эмбеддинги text-embedding-3-small
        ▼
   диск-кэш .embcache/<hash>.npy  (повторно API не дёргается)
```

### На каждый запрос
```
[вопрос + история]
      │  retrieval.py: retrieve(question)
      ▼
  score = cos(эмбеддинг) + 0.12 * keyword_match
  → топ-14 чанков в пределах бюджета (MAX_CONTEXT_CHARS=30000)
      ▼
  messages = system(ctx) + history(последние N) + user(вопрос)
      ▼
  OpenAI gpt-4o-mini (stream=True, temp=0.1, max_tokens=3000)
      ▼
  SSE → Frontend (по токенам) + список источников
```

---

## Backend-модули

| Файл | Назначение |
|---|---|
| `context.py` | Загрузка и парсинг всех `.doc` (BeautifulSoup + LibreOffice), кэш в памяти |
| `retrieval.py` | Гибридный поиск (эмбеддинги + keyword), чанкинг, диск-кэш эмбеддингов |
| `main.py` | FastAPI: `POST /api/chat` (SSE), `GET /api/health` |

Других модулей нет (исторические `config.py`, `parsers.py`, `chunker.py`, `embeddings.py`, `rag.py` из старого плана не существуют).

---

## API

### POST /api/chat
```json
Request:
{
  "question": "Какой максимальный кредитный лимит по картакарта?",
  "history": [{"role": "user", "text": "..."}, {"role": "ai", "text": "..."}],
  "session_id": null
}

Response: text/event-stream (SSE)
data: {"text": "Максимальный"}
data: {"text": " кредитный лимит..."}
data: {"done": true, "sources": ["кредитный лимит.doc", "общие условия.doc"]}
```

### GET /api/health
```json
{"status": "ok", "files_loaded": 21, "context_chars": 601327, "model": "gpt-4o-mini"}
```

---

## Деплой

```
GitHub repo (main)
    ├── /frontend → Vercel (auto-deploy on push)
    └── /backend  → Render  (Docker, auto-deploy on push)

Переменные:
    Vercel:  NEXT_PUBLIC_API_URL
    Render:  OPENAI_API_KEY, OPENAI_MODEL, EMBED_MODEL, CORS_ORIGINS
```

Подробнее — DEPLOYMENT.md.

---

## Dockerfile (backend)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
```

LibreOffice нужен только для `общие условия.doc` (Word 97).
Эмбеддинги строятся при старте контейнера; диск-кэш `.embcache/` на Render не переживает
рестарт, поэтому при холодном старте пересчёт (~секунды, ~$0.002).
