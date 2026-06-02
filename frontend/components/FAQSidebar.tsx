"use client";

import { useState, useMemo } from "react";

interface FAQItem {
  label: string;
  question: string;
}
interface Category {
  name: string;
  items: FAQItem[];
}

const CATEGORIES: Category[] = [
  {
    name: "Кредитный лимит",
    items: [
      { label: "Какой максимальный лимит?", question: "Какой максимальный кредитный лимит по #картакарта?" },
      { label: "Как увеличить до 7 млн?", question: "Как увеличить кредитный лимит до 7 миллионов тенге?" },
      { label: "VIP условия клиента", question: "Какие условия для получения VIP кредитного лимита?" },
      { label: "Как рассчитать минимальный платёж?", question: "Как рассчитывается минимальный платёж по #картакарта?" },
    ],
  },
  {
    name: "Кэшбэк",
    items: [
      { label: "Максимальный кэшбэк в месяц?", question: "Какой максимальный кэшбэк по #картакарта в месяц?" },
      { label: "Как вывести кэшбэк?", question: "Как вывести кэшбэк на карту?" },
      { label: "Когда сгорает кэшбэк?", question: "Когда сгорает кэшбэк?" },
      { label: "Кэшбэк при рассрочке?", question: "Начисляется ли кэшбэк при рассрочке?" },
    ],
  },
  {
    name: "Рассрочка",
    items: [
      { label: "Как включить рассрочку?", question: "Как включить режим рассрочки в приложении?" },
      { label: "Комиссия у партнёров?", question: "Есть ли комиссия за рассрочку у партнёров?" },
    ],
  },
  {
    name: "Тарифы и лимиты",
    items: [
      { label: "Снятие без комиссии?", question: "Сколько можно снять наличных без комиссии в банкоматах БЦК?" },
      { label: "Лимиты за рубежом?", question: "Какие лимиты при использовании карты за рубежом?" },
      { label: "Запрещённые страны?", question: "В каких странах карта не работает?" },
    ],
  },
  {
    name: "Кредит наличными",
    items: [
      { label: "Максимальная сумма кредита?", question: "Какая максимальная сумма кредита наличными?" },
      { label: "Онлайн — сколько минут?", question: "Сколько времени рассматривается заявка на кредит онлайн?" },
      { label: "Период охлаждения?", question: "Что такое период охлаждения по онлайн-кредиту?" },
      { label: "Досрочное погашение?", question: "Можно ли досрочно погасить кредит без штрафа?" },
    ],
  },
  {
    name: "Рефинансирование",
    items: [
      { label: "Внешнее vs внутреннее?", question: "Чем внешнее рефинансирование отличается от внутреннего?" },
      { label: "Несколько банков сразу?", question: "Можно ли рефинансировать займы из нескольких банков?" },
    ],
  },
  {
    name: "Автокредит",
    items: [
      { label: "Первый взнос через салон?", question: "Какой минимальный первый взнос на авто с пробегом через салон?" },
      { label: "КАСКО обязательно?", question: "Обязательно ли КАСКО при автокредите?" },
      { label: "Авто у физлица?", question: "Можно ли купить авто у физического лица в кредит?" },
    ],
  },
];

interface Props {
  onSelect: (question: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function FAQSidebar({ onSelect, mobileOpen = false, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) => it.label.toLowerCase().includes(q) || it.question.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const handleClick = (item: FAQItem) => {
    setActiveId(item.question);
    onSelect(item.question);
    onClose?.();
  };

  const searchBox = (
    <div style={{ padding: "12px 12px 8px" }}>
      <div
        className="flex items-center gap-1.5"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 10px",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <path d="M8.5 8.5L11 11" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск вопросов..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 16,
            color: "rgba(255,255,255,0.7)",
          }}
        />
      </div>
    </div>
  );

  const categoryList = (
    <div className="overflow-y-auto flex-1" style={{ paddingBottom: 12 }}>
      {filtered.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 4 }}>
          <div
            className="flex items-center gap-1.5"
            style={{ padding: "10px 12px 4px" }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F5A623", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#F5A623", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {cat.name}
            </span>
          </div>

          {cat.items.map((item) => {
            const isActive = activeId === item.question;
            return (
              <button
                key={item.question}
                onClick={() => handleClick(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "block",
                  padding: "8px 12px 8px 22px",
                  fontSize: 13,
                  color: isActive ? "#fff" : "var(--text-sec)",
                  background: isActive ? "rgba(245,166,35,0.07)" : "transparent",
                  borderLeft: isActive ? "2px solid #F5A623" : "2px solid transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  borderRadius: "0 6px 6px 0",
                  cursor: "pointer",
                  lineHeight: 1.4,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  const el = e.currentTarget;
                  el.style.color = "#d4dce8";
                  el.style.background = "rgba(255,255,255,0.03)";
                  el.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  const el = e.currentTarget;
                  el.style.color = "var(--text-sec)";
                  el.style.background = "transparent";
                  el.style.transform = "translateX(0)";
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 overflow-hidden"
        style={{
          width: 220,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {searchBox}
        {categoryList}
      </aside>

      {/* Mobile bottom sheet */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          pointerEvents: mobileOpen ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            opacity: mobileOpen ? 1 : 0,
            transition: "opacity 0.25s",
          }}
        />

        {/* Sheet */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--bg-surface)",
            borderRadius: "16px 16px 0 0",
            maxHeight: "75dvh",
            display: "flex",
            flexDirection: "column",
            borderTop: "1px solid rgba(245,166,35,0.15)",
            transform: mobileOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Drag handle */}
          <div style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 16px 8px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Частые вопросы</span>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {searchBox}
          {categoryList}
        </div>
      </div>
    </>
  );
}
