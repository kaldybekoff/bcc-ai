# Дизайн-система BCC Assistant

## Референс
Стиль как у https://infogenius.fashionunited.com/
Чистый тёмный AI-чат интерфейс с минимализмом.

---

## Цветовая палитра

Фактические токены — в `frontend/app/globals.css`:

```css
:root {
  --bg-primary:    #050D1A;            /* основной фон */
  --bg-surface:    #0A1628;            /* шапка, сайдбар */
  --bg-card:       #0F2040;            /* карточки, пузырь AI */
  --bg-user:       #1a3654;            /* пузырь пользователя */
  --accent:        #F5A623;            /* золотой BCC */
  --accent-dim:    rgba(245,166,35,0.10);
  --accent-border: rgba(245,166,35,0.20);
  --accent-glow:   rgba(245,166,35,0.35);
  --text:          #FFFFFF;            /* основной текст */
  --text-sec:      #8BA3C7;            /* вторичный, плейсхолдеры */
  --text-muted:    rgba(255,255,255,0.25);
  --border:        rgba(255,255,255,0.07);
  --green:         #22C55E;            /* статус «Активен» */
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
Высота: 56px
Фон: --bg-surface с border-bottom: 1px solid --border
Содержимое:
  - Слева: логотип BCC (BCCLogo, horizontal)
  - Центр (только desktop): вкладки «Чат» / «Справка» (активная — золотая)
  - Справа: точка (--green) + текст "Активен"; на мобильном — кнопка «?» (Справка)

«Справка» открывает HelpModal (инструкция для оператора).
Вкладка «История» удалена (не было хранения).
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

## Начальный экран чата

Приветственное сообщение НЕ показывается — чат стартует пустым.
Подсказки для оператора (что знает ассистент, как спрашивать) вынесены в
панель **«Справка»** (`HelpModal.tsx`), открывается из шапки.
