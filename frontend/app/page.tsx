"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import BCCLogo from "@/components/BCCLogo";

/* ── inline icons ─────────────────────────────────────────────── */
function Icon({ path, size = 22 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
const IconShield = <Icon path={<><path d="M12 3l8 3v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>} />;
const IconSearch = <Icon path={<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>} />;
const IconGlobe = <Icon path={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>} />;
const IconDoc = <Icon path={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>} />;
const IconArrow = <Icon path={<path d="M5 12h14M13 6l6 6-6 6" />} size={18} />;
const IconBolt = <Icon path={<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />} />;

/* ── reusable animated section ────────────────────────────────── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: IconShield, title: "Только проверенные данные", text: "Отвечает строго из базы знаний банка — без выдумок и приблизительных цифр." },
  { icon: IconSearch, title: "Семантический поиск", text: "Понимает смысл вопроса, а не только ключевые слова. Находит нужный раздел." },
  { icon: IconGlobe, title: "Русский и казахский", text: "Отвечает на том языке, на котором задан вопрос." },
  { icon: IconDoc, title: "Источники к ответу", text: "Показывает, из каких документов базы знаний взята информация." },
];

const STEPS = [
  { n: "1", title: "Задайте вопрос", text: "Простым языком, как спрашивает клиент." },
  { n: "2", title: "Ассистент ищет в базе", text: "Находит самые релевантные фрагменты по всем продуктам." },
  { n: "3", title: "Получите ответ", text: "Точный, структурированный, с цифрами и источниками." },
];

const PRODUCTS = [
  "Кредитный лимит", "Кэшбэк", "Рассрочка", "Тарифы и лимиты",
  "Депозиты", "Ипотека", "Кредит под залог", "Автокредиты", "Рефинансирование",
];

const STATS = [
  { v: "21", l: "раздел базы знаний" },
  { v: "RU / KZ", l: "два языка" },
  { v: "~секунды", l: "до ответа" },
  { v: "100%", l: "из базы банка" },
];

function StartButton({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/chat"
      className="inline-flex items-center justify-center gap-2 font-semibold transition-transform"
      style={{
        background: "linear-gradient(135deg, #00C07A 0%, #00A86B 100%)",
        color: "#fff",
        borderRadius: 14,
        padding: large ? "15px 30px" : "11px 22px",
        fontSize: large ? 17 : 15,
        boxShadow: "0 8px 24px rgba(0,168,107,0.32)",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
    >
      Начать {IconArrow}
    </Link>
  );
}

export default function Landing() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", overflowX: "clip" }}>
      {/* Navbar — sticky, stays on scroll */}
      <nav
        className="sticky top-0 z-30 flex items-center justify-between"
        style={{ height: 64, padding: "0 16px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" aria-label="На главную">
          <BCCLogo variant="horizontal" />
        </Link>
        <StartButton />
      </nav>

      {/* Hero */}
      <section className="relative" style={{ padding: "clamp(40px, 7vw, 72px) 20px 56px" }}>
        {/* decorative blobs */}
        <div aria-hidden style={{ position: "absolute", top: -80, right: -60, width: 420, height: 420, background: "radial-gradient(circle, rgba(0,168,107,0.18), transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />
        <div aria-hidden style={{ position: "absolute", bottom: -120, left: -80, width: 380, height: 380, background: "radial-gradient(circle, rgba(0,192,122,0.12), transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />

        <div className="relative mx-auto flex flex-col items-center text-center" style={{ width: "min(100%, 820px)", margin: "0 auto" }}>
          {/* copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2"
            style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary-border)", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600, marginBottom: 20 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />
            AI-ассистент для сотрудников БЦК
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em" }}
          >
            Точные ответы по продуктам банка — <span style={{ color: "var(--primary)" }}>за секунды</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
            style={{ fontSize: 18, color: "var(--text-sec)", marginTop: 20, lineHeight: 1.6, maxWidth: 600 }}
          >
            Задайте вопрос на русском или казахском — ассистент найдёт ответ в базе знаний БЦК:
            кредиты, депозиты, ипотека, кэшбэк, тарифы и условия.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
            className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 32 }}
          >
            <StartButton large />
            <a href="#features" className="inline-flex items-center font-medium" style={{ color: "var(--text-sec)", borderRadius: 14, padding: "15px 24px", fontSize: 16, border: "1px solid var(--border)", background: "var(--surface)" }}>
              Узнать больше
            </a>
          </motion.div>

          {/* hero chat preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            style={{ width: "100%", maxWidth: 560, marginTop: 44 }}
          >
            <div className="text-left" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: 18, boxShadow: "0 20px 50px rgba(17,24,39,0.10)" }}>
              {/* user bubble */}
              <div className="flex justify-end" style={{ marginBottom: 14 }}>
                <div style={{ background: "var(--user-bubble)", border: "1px solid var(--primary-border)", color: "#0b5a3f", borderRadius: "16px 6px 16px 16px", padding: "10px 14px", fontSize: 14, maxWidth: "80%" }}>
                  Какой максимальный кредитный лимит по #картакарта?
                </div>
              </div>
              {/* AI answer */}
              <div className="flex gap-2.5" style={{ alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#00C07A,#00A86B)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24"><path d="M12 4 L20 18 L12 18 Z" fill="#fff" /><path d="M12 4 L4 18 L12 18 Z" fill="rgba(255,255,255,0.62)" /></svg>
                </div>
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px 16px 16px 16px", padding: "12px 14px", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                  Максимальный кредитный лимит по <b style={{ color: "var(--text)" }}>#картакарта</b>:
                  <div style={{ marginTop: 6 }}>• до <b style={{ color: "var(--text)" }}>3 000 000 ₸</b> — для стандартных клиентов</div>
                  <div>• до <b style={{ color: "var(--text)" }}>7 000 000 ₸</b> — для VIP-клиентов</div>
                  <div className="flex gap-1.5" style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--primary)", background: "var(--primary-dim)", border: "1px solid var(--primary-border)", borderRadius: 6, padding: "2px 8px" }}>кредитный лимит.doc</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* stats strip */}
        <div className="mx-auto grid grid-cols-2 gap-4 md:grid-cols-4" style={{ width: "min(100%, 1120px)", margin: "56px auto 0" }}>
          {STATS.map((s) => (
            <Reveal key={s.l}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{s.v}</div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>{s.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "56px 20px" }}>
        <div className="mx-auto" style={{ width: "min(100%, 1120px)", margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 800, textAlign: "center", letterSpacing: "-0.02em" }}>Почему это удобно</h2>
            <p style={{ fontSize: 16, color: "var(--text-sec)", textAlign: "center", marginTop: 10 }}>Быстро, точно и без риска ошибиться перед клиентом.</p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 36 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div
                  className="h-full transition-transform"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 22, boxShadow: "0 2px 10px rgba(17,24,39,0.04)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    {f.icon}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: "var(--text-sec)", lineHeight: 1.55 }}>{f.text}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "56px 20px", background: "var(--surface)" }}>
        <div className="mx-auto" style={{ width: "min(100%, 1120px)", margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 800, textAlign: "center", letterSpacing: "-0.02em" }}>Как это работает</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3" style={{ marginTop: 36 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div style={{ padding: 24, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--border)", height: "100%" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#00C07A,#00A86B)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, marginBottom: 14 }}>{s.n}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: "var(--text-sec)", lineHeight: 1.55 }}>{s.text}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section style={{ padding: "56px 20px" }}>
        <div className="mx-auto text-center" style={{ width: "min(100%, 900px)", margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div className="inline-flex items-center gap-2" style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              {IconBolt} Знает все продукты банка
            </div>
            <div className="flex flex-wrap justify-center gap-2.5" style={{ marginTop: 12, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
              {PRODUCTS.map((p) => (
                <span key={p} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "9px 16px", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{p}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "20px 20px 72px" }}>
        <Reveal>
          <div className="mx-auto text-center" style={{ width: "min(100%, 1120px)", margin: "0 auto", textAlign: "center", borderRadius: 28, padding: "56px 24px", background: "linear-gradient(135deg, #00A86B 0%, #009159 100%)", boxShadow: "0 20px 50px rgba(0,168,107,0.28)" }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Готовы начать?</h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.9)", marginTop: 12, marginBottom: 28 }}>Откройте чат и задайте первый вопрос — ответ придёт за секунды.</p>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 font-semibold"
              style={{ background: "#fff", color: "var(--primary)", borderRadius: 14, padding: "15px 32px", fontSize: 17, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
            >
              Начать {IconArrow}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", background: "var(--surface)" }}>
        <div className="mx-auto flex flex-col items-center gap-2 text-center md:flex-row md:justify-between" style={{ width: "min(100%, 1120px)", margin: "0 auto" }}>
          <Link href="/" aria-label="На главную">
            <BCCLogo variant="horizontal" />
          </Link>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>© BCC Bank — внутренний инструмент для сотрудников</span>
        </div>
      </footer>
    </main>
  );
}
