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

export interface RecentItem {
  q: string;
  ts: number;
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
  {
    name: "Депозиты",
    items: [
      { label: "Виды депозитов?", question: "Какие виды депозитов есть в БЦК?" },
      { label: "Минимальная сумма?", question: "Какая минимальная сумма для открытия депозита?" },
      { label: "Досрочное закрытие?", question: "Что будет с процентами при досрочном закрытии депозита?" },
      { label: "Образовательный депозит?", question: "Что такое образовательный депозит и какая премия от государства?" },
      { label: "Birge+ совместный?", question: "Как работает депозит Birge+ с совместным накоплением?" },
    ],
  },
  {
    name: "Ипотека",
    items: [
      { label: "Первоначальный взнос?", question: "Какой первоначальный взнос по ипотеке?" },
      { label: "Максимальная сумма?", question: "Какая максимальная сумма по ипотеке?" },
      { label: "ДДУ vs обычная?", question: "Чем ипотека ДДУ отличается от обычной?" },
      { label: "Онлайн-ипотека?", question: "Что такое онлайн-ипотека и как её оформить?" },
      { label: "Гарант по ипотеке?", question: "Можно ли привлечь гаранта по ипотеке?" },
    ],
  },
  {
    name: "Кредит под залог",
    items: [
      { label: "Сколько под залог квартиры?", question: "Сколько можно взять под залог квартиры?" },
      { label: "Что можно в залог?", question: "Какую недвижимость можно оставить в залог?" },
      { label: "Максимальный срок?", question: "Какой максимальный срок кредита под залог?" },
      { label: "Комиссии банка?", question: "Есть ли комиссии банка по кредиту под залог?" },
      { label: "Срок рассмотрения?", question: "За какой срок рассматривается заявка на кредит под залог?" },
    ],
  },
];

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "только что";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  return `${d} дн назад`;
}

interface Props {
  onSelect: (question: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
  recent?: RecentItem[];
  onClearRecent?: () => void;
}

export default function FAQSidebar({ onSelect, mobileOpen = false, onClose, recent = [], onClearRecent }: Props) {
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

  const handleClick = (question: string) => {
    setActiveId(question);
    onSelect(question);
    onClose?.();
  };

  const searchBox = (
    <div style={{ padding: "14px 14px 8px" }}>
      <div
        className="flex items-center gap-2"
        style={{
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "9px 12px",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4" stroke="var(--text-muted)" strokeWidth="1.3" />
          <path d="M9 9L12 12" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" />
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
            fontSize: 14,
            color: "var(--text)",
            minWidth: 0,
          }}
        />
      </div>
    </div>
  );

  const sectionTitle = (text: string, action?: React.ReactNode) => (
    <div className="flex items-center justify-between" style={{ padding: "12px 14px 6px" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {text}
      </span>
      {action}
    </div>
  );

  const content = (
    <div className="overflow-y-auto flex-1" style={{ paddingBottom: 12 }}>
      {/* Recent requests */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {sectionTitle(
            "Недавние запросы",
            <button
              onClick={onClearRecent}
              style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              Очистить
            </button>
          )}
          {recent.map((r, i) => (
            <button
              key={`${r.ts}-${i}`}
              onClick={() => handleClick(r.q)}
              className="flex items-center justify-between gap-2"
              style={{
                width: "100%", textAlign: "left",
                padding: "8px 14px",
                background: "transparent", border: "none", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-soft)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <span style={{ fontSize: 13, color: "var(--text-sec)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.q}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(r.ts)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Popular topics */}
      {sectionTitle("Популярные темы")}
      {filtered.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 2 }}>
          <div className="flex items-center gap-1.5" style={{ padding: "8px 14px 3px" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{cat.name}</span>
          </div>

          {cat.items.map((item) => {
            const isActive = activeId === item.question;
            return (
              <button
                key={item.question}
                onClick={() => handleClick(item.question)}
                style={{
                  width: "100%", textAlign: "left", display: "block",
                  padding: "7px 14px 7px 24px",
                  fontSize: 13,
                  color: isActive ? "var(--primary)" : "var(--text-sec)",
                  background: isActive ? "var(--primary-soft)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  cursor: "pointer", lineHeight: 1.4, transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  const el = e.currentTarget;
                  el.style.color = "var(--text)";
                  el.style.background = "var(--surface-soft)";
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  const el = e.currentTarget;
                  el.style.color = "var(--text-sec)";
                  el.style.background = "transparent";
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
          width: 270,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {searchBox}
        {content}
      </aside>

      {/* Mobile bottom sheet */}
      <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: mobileOpen ? "auto" : "none" }}>
        <div
          onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.4)", opacity: mobileOpen ? 1 : 0, transition: "opacity 0.25s" }}
        />
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "var(--surface)",
            borderRadius: "16px 16px 0 0",
            maxHeight: "75dvh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 -4px 24px rgba(17,24,39,0.12)",
            transform: mobileOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 8px", flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Частые вопросы</span>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface-soft)",
                color: "var(--text-sec)", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
          {searchBox}
          {content}
        </div>
      </div>
    </>
  );
}
