"use client";

import { useState } from "react";
import BCCLogo from "./BCCLogo";
import HelpModal from "./HelpModal";

const TABS = ["Чат", "Справка"] as const;

export default function Header() {
  const [helpOpen, setHelpOpen] = useState(false);
  const activeTab = helpOpen ? "Справка" : "Чат";

  return (
    <header
      className="flex items-center justify-between shrink-0 z-10 relative"
      style={{
        height: 60,
        padding: "0 20px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <BCCLogo variant="horizontal" />

      {/* Tabs — desktop only */}
      <div className="hidden md:flex gap-1">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setHelpOpen(tab === "Справка")}
              style={{
                padding: "7px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: "none",
                background: active ? "var(--primary-soft)" : "transparent",
                color: active ? "var(--primary)" : "var(--text-sec)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        {/* Help — mobile only (tabs are desktop-only) */}
        <button
          onClick={() => setHelpOpen(true)}
          aria-label="Справка"
          className="md:hidden flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "1px solid var(--primary-border)",
            background: "var(--primary-dim)",
            color: "var(--primary)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ?
        </button>
        <div
          className="flex items-center gap-2"
          style={{
            padding: "5px 12px",
            borderRadius: 999,
            background: "var(--primary-dim)",
            border: "1px solid var(--primary-border)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
          <span className="hidden sm:inline" style={{ fontSize: 12, fontWeight: 500, color: "var(--primary)" }}>Активен</span>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
