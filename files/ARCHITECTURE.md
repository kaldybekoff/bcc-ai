# Архитектура BCC Assistant

## Общая схема системы

```
[Сотрудник BCC]
      │
      │ вопрос (RU или KZ)
      ▼
┌─────────────────────────────────────┐
│         FRONTEND (Vercel)           │
│   Next.js 14 + Tailwind + shadcn    │
│                                     │
│  ┌──────────────┐ ┌───────────────┐ │
│  │ FAQSidebar   │ │  ChatWindow   │ │
│  │ (клик →      │ │  (streaming)  │ │
│  │  автовставка)│ │               │ │
│  └──────────────┘ └───────────────┘ │
└──────────────┬──────────────────────┘
               │ POST /api/chat (SSE)
               ▼
┌─────────────────────────────────────┐
│         BACKEND (Cloud Run)         │
│            FastAPI                  │
│                                     │
│  1. Взять готовый KNOWLEDGE_CONTEXT │
│  2. Собрать промпт (system + вопрос)│
│  3. Стримить ответ из Gemini Flash  │
│                                     │
│                ┌────────────────┐   │
│                │  Gemini API    │   │
│                │  1.5 Flash     │   │
│                └────────────────┘   │
└─────────────────────────────────────┘
```

❌ ChromaDB — убрана
❌ text-embedding-004 — убран
❌ RAG pipeline — убран

---

## Почему Full Context вместо RAG

```
16 файлов × ~10 000 символов = ~167 000 символов
167 000 ÷ 4 = ~42 000 токенов

Контекст Gemini 1.5 Flash = 1 000 000 токенов
База знаний занимает = 4% контекста
```

RAG нужен когда база > 500k токенов или файлов > 500.
У нас 16 файлов — вся база помещается целиком в один запрос.
Точность ответов при full context выше (нет риска пропустить нужный чанк).

---

## Full Context Pipeline

### Запуск сервера (один раз)

```
[16 .doc файлов в backend/knowledge/]
           │
           ▼
    [context.py: load_all_docs()]
           │
    parse_mhtml() для 15 MHTML файлов
    python-docx для общие_условия.doc
           │
           ▼
    KNOWLEDGE_CONTEXT = единая строка ~42k токенов
    (хранится в памяти сервера)
```

### Ответ на вопрос (каждый запрос)

```
[Вопрос сотрудника]
        │
        ▼
  Сборка промпта:
  SYSTEM_PROMPT + KNOWLEDGE_CONTEXT + вопрос
        │
        ▼
  Gemini 1.5 Flash (stream=True)
        │
        ▼
  SSE → Frontend (побуквенно)
```

---

## Код бэкенда

### context.py

```python
import email
import html2text
from pathlib import Path
from docx import Document
import subprocess
import tempfile

def parse_mhtml(filepath: str) -> str:
    with open(filepath, 'rb') as f:
        raw = f.read()
    msg = email.message_from_bytes(raw)
    text = ''
    for part in msg.walk():
        if part.get_content_type() == 'text/html':
            payload = part.get_payload(decode=True)
            if payload:
                h = html2text.HTML2Text()
                h.ignore_links = True
                h.ignore_images = True
                h.body_width = 0
                text += h.handle(payload.decode('utf-8', errors='replace'))
    return text

def parse_word97(filepath: str) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([
            'soffice', '--headless', '--convert-to', 'docx',
            '--outdir', tmp, filepath
        ], capture_output=True)
        docx_path = Path(tmp) / (Path(filepath).stem + '.docx')
        if docx_path.exists():
            doc = Document(str(docx_path))
            return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    return ''

def load_all_docs(folder: str) -> str:
    context_parts = []
    for filepath in sorted(Path(folder).glob('*.doc')):
        name = filepath.name
        with open(filepath, 'rb') as f:
            header = f.read(8)

        if header[:4] == b'Date' or b'MIME' in header:
            text = parse_mhtml(str(filepath))
        else:
            text = parse_word97(str(filepath))

        if text.strip():
            context_parts.append(f"=== {name} ===\n{text.strip()}")

    return '\n\n'.join(context_parts)
```

### main.py

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from context import load_all_docs
from prompts import SYSTEM_PROMPT
import google.generativeai as genai
import os, json

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', '').split(','),
    allow_methods=['*'], allow_headers=['*'])

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

# Загружается один раз при старте
KNOWLEDGE = load_all_docs('knowledge/')

@app.post('/api/chat')
async def chat(body: dict):
    question = body.get('question', '')
    prompt = SYSTEM_PROMPT.format(
        context=KNOWLEDGE,
        question=question
    )

    async def stream():
        response = model.generate_content(prompt, stream=True,
            generation_config={'temperature': 0.1, 'max_output_tokens': 1024})
        for chunk in response:
            if chunk.text:
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(stream(), media_type='text/event-stream')

@app.get('/api/health')
async def health():
    tokens_est = len(KNOWLEDGE) // 4
    return {'status': 'ok', 'knowledge_tokens': tokens_est}
```

---

## API Endpoints

### POST /api/chat
```json
Request:
{
  "question": "Какой максимальный кредитный лимит по картакарта?"
}

Response: text/event-stream (SSE)
data: {"text": "Максимальный"}
data: {"text": " кредитный лимит..."}
data: {"done": true}
```

### GET /api/health
```json
Response: {"status": "ok", "knowledge_tokens": 42000}
```

---

## Деплой схема

```
GitHub repo
    │
    ├── /frontend → Vercel (auto-deploy on push)
    │
    └── /backend  → Google Cloud Run
                    (gcloud builds submit)

Переменные окружения:
    Vercel:     NEXT_PUBLIC_API_URL
    Cloud Run:  GEMINI_API_KEY, CORS_ORIGINS
```

---

## Лимиты Gemini (бесплатный tier)

| Модель | RPM | RPD | TPM |
|---|---|---|---|
| gemini-1.5-flash | 15 | 1 500 | 1 000 000 |

Каждый запрос ~42k токенов (контекст) + ~100 токенов (вопрос) + ~500 токенов (ответ).
При 50 запросах/день = 2 150 000 токенов = 0.2% месячного лимита.
Для 20-30 сотрудников хватает многократно.

---

## Dockerfile

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Примечание: LibreOffice нужен только для `общие_условия.doc`.
Если этот файл сконвертировать заранее в .docx — можно убрать LibreOffice и уменьшить образ.
