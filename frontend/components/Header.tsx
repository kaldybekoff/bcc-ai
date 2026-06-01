"use client";

import { useState } from "react";
import BCCLogo from "./BCCLogo";

const TABS = ["Чат", "История", "Справка"] as const;

export default function Header() {
  const [activeTab, setActiveTab] = useState<string>("Чат");

  return (
    <header
      className="flex items-center justify-between shrink-0 z-10 relative"
      style={{
        height: 56,
        padding: "0 20px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo — horizontal variant */}
      <BCCLogo variant="horizontal" />

      {/* Center tabs */}
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              borderRadius: 6,
              border: activeTab === tab
                ? "1px solid rgba(245,166,35,0.2)"
                : "1px solid transparent",
              background: activeTab === tab
                ? "rgba(245,166,35,0.10)"
                : "transparent",
              color: activeTab === tab ? "#F5A623" : "var(--text-sec)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Online status */}
      <div className="flex items-center gap-2">
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
        <span style={{ fontSize: 12, color: "var(--text-sec)" }}>Активен</span>
      </div>
    </header>
  );
}
