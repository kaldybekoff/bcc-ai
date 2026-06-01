# BCC Assistant — AI Чат для сотрудников BCC Bank

## Цель проекта
Корпоративный AI ассистент для сотрудников-операторов BCC Bank (Банк ЦентрКредит).
Сотрудники задают вопросы в чат → вся база знаний передаётся в контекст → Gemini даёт чёткий ответ.
Сайт только для внутреннего использования сотрудниками, не для клиентов.

---

## Стек
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** FastAPI (Python 3.11)
- **AI модель:** Google Gemini 1.5 Flash
- **Деплой Frontend:** Vercel
- **Деплой Backend:** Google Cloud Run

❌ ChromaDB — НЕ используется
❌ text-embedding-004 — НЕ используется
❌ RAG pipeline — НЕ используется
✅ Вся база знаний (~42k токенов) передаётся целиком в system prompt

---

## Почему не RAG

Все 16 файлов = ~42 000 токенов.
Контекстное окно Gemini 1.5 Flash = 1 000 000 токенов.
База знаний занимает 4% контекста → RAG избыточен.
Full context = более точные ответы + проще код.

---

## Структура проекта
```
bcc-assistant/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── FAQSidebar.tsx
│   │   ├── MessageBubble.tsx
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── faq-data.ts
│   ├── public/
│   │   └── bcc-logo.svg
│   └── package.json
│
└── backend/
    ├── main.py          ← FastAPI endpoints
    ├── context.py       ← парсинг .doc → единый текст контекста
    ├── knowledge/       ← 16 .doc файлов базы знаний
    ├── requirements.txt
    └── Dockerfile
```

---

## Как работает бэкенд (просто)

```python
# context.py — запускается один раз при старте сервера
KNOWLEDGE_CONTEXT = load_all_docs("knowledge/")  # ~42k токенов

# main.py — при каждом запросе
@app.post("/api/chat")
async def chat(question: str):
    prompt = SYSTEM_PROMPT.format(context=KNOWLEDGE_CONTEXT, question=question)
    return StreamingResponse(gemini.stream(prompt))
```

---

## КРИТИЧНО: Формат файлов базы знаний

Все 16 файлов `.doc` — это **MHTML экспорт из Confluence**, НЕ бинарный Word.
Исключение: `общие_условия.doc` — старый Word 97.

### Парсинг MHTML файлов (15 файлов):
```python
import email
import html2text
from pathlib import Path

def parse_mhtml(filepath: str) -> str:
    with open(filepath, 'rb') as f:
        raw = f.read()
    msg = email.message_from_bytes(raw)
    text = ''
    for part in msg.walk():
        if part.get_content_type() == 'text/html':
            payload = part.get_payload(decode=True)
            if payload:
                html = payload.decode('utf-8', errors='replace')
                h = html2text.HTML2Text()
                h.ignore_links = True
                h.ignore_images = True
                h.body_width = 0
                text += h.handle(html)
    return text

def load_all_docs(folder: str) -> str:
    context = ""
    for filepath in Path(folder).glob("*.doc"):
        text = parse_mhtml(str(filepath))
        context += f"\n\n=== {filepath.name} ===\n{text}"
    return context.strip()
```

### Парсинг общие_условия.doc (Word 97):
```bash
soffice --headless --convert-to docx --outdir /tmp/ общие_условия.doc
```
Затем читать через `python-docx` и добавить в общий контекст.

---

## Переменные окружения
```
Backend (.env):
  GEMINI_API_KEY=...
  ENVIRONMENT=development
  CORS_ORIGINS=http://localhost:3000,https://твой-домен.vercel.app

Frontend (.env.local):
  NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Команды запуска (development)
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# ← embeddings.py больше НЕ нужен

# Frontend
cd frontend
npm install
npm run dev
```

---

## requirements.txt (backend)
```
fastapi
uvicorn[standard]
google-generativeai
html2text
python-docx
python-dotenv
python-multipart
```

❌ chromadb — убрать
❌ sentence-transformers — убрать

---

## Первая фраза при старте новой сессии
```
Read CLAUDE.md and PROGRESS.md first, then continue from where we left off.
```

## Статус → см. PROGRESS.md
## Архитектура → см. ARCHITECTURE.md
## База знаний → см. KNOWLEDGE_BASE.md
## Дизайн → см. DESIGN.md
## FAQ контент → см. FAQ_CONTENT.md
## Промпты → см. PROMPTS.md
## Деплой → см. DEPLOYMENT.md
