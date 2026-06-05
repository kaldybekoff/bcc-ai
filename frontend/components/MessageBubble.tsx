"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: string[];
  streaming?: boolean;
}

function Avatar() {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 30,
        height: 30,
        background: "linear-gradient(135deg, #00C07A 0%, #00A86B 100%)",
        borderRadius: 9,
        alignSelf: "flex-start",
        boxShadow: "0 2px 6px rgba(0,168,107,0.3)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M12 4 L20 18 L12 18 Z" fill="#FFFFFF" />
        <path d="M12 4 L4 18 L12 18 Z" fill="rgba(255,255,255,0.62)" />
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1" style={{ padding: "4px 0" }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: "var(--primary)",
            display: "inline-block",
            animation: "typingPulse 1.2s ease-in-out infinite",
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SourceTag({ name }: { name: string }) {
  return (
    <div
      className="flex items-center gap-1"
      style={{
        fontSize: 11,
        color: "var(--primary)",
        background: "var(--primary-dim)",
        border: "1px solid var(--primary-border)",
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <rect x="1.5" y="0.5" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1" />
        <line x1="3.5" y1="3.5" x2="8.5" y2="3.5" stroke="currentColor" strokeWidth="0.8" />
        <line x1="3.5" y1="5.5" x2="8.5" y2="5.5" stroke="currentColor" strokeWidth="0.8" />
        <line x1="3.5" y1="7.5" x2="6.5" y2="7.5" stroke="currentColor" strokeWidth="0.8" />
      </svg>
      {name}
    </div>
  );
}

export default function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isAI = msg.role === "ai";

  const copy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isAI) {
    return (
      <div className="msg-enter flex gap-2.5" style={{ alignItems: "flex-start" }}>
        <Avatar />
        <div style={{ maxWidth: "min(80%, calc(100vw - 80px))", width: "100%" }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px 16px 16px 16px",
              padding: "14px 16px",
              boxShadow: "0 2px 10px rgba(17,24,39,0.05)",
            }}
          >
            {msg.streaming && !msg.text ? (
              <TypingDots />
            ) : (
              <div className="prose-bcc">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            )}

            {!msg.streaming && msg.sources && msg.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                {msg.sources.map((s) => <SourceTag key={s} name={s} />)}
              </div>
            )}

            {!msg.streaming && msg.text && (
              <div className="flex gap-2" style={{ marginTop: 10 }}>
                <button
                  onClick={copy}
                  style={{ fontSize: 12, color: copied ? "var(--primary)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", padding: 0 }}
                  onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-sec)"; }}
                  onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                >
                  {copied ? "✓ Скопировано" : "Копировать"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-enter flex justify-end">
      <div
        style={{
          maxWidth: "min(72%, calc(100vw - 48px))",
          background: "var(--user-bubble)",
          border: "1px solid var(--primary-border)",
          borderRadius: "16px 6px 16px 16px",
          padding: "11px 15px",
          fontSize: 14,
          color: "#0b5a3f",
          lineHeight: 1.6,
          wordBreak: "break-word",
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}
