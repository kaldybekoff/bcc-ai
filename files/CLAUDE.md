# BCC Assistant — AI чат для сотрудников BCC Bank

## Цель проекта
Корпоративный AI-ассистент для сотрудников-операторов BCC Bank (Банк ЦентрКредит).
Оператор задаёт вопрос в чат → бэкенд находит релевантные фрагменты базы знаний →
OpenAI даёт точный структурированный ответ. Только для внутреннего использования.

---

## Стек (актуальный)
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Framer Motion + react-markdown
- **Backend:** FastAPI (Python 3.11)
- **AI (генерация):** OpenAI `gpt-4o-mini` (env `OPENAI_MODEL`)
- **AI (поиск):** OpenAI `text-embedding-3-small` (env `EMBED_MODEL`)
- **Деплой Frontend:** Vercel — https://bcc-ai.vercel.app
- **Деплой Backend:** Render (Docker) — https://bcc-ai.onrender.com

❌ Gemini — не используется (исторически был, переключились на OpenAI)
❌ ChromaDB / RAG-фреймворк — не используется (свой лёгкий поиск in-memory на numpy)
❌ shadcn/ui — не используется

---

## Как работает retrieval (важно)

База НЕ передаётся целиком. Используется **гибридный chunk-level поиск** (`retrieval.py`):
- каждый файл режется на чанки ~2000 символов;
- запрос ищется по **эмбеддингам** (семантика) + **бонус за точные слова** (термины вроде `#картакарта`, MCC-кодов, названий продуктов);
- берётся `top_k=14` лучших чанков в пределах бюджета (`MAX_CONTEXT_CHARS`, по умолч. 30000 символов);
- эмбеддинги считаются один раз и кэшируются на диск (`.embcache/`); при отсутствии `OPENAI_API_KEY` — мягкий откат на keyword-only.

Это даёт точные источники операторам и экономит токены.

---

## КРИТИЧНО: парсинг базы знаний (`context.py`)

Файлы базы — **MHTML-экспорт из Confluence** (большинство) + один Word 97 (`общие условия.doc`).
Парсинг через **BeautifulSoup** (не голый html2text):
- реальные `<table>` → markdown-таблицы (строки/колонки сохраняются);
- карточки Confluence `aura-card` → строки `**заголовок** — значение` (иначе цифры теряют привязку к продукту);
- фильтр base64-блобов встроенных картинок (без него `общие условия.doc` раздувался до ~2.7M символов мусора);
- Word 97 конвертируется через LibreOffice (`soffice`) → `python-docx`.

База: 21 файл, ~600k символов, ~354 чанка.

---

## Структура проекта
```
bcc-assistant/
├── frontend/                 # Next.js 16, деплой на Vercel
│   ├── app/                  # page.tsx, layout.tsx, globals.css
│   ├── components/           # Header, FAQSidebar, ChatWindow, MessageBubble, BCCLogo, HelpModal
│   └── lib/api.ts            # SSE-клиент к бэкенду
│
└── backend/                  # FastAPI, деплой на Render (Docker)
    ├── main.py               # /api/chat (SSE) + /api/health
    ├── context.py            # парсинг .doc → единый текст (BeautifulSoup), кэш в памяти
    ├── retrieval.py          # гибридный поиск (эмбеддинги + keyword), кэш эмбеддингов
    ├── knowledge/            # 21 .doc базы знаний (в подпапках)
    ├── requirements.txt
    └── Dockerfile
```

Подпапки `knowledge/`: `картa/`, `кн/`, `автокредит/`, `депозиты/`, `ипотека/`, `залог/`.
`context.py` ищет файлы рекурсивно (`rglob("*.doc")`) — новые файлы подхватываются автоматически.

---

## Поток запроса

```python
# context.py — при старте сервера (lifespan)
KNOWLEDGE = get_context()      # парсинг всех .doc, кэш в памяти
warmup(KNOWLEDGE)              # построение чанков + эмбеддингов (с диск-кэшем)

# main.py — на каждый запрос
ctx, sources = retrieve(question, KNOWLEDGE)        # топ-14 чанков
messages = [system(ctx)] + history + [user(question)]
StreamingResponse(openai.stream(messages))          # SSE
```

Фронтенд передаёт историю диалога — ассистент помнит контекст уточняющих вопросов.

---

## Переменные окружения
```
Backend:
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-4o-mini
  EMBED_MODEL=text-embedding-3-small
  CORS_ORIGINS=https://bcc-ai.vercel.app,http://localhost:3000
  # опционально: MAX_CONTEXT_CHARS, MAX_OUTPUT_TOKENS, MAX_HISTORY_MESSAGES

Frontend:
  NEXT_PUBLIC_API_URL=https://bcc-ai.onrender.com   # или http://localhost:8000 локально
```

---

## Запуск локально
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Документация
- Архитектура → ARCHITECTURE.md
- Статус → PROGRESS.md
- База знаний → KNOWLEDGE_BASE.md
- Дизайн → DESIGN.md
- FAQ → FAQ_CONTENT.md
- Промпт → PROMPTS.md
- Деплой → DEPLOYMENT.md
- Переменные окружения → ENV.md
