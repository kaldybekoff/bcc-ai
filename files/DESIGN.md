# Дизайн-система BCC Assistant

## Референс
Стиль как у https://infogenius.fashionunited.com/
Чистый тёмный AI-чат интерфейс с минимализмом.

---

## Цветовая палитра

```css
:root {
  /* Фоны */
  --bg-primary:    #0A1628;   /* основной тёмно-синий фон */
  --bg-secondary:  #0F2040;   /* карточки, сайдбар */
  --bg-tertiary:   #162847;   /* поле ввода, hover */
  --bg-message-ai: #0F2040;   /* пузырь AI */
  --bg-message-user: #1E3A5F; /* пузырь пользователя */

  /* Акцент */
  --accent:        #F5A623;   /* золотой BCC — кнопки, активные элементы */
  --accent-hover:  #E09415;   /* золотой при hover */
  --accent-light:  rgba(245, 166, 35, 0.15); /* золотой полупрозрачный */

  /* Текст */
  --text-primary:   #FFFFFF;  /* основной текст */
  --text-secondary: #8BA3C7;  /* вторичный, плейсхолдеры */
  --text-muted:     #4A6080;  /* метаданные, источники */

  /* Границы */
  --border:         #1E3A5F;  /* обычные границы */
  --border-accent:  #F5A623;  /* активные границы */

  /* Статусы */
  --status-online:  #22C55E;  /* зелёный — онлайн */
  --status-loading: #F5A623;  /* золотой — загрузка */
}
```

---

## Типографика

```css
/* Подключить в layout.tsx */
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin', 'cyrillic'] })

/* Размеры */
--font-logo:    20px / bold    /* "BCC AI Ассистент" в хедере */
--font-heading: 16px / semibold /* заголовки секций */
--font-body:    15px / regular  /* сообщения чата */
--font-small:   13px / regular  /* FAQ вопросы, метаданные */
--font-tiny:    11px / regular  /* источник ответа, время */
```

---

## Layout (Desktop 1280px+)

```
┌────────────────────────────────────────────────────────┐
│  HEADER (64px)                                         │
│  [🏦 BCC] [AI Ассистент] ────────── [● Онлайн]        │
├─────────────────┬──────────────────────────────────────┤
│                 │                                      │
│  FAQ SIDEBAR    │         CHAT WINDOW                  │
│  (280px)        │         (flex-1)                     │
│                 │                                      │
│  Частые вопросы │  ┌────────────────────────────────┐  │
│                 │  │ Сообщение AI                   │  │
│  [Категория 1]  │  │ (с иконкой BCC слева)          │  │
│  ── вопрос 1    │  └────────────────────────────────┘  │
│  ── вопрос 2    │                                      │
│  ── вопрос 3    │       ┌──────────────────────────┐   │
│                 │       │ Сообщение пользователя   │   │
│  [Категория 2]  │       └──────────────────────────┘   │
│  ── вопрос 4    │                                      │
│  ── вопрос 5    │                                      │
│                 ├────────────────────────────────────  │
│                 │  [         Введите вопрос...  ] [→]  │
│                 │  (sticky input bar, 72px)            │
└─────────────────┴──────────────────────────────────────┘
```

## Layout (Mobile < 768px)

```
┌──────────────────────────┐
│  HEADER (56px)           │
│  [BCC]  [AI Ассистент]   │
├──────────────────────────┤
│                          │
│  CHAT WINDOW (flex-1)    │
│  (на весь экран)         │
│                          │
│  Сообщения...            │
│                          │
├──────────────────────────┤
│ [FAQ ↑]                  │  ← кнопка открыть drawer
├──────────────────────────┤
│ [Введите вопрос...] [→]  │
└──────────────────────────┘

FAQ Sidebar → Bottom Drawer (выезжает снизу при нажатии)
```

---

## Компоненты

### Header.tsx
```
Высота: 64px (desktop) / 56px (mobile)
Фон: --bg-secondary с border-bottom: 1px solid --border
Содержимое:
  - Слева: логотип BCC (SVG, 32px) + текст "AI Ассистент" (20px bold)
  - Справа: точка (8px, --status-online) + текст "Онлайн" (13px, --text-secondary)
```

### FAQSidebar.tsx
```
Ширина: 280px (desktop) / скрыт (mobile)
Фон: --bg-secondary
Border-right: 1px solid --border
Padding: 20px 16px

Структура:
  - Заголовок "Частые вопросы" (16px semibold, --text-secondary)
  - Категории (секции с заголовком)
  - Вопросы — кнопки:
      background: transparent
      hover: --bg-tertiary + border-left: 2px solid --accent
      font: 13px, --text-secondary
      padding: 8px 12px
      border-radius: 6px
      cursor: pointer
  - При клике: вопрос вставляется в input + фокус на input
```

### MessageBubble.tsx

**AI сообщение (слева):**
```
Иконка BCC (24px круг с логотипом, фон --accent) + текст
Фон текста: --bg-message-ai
Border-radius: 4px 16px 16px 16px
Max-width: 80%
Анимация появления: fadeIn + slideUp (Framer Motion)
Под сообщением (при hover): кнопка "Копировать" + источник файла (11px, --text-muted)
```

**Пользователь сообщение (справа):**
```
Фон: --bg-message-user
Border-radius: 16px 4px 16px 16px
Max-width: 70%
Выравнивание: right
```

**Индикатор загрузки (typing):**
```
3 точки с анимацией pulse (delay 0ms, 150ms, 300ms)
Цвет: --accent
```

### ChatInput (нижняя панель)
```
Позиция: sticky bottom-0
Фон: --bg-primary + border-top: 1px solid --border
Padding: 16px
Высота: 72px

Input:
  background: --bg-tertiary
  border: 1px solid --border
  border-radius: 12px
  color: --text-primary
  placeholder: "Задайте вопрос сотрудника..."
  font: 15px
  padding: 12px 16px
  focus: border-color --accent + outline none

Кнопка отправки:
  background: --accent
  hover: --accent-hover
  border-radius: 10px
  width: 44px, height: 44px
  icon: стрелка вправо (white, 20px)
  disabled: opacity 0.5
  Enter = отправка
```

---

## Анимации (Framer Motion)

```typescript
// Появление сообщения
const messageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
}

// FAQ карточка hover
const faqVariants = {
  hover: { x: 4, transition: { duration: 0.15 } }
}

// Страница загрузки
const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
}
```

---

## Tailwind config (tailwind.config.ts)

```typescript
theme: {
  extend: {
    colors: {
      'bcc-dark':    '#0A1628',
      'bcc-card':    '#0F2040',
      'bcc-input':   '#162847',
      'bcc-border':  '#1E3A5F',
      'bcc-gold':    '#F5A623',
      'bcc-gold-hover': '#E09415',
      'bcc-text':    '#8BA3C7',
      'bcc-user':    '#1E3A5F',
    }
  }
}
```

---

## Скрипт начального сообщения

При открытии сайта в чате показывать:
```
👋 Здравствуйте!

Я AI ассистент BCC Bank. Я знаю всё о продуктах банка:
• #картакарта — кредитный лимит, кэшбэк, рассрочка, тарифы
• Кредиты наличными — в отделении и онлайн
• Автокредиты и рефинансирование

Задайте любой вопрос — отвечу быстро и точно.
Работаю на русском и казахском языках.
```
