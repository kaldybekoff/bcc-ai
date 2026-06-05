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
        height: 56,
        padding: "0 16px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <BCCLogo variant="horizontal" />

      {/* Tabs — desktop only */}
      <div className="hidden md:flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setHelpOpen(tab === "Справка")}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              borderRadius: 6,
              border: activeTab === tab ? "1px solid rgba(245,166,35,0.2)" : "1px solid transparent",
              background: activeTab === tab ? "rgba(245,166,35,0.10)" : "transparent",
              color: activeTab === tab ? "#F5A623" : "var(--text-sec)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        {/* Help — mobile only (tabs are desktop-only) */}
        <button
          onClick={() => setHelpOpen(true)}
          aria-label="Справка"
          className="md:hidden flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ?
        </button>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
        <span className="hidden sm:inline" style={{ fontSize: 12, color: "var(--text-sec)" }}>Активен</span>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
