# Деплой BCC Assistant

## Обзор

| Часть | Платформа | URL |
|---|---|---|
| Frontend | Vercel | https://bcc-assistant.vercel.app |
| Backend | Google Cloud Run | https://bcc-assistant-backend-xxxx-uc.a.run.app |

---

## Backend → Google Cloud Run

### Шаг 1: Установить Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Авторизация
gcloud auth login
gcloud config set project ВАШ_PROJECT_ID
```

Создать проект: https://console.cloud.google.com/projectcreate

### Шаг 2: Включить необходимые API

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Шаг 3: Dockerfile (уже в проекте)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей (для LibreOffice — общие_условия.doc)
RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Индексация базы знаний при сборке образа
RUN python embeddings.py

# Запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Шаг 4: Деплой

```bash
cd backend

# Сборка и пуш образа
gcloud builds submit --tag gcr.io/PROJECT_ID/bcc-assistant-backend

# Деплой на Cloud Run
gcloud run deploy bcc-assistant-backend \
  --image gcr.io/PROJECT_ID/bcc-assistant-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars GEMINI_API_KEY=AIza...,ENVIRONMENT=production,CORS_ORIGINS=https://bcc-assistant.vercel.app

# Получить URL бэкенда
gcloud run services describe bcc-assistant-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

### Шаг 5: Обновление бэкенда

```bash
# После изменений в коде или базе знаний
cd backend
gcloud builds submit --tag gcr.io/PROJECT_ID/bcc-assistant-backend
gcloud run deploy bcc-assistant-backend \
  --image gcr.io/PROJECT_ID/bcc-assistant-backend \
  --region us-central1
```

---

## Frontend → Vercel

### Шаг 1: Установить Vercel CLI

```bash
npm i -g vercel
```

### Шаг 2: Первый деплой

```bash
cd frontend

# Логин в Vercel
vercel login

# Деплой
vercel --prod
```

### Шаг 3: Добавить переменные окружения

В Vercel Dashboard:
Project → Settings → Environment Variables

| Название | Значение |
|---|---|
| NEXT_PUBLIC_API_URL | https://bcc-assistant-backend-xxxx-uc.a.run.app |

### Шаг 4: Обновление фронтенда

```bash
cd frontend
vercel --prod
```

---

## requirements.txt (backend)

```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
google-generativeai==0.7.2
chromadb==0.5.0
html2text==2024.2.26
python-docx==1.1.2
python-multipart==0.0.9
python-dotenv==1.0.1
pydantic==2.7.0
```

---

## Чеклист перед деплоем

### Backend
- [ ] Все 16 .doc файлов в `backend/knowledge/`
- [ ] `python embeddings.py` отработал без ошибок
- [ ] `curl http://localhost:8000/api/health` возвращает `{"status": "ok"}`
- [ ] `curl -X POST http://localhost:8000/api/chat -d '{"question":"тест"}'` стримит ответ
- [ ] GEMINI_API_KEY задан корректно
- [ ] CORS_ORIGINS содержит URL фронтенда

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` указывает на Cloud Run URL
- [ ] Стриминг работает (текст появляется постепенно)
- [ ] FAQ отображается и кликабелен
- [ ] Мобильная версия проверена
- [ ] Начальное приветственное сообщение показывается

---

## Мониторинг

```bash
# Логи Cloud Run в реальном времени
gcloud run services logs tail bcc-assistant-backend --region us-central1

# Статус сервиса
gcloud run services describe bcc-assistant-backend --region us-central1
```

---

## Стоимость (ожидаемая)

| Сервис | Стоимость |
|---|---|
| Gemini API (1 500 запросов/день) | $0 (free tier) |
| Google Cloud Run | $0 (free tier: 2M req/мес) |
| Vercel | $0 (free tier) |
| **Итого** | **$0/мес** |

При превышении free tier Cloud Run: ~$0.40 за 1М запросов.
