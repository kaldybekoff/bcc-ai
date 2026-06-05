# BCC Assistant — Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Framer Motion + react-markdown.
Чат-интерфейс для операторов BCC Bank. Деплой на Vercel.

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть http://localhost:3000.

Нужна переменная окружения `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
(в проде — URL бэкенда на Render, см. `files/ENV.md`).

## Структура

```
app/        page.tsx · layout.tsx · globals.css (тема BCC)
components/  Header · FAQSidebar · ChatWindow · MessageBubble · BCCLogo · HelpModal
lib/         api.ts  (SSE-клиент к бэкенду, передача истории диалога)
```

FAQ-вопросы в левой панели задаются в `components/FAQSidebar.tsx` (массив `CATEGORIES`).

## Документация
Архитектура, дизайн, деплой и пр. — в каталоге `files/` репозитория.
