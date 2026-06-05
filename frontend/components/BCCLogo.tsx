"use client";

export interface BCCLogoProps {
  variant?: "full" | "icon" | "mini" | "horizontal";
}

const ICON_SIZES: Record<NonNullable<BCCLogoProps["variant"]>, number> = {
  full: 64,
  icon: 40,
  mini: 28,
  horizontal: 36,
};

/* Clean green geometric BCC mark (stylized triangle), crisp on white */
function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "linear-gradient(135deg, #00C07A 0%, #00A86B 60%, #009159 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,168,107,0.28)",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        {/* triangle split into two tones — BCC-style geometric mark */}
        <path d="M12 3 L21 19 L12 19 Z" fill="#FFFFFF" />
        <path d="M12 3 L3 19 L12 19 Z" fill="rgba(255,255,255,0.62)" />
      </svg>
    </div>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ lineHeight: 1.15 }}>
      <span style={{ fontSize: compact ? 18 : 20, fontWeight: 700, color: "var(--text)", display: "block", letterSpacing: "-0.01em" }}>
        BCC <span style={{ color: "var(--primary)" }}>AI</span>
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-sec)",
          letterSpacing: "0.12em",
          textTransform: "lowercase",
          display: "block",
          marginTop: 1,
        }}
      >
        ассистент
      </span>
    </div>
  );
}

export default function BCCLogo({ variant = "full" }: BCCLogoProps) {
  const size = ICON_SIZES[variant];

  if (variant === "horizontal") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mark size={size} />
        <Wordmark compact />
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Mark size={size} />
        <Wordmark />
      </div>
    );
  }

  return <Mark size={size} />;
}
