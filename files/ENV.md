# Переменные окружения BCC Assistant

## ⚠️ НИКОГДА не коммитить реальные ключи!
`.env`, `.env.local` уже в `.gitignore`.

---

## Backend — `backend/.env`

```env
# OpenAI API Key — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Модель генерации ответов (gpt-4o-mini — дёшево; gpt-4o — глубже, дороже ~в 16 раз)
OPENAI_MODEL=gpt-4o-mini

# Модель эмбеддингов для семантического поиска
EMBED_MODEL=text-embedding-3-small

# CORS — URL фронтенда через запятую
CORS_ORIGINS=https://bcc-ai.vercel.app,http://localhost:3000

# Опционально:
# MAX_CONTEXT_CHARS=30000      # бюджет символов контекста на запрос
# MAX_OUTPUT_TOKENS=3000       # максимум токенов в ответе
# MAX_HISTORY_MESSAGES=8       # сколько предыдущих сообщений диалога учитывать
```

---

## Frontend — `frontend/.env.local`

```env
# Development:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production (на Vercel задаётся в Dashboard):
# NEXT_PUBLIC_API_URL=https://bcc-ai.onrender.com
```

---

## Как получить OPENAI_API_KEY
1. https://platform.openai.com/api-keys
2. Sign in → **Create new secret key**
3. Скопировать (`sk-...`) и вставить в `backend/.env`
4. Убедиться, что на аккаунте есть баланс (Billing) — без него запросы вернут 401/429

**Примерная стоимость:** `gpt-4o-mini` ~$0.002/вопрос; `text-embedding-3-small` ~$0.002 за переиндексацию всей базы. Для 20-30 операторов — копейки.

---

## Production — Render (backend)

Render → сервис → **Environment** → задать переменные:

| Переменная | Значение |
|---|---|
| `OPENAI_API_KEY` | `sk-...` |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `EMBED_MODEL` | `text-embedding-3-small` |
| `CORS_ORIGINS` | `https://bcc-ai.vercel.app` |

Сохранение переменной триггерит передеплой.

---

## Production — Vercel (frontend)

Vercel → Project → Settings → Environment Variables:

| Переменная | Значение |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://bcc-ai.onrender.com` |
