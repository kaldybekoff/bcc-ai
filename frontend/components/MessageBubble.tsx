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

function HexAvatar() {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 28,
        height: 28,
        background: "var(--bg-card)",
        border: "1px solid rgba(245,166,35,0.3)",
        borderRadius: 8,
        alignSelf: "flex-start",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="none" stroke="#F5A623" strokeWidth="1.2" />
        <circle cx="8" cy="7" r="2" fill="#F5A623" />
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
            background: "#F5A623",
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
        color: "var(--text-sec)",
        background: "rgba(245,166,35,0.07)",
        border: "1px solid rgba(245,166,35,0.18)",
        borderRadius: 4,
        padding: "2px 7px",
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
      <div className="msg-enter flex gap-2" style={{ alignItems: "flex-start" }}>
        <HexAvatar />
        {/* maxWidth responsive: 90% mobile, 78% desktop */}
        <div style={{ maxWidth: "min(78%, calc(100vw - 80px))", width: "100%" }}>
          <div
            style={{
              position: "relative",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "4px 14px 14px 14px",
              padding: "12px 14px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, rgba(245,166,35,0.5), transparent)" }} />

            {msg.streaming && !msg.text ? (
              <TypingDots />
            ) : (
              <div className="prose-bcc">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            )}

            {!msg.streaming && msg.sources && msg.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {msg.sources.map((s) => <SourceTag key={s} name={s} />)}
              </div>
            )}

            {!msg.streaming && msg.text && (
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <button
                  onClick={copy}
                  style={{ fontSize: 11, color: copied ? "#F5A623" : "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; }}
                >
                  {copied ? "✓ Скопировано" : "Копировать"}
                </button>
                <button
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; }}
                >
                  👍
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
          background: "var(--bg-user)",
          border: "1px solid rgba(245,166,35,0.12)",
          borderRadius: "14px 4px 14px 14px",
          padding: "10px 14px",
          fontSize: 13,
          color: "#fff",
          lineHeight: 1.6,
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          wordBreak: "break-word",
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}
