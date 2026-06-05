# Деплой BCC Assistant

## Обзор

| Часть | Платформа | URL |
|---|---|---|
| Frontend | Vercel | https://bcc-ai.vercel.app |
| Backend | Render (Docker) | https://bcc-ai.onrender.com |

Оба деплоятся автоматически из ветки `main` на GitHub (auto-deploy on push).

---

## Backend → Render

Бэкенд собирается из `backend/Dockerfile`.

### Настройка сервиса (один раз)
1. Render → **New → Web Service**, подключить GitHub-репозиторий.
2. **Root Directory:** `backend`
3. **Runtime:** Docker (Render возьмёт `backend/Dockerfile`).
4. **Environment** — задать переменные (см. ENV.md):
   - `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `EMBED_MODEL=text-embedding-3-small`, `CORS_ORIGINS=https://bcc-ai.vercel.app`
5. **Auto-Deploy:** Yes (деплой на каждый push в `main`).

### Dockerfile (в репозитории)
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

### Обновление
`git push origin main` → Render пересобирает образ автоматически.
Если auto-deploy выключен: Render → **Manual Deploy → Deploy latest commit**.

⚠️ При старте контейнера строятся эмбеддинги базы (~354 чанка, несколько секунд).
Диск-кэш `.embcache/` не переживает рестарт инстанса → пересчёт при холодном старте (копейки).

---

## Frontend → Vercel

### Настройка (один раз)
1. Vercel → **Add New → Project**, импортировать репозиторий.
2. **Root Directory:** `frontend`
3. Framework: Next.js (определяется автоматически).
4. **Environment Variables:** `NEXT_PUBLIC_API_URL=https://bcc-ai.onrender.com`

### Обновление
`git push origin main` → Vercel пересобирает фронт автоматически.

---

## requirements.txt (backend)
```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
openai
beautifulsoup4==4.12.3
numpy
python-docx==1.1.2
python-dotenv==1.0.1
pydantic==2.7.0
python-multipart==0.0.9
```

---

## Чеклист перед деплоем

### Backend
- [ ] Все `.doc` файлы в `backend/knowledge/` (в подпапках) закоммичены
- [ ] `GET /api/health` возвращает `files_loaded` = ожидаемое число и нужную `model`
- [ ] `POST /api/chat` стримит корректный ответ с источниками
- [ ] На Render заданы `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGINS`

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` указывает на Render-URL
- [ ] Стриминг работает, FAQ кликается, мобильная версия и Справка открываются

---

## Проверка прода

```bash
# Health
curl https://bcc-ai.onrender.com/api/health

# Чат (UTF-8 JSON)
curl -X POST https://bcc-ai.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  --data-binary '{"question":"Какой максимальный кредитный лимит по картакарта?"}'
```

---

## Стоимость
| Сервис | Стоимость |
|---|---|
| OpenAI (gpt-4o-mini + эмбеддинги) | ~$0.002/вопрос |
| Render | Free tier |
| Vercel | Free tier |
