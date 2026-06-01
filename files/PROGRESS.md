# Прогресс разработки BCC Assistant

## Текущий статус: 🟢 ПОЛНОСТЬЮ ГОТОВ — следующий шаг: Деплой (Cloud Run + Vercel)

---

## ✅ Завершено

### Планирование и документация
- [x] Спроектирована архитектура системы
- [x] Выбран стек (Next.js + FastAPI + ChromaDB + Gemini)
- [x] Проанализированы все 16 файлов базы знаний
- [x] Создана документация (все MD файлы)
- [x] Выявлен формат файлов: MHTML из Confluence
- [x] Написан парсер MHTML → текст
- [x] Определена стратегия чанкинга для каждого файла

---

## 🔄 Следующий шаг: FRONTEND (backend написан)

### Backend (FastAPI) — ✅ КОД ГОТОВ
- [x] `requirements.txt` — все зависимости
- [x] `config.py` — настройки из .env (пути, модели, RAG-параметры, chunk-размеры)
- [x] `parsers.py` — парсинг MHTML + Word 97 (автоопределение формата)
- [x] `chunker.py` — семантический чанкинг (по заголовкам → абзацам, target ~1800 симв, overlap 200)
- [x] `embeddings.py` — парсинг 16 .doc + чанкинг + text-embedding-004 + ChromaDB индексация
- [x] `rag.py` — RAG pipeline: embed вопрос → поиск (порог 1.5) → промпт → стрим Gemini
- [x] `main.py` — FastAPI endpoints: POST /api/chat (SSE), GET /api/health
- [x] `Dockerfile` — для Cloud Run
- [x] `.env.example` + корневой `.gitignore`
- [x] Все модули проходят `py_compile`; chunker протестирован на образце
- [x] Положить 16 .doc файлов в `backend/knowledge/` (в подпапках автокредит/карткарта/кн)
- [x] Задать `GEMINI_API_KEY` в `backend/.env`
- [x] Тест индексации: 136 чанков в ChromaDB ✅
- [x] Тест API: SSE стриминг работает, ответы корректные ✅

**Важные изменения от плана:**
- Модели изменены: `gemini-embedding-001` (вместо text-embedding-004) + `gemini-2.5-flash` (вместо 1.5-flash) — API ключ поддерживает только новые модели
- ChromaDB rglob: файлы в подпапках (не корне knowledge/)
- SSE streaming: sync генератор запускается через `run_in_executor` + asyncio.Queue для правильной async интеграции
- Ключ API: формат `AQ.xxx` (не `AIza`) — это новый формат Google AI Studio

### Frontend (Next.js)
- [ ] `npx create-next-app@latest frontend`
- [ ] Установка: Tailwind + shadcn/ui + Framer Motion
- [ ] `globals.css` — CSS переменные BCC (тёмно-синий + золотой)
- [ ] `Header.tsx` — логотип BCC + "AI Ассистент" + статус онлайн
- [ ] `FAQSidebar.tsx` — сайдбар с кликабельными вопросами
- [ ] `MessageBubble.tsx` — пузырь сообщения (user/AI) + кнопка копировать
- [ ] `ChatWindow.tsx` — чат с SSE стримингом
- [ ] `faq-data.ts` — данные FAQ из FAQ_CONTENT.md
- [ ] `api.ts` — функции запросов к бэкенду
- [ ] Мобильная версия (FAQ как drawer снизу)

### Деплой
- [ ] Деплой бэкенда на Google Cloud Run
- [ ] Деплой фронтенда на Vercel
- [ ] Проверка CORS
- [ ] E2E тест

---

## 🐛 Известные проблемы и решения

### общие_условия.doc не читается как MHTML
**Проблема:** Старый Word 97 бинарный формат, не MHTML.
**Решение:** Конвертировать через LibreOffice:
```bash
soffice --headless --convert-to docx --outdir /tmp/ общие_условия.doc
```
Затем читать через python-docx.

---

## 📝 Лог сессий

### Сессия 1 — планирование
- Обсуждена архитектура: Next.js + FastAPI + ChromaDB + Gemini
- Решено НЕ делать аутентификацию
- Решено использовать Gemini (бесплатный) вместо Claude API
- Деплой: Vercel (фронт) + Google Cloud Run (бэк)
- Языки: RU + KZ (автоопределение)

### Сессия 2 — анализ базы знаний
- Все 16 файлов прочитаны и проанализированы
- Формат: MHTML из Confluence (15 файлов) + Word 97 (1 файл)
- Написан рабочий MHTML парсер
- Определена детальная стратегия чанкинга
- Созданы все MD файлы с полной документацией

### Сессия 3 — backend (31.05.2026)
- Создана структура `backend/` (модули + knowledge/ + Dockerfile)
- Написан весь backend-код: config, parsers, chunker, embeddings, rag, main
- Парсер с автоопределением MHTML vs Word 97 (по сигнатуре файла)
- Чанкер: режет по markdown-заголовкам → абзацам, накапливает до ~1800 симв с overlap 200
- Эмбеддинги считаем сами (Gemini), Chroma хранит готовые векторы (cosine)
- RAG: фильтр по DISTANCE_THRESHOLD=1.5, при пустоте — стандартный ответ "не найдено"
- SSE-стриминг через StreamingResponse, health отдаёт число чанков
- Проверка: все модули py_compile OK, чанкер протестирован на образце текста
- ⚠️ НЕ хватает 16 .doc файлов и GEMINI_API_KEY — индексацию не запускали

---

## ⚡ Быстрый старт для новой сессии

```
Read CLAUDE.md and PROGRESS.md first.
Continue from where we left off.
Next step: FRONTEND — npx create-next-app@latest frontend --typescript --tailwind --app
Then install: shadcn/ui + framer-motion
Build: Header → FAQSidebar → MessageBubble → ChatWindow → api.ts → faq-data.ts
```
