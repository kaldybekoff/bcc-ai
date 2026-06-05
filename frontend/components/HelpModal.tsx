"use client";

import { useEffect } from "react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const PRODUCTS = [
  "#картакарта — кредитный лимит, кэшбэк, рассрочка, тарифы, лимиты",
  "Кредиты наличными — в отделении и онлайн",
  "Рефинансирование займов",
  "Автокредиты — через автосалоны и от физлиц",
  "Депозиты — Чемпион, Рахмет, AQYL, Birge+ и др.",
  "Ипотека — #Ипотека, ДДУ, онлайн-ипотека",
  "Кредит под залог недвижимости",
];

const TIPS = [
  "Формулируйте вопрос конкретно — можно с цифрами и условиями клиента.",
  "Нужен расчёт (платёж, кэшбэк, первоначальный взнос)? Попросите «покажи формулу и пример».",
  "Можно задавать уточняющие вопросы — ассистент помнит контекст диалога.",
  "Клик по вопросу в левой панели подставит его в поле ввода.",
  "Работает на русском и казахском — отвечает на языке вопроса.",
];

export default function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Справка</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-sec)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 14, color: "var(--text-sec)", marginBottom: 20, lineHeight: 1.5 }}>
          AI-ассистент для сотрудников БЦК. Помогает быстро находить точные ответы по
          продуктам банка на вопросы клиентов. Отвечает <b style={{ color: "var(--text)" }}>только
          на основе базы знаний БЦК</b> — если данных нет, честно сообщит об этом.
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>
          Что знает ассистент
        </h3>
        <ul style={{ marginBottom: 20, paddingLeft: 0, listStyle: "none" }}>
          {PRODUCTS.map((p) => (
            <li key={p} style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 6, paddingLeft: 16, position: "relative", lineHeight: 1.4 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>•</span>
              {p}
            </li>
          ))}
        </ul>

        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>
          Как пользоваться
        </h3>
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {TIPS.map((t) => (
            <li key={t} style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 6, paddingLeft: 16, position: "relative", lineHeight: 1.4 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
