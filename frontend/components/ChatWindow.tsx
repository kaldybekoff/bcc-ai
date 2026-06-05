"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble, { type Message } from "./MessageBubble";

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 9h11M10.5 5l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSend: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onOpenFAQ?: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ gap: 14, padding: 24 }}>
      <div
        style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, #00C07A 0%, #00A86B 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,168,107,0.28)",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M12 4 L20 18 L12 18 Z" fill="#FFFFFF" />
          <path d="M12 4 L4 18 L12 18 Z" fill="rgba(255,255,255,0.62)" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Здравствуйте! Я AI-ассистент БЦК</div>
        <div style={{ fontSize: 14, color: "var(--text-sec)", marginTop: 4, maxWidth: 420 }}>
          Помогу с вопросами по продуктам, тарифам и услугам банка. Задайте вопрос или выберите тему слева.
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, input, setInput, loading, onSend, inputRef, onOpenFAQ }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) onSend(input);
  };

  const canSend = !!input.trim() && !loading;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col chat-scroll" style={{ padding: "20px 16px", gap: 18 }}>
        <style>{`
          @media (min-width: 768px) {
            .chat-scroll { padding: 28px 32px !important; gap: 22px !important; }
          }
        `}</style>

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble msg={msg} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 16px", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))" }}>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            width: "100%",
            background: "var(--surface)",
            border: `1px solid ${focused ? "var(--primary-border)" : "var(--border)"}`,
            borderRadius: 16,
            padding: "8px 8px 8px 16px",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: focused ? "0 0 0 3px var(--primary-dim)" : "0 1px 4px rgba(17,24,39,0.04)",
          }}
        >
          {/* FAQ button — mobile only */}
          {onOpenFAQ && (
            <button
              type="button"
              onClick={onOpenFAQ}
              className="md:hidden shrink-0 flex items-center justify-center"
              style={{
                width: 40, height: 40, borderRadius: 10,
                border: "1px solid var(--primary-border)",
                background: "var(--primary-dim)",
                color: "var(--primary)",
                cursor: "pointer", fontSize: 15,
              }}
              title="Частые вопросы"
            >
              ☰
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Задайте вопрос..."
            disabled={loading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--text)",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Отправить"
            style={{
              width: 42, height: 42,
              background: canSend ? "var(--primary)" : "var(--surface-soft)",
              borderRadius: 12,
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--primary-hover)"; }}
            onMouseLeave={(e) => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--primary)"; }}
          >
            <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
}
