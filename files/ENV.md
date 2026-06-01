# Переменные окружения BCC Assistant

## ⚠️ НИКОГДА не коммитить реальные ключи в git!
## Добавить в .gitignore: .env, .env.local, .env.production

---

## Backend — backend/.env

```env
# Google Gemini API Key
# Получить: https://aistudio.google.com/ → Get API Key → Create API key
GEMINI_API_KEY=AIza...

# Окружение
ENVIRONMENT=development

# CORS — фронтенд URL через запятую
CORS_ORIGINS=http://localhost:3000,https://твой-домен.vercel.app

# ChromaDB путь (опционально, по умолчанию ./chroma_db)
CHROMA_PATH=./chroma_db

# ChromaDB коллекция
CHROMA_COLLECTION=bcc_knowledge
```

---

## Frontend — frontend/.env.local

```env
# URL бэкенда
# Development:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production (заменить после деплоя на Cloud Run):
# NEXT_PUBLIC_API_URL=https://bcc-assistant-backend-xxxx-uc.a.run.app
```

---

## Как получить GEMINI_API_KEY

1. Перейти: https://aistudio.google.com/
2. Sign in с Google аккаунтом
3. Нажать "Get API Key" → "Create API key in new project"
4. Скопировать ключ (начинается с AIza...)
5. Вставить в `backend/.env`

**Лимиты бесплатного Gemini (проверено 2025):**

| Модель | RPM | RPD | TPM |
|---|---|---|---|
| gemini-1.5-flash | 15 | 1 500 | 1 000 000 |
| text-embedding-004 | 1 500 | 1 500 | — |

Для 20-30 сотрудников при ~50 запросах/день — хватает с запасом.

---

## Production — Google Cloud Run

Переменные задаются в консоли GCP, НЕ в файле.

```bash
gcloud run deploy bcc-assistant-backend \
  --set-env-vars GEMINI_API_KEY=AIza...,ENVIRONMENT=production,CORS_ORIGINS=https://твой-домен.vercel.app
```

Или через UI: Cloud Run → Сервис → Редактировать → Переменные среды

---

## Production — Vercel

Задаются в Vercel Dashboard:
Project → Settings → Environment Variables

| Переменная | Значение |
|---|---|
| NEXT_PUBLIC_API_URL | https://bcc-assistant-backend-xxxx-uc.a.run.app |

---

## .gitignore (добавить)

```gitignore
# Environment files
.env
.env.local
.env.production
.env.development

# ChromaDB данные
backend/chroma_db/

# Python
__pycache__/
*.pyc
venv/

# Node
node_modules/
.next/
```
