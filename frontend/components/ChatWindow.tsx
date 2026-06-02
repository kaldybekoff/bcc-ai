"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble, { type Message } from "./MessageBubble";

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L9.2 6.8L14 8L9.2 9.2L8 14L6.8 9.2L2 8L6.8 6.8L8 2Z" fill="rgba(245,166,35,0.5)" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 9h11M10.5 5l4 4-4 4" stroke="#050D1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Desktop: more padding */}
        <style>{`
          @media (min-width: 768px) {
            .chat-messages { padding: 24px 28px !important; gap: 20px !important; }
          }
        `}</style>
        <div
          className="chat-messages flex-1 flex flex-col"
          style={{ display: "contents" }}
        />
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
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "8px 12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
          style={{
            background: "var(--bg-card)",
            border: `1px solid ${focused ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.09)"}`,
            borderRadius: 14,
            padding: "8px 8px 8px 14px",
            transition: "border-color 0.2s",
            boxShadow: focused ? "0 0 0 1px rgba(245,166,35,0.08)" : "none",
          }}
        >
          {/* FAQ button — mobile only */}
          {onOpenFAQ && (
            <button
              type="button"
              onClick={onOpenFAQ}
              className="md:hidden shrink-0 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: "1px solid rgba(245,166,35,0.25)",
                background: "rgba(245,166,35,0.08)",
                cursor: "pointer",
                fontSize: 15,
              }}
              title="Частые вопросы"
            >
              ☰
            </button>
          )}

          <SparklesIcon />
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
              fontSize: 16,
              color: "#fff",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              width: 40,
              height: 40,
              background: canSend ? "#F5A623" : "rgba(255,255,255,0.08)",
              borderRadius: 10,
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.15s",
              opacity: canSend ? 1 : 0.4,
            }}
            onMouseEnter={(e) => { if (canSend) { (e.currentTarget as HTMLElement).style.background = "#E09415"; } }}
            onMouseLeave={(e) => { if (canSend) { (e.currentTarget as HTMLElement).style.background = "#F5A623"; } }}
          >
            <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
}
