"use client";

export interface BCCLogoProps {
  variant?: "full" | "icon" | "mini" | "horizontal";
}

const SIZES: Record<NonNullable<BCCLogoProps["variant"]>, number> = {
  full:       110,
  icon:        72,
  mini:        40,
  horizontal:  38,
};

const VERTICES = [
  { cx: 55, cy: 12, delay: "0s"   },
  { cx: 91, cy: 32, delay: "0.4s" },
  { cx: 91, cy: 72, delay: "0.8s" },
  { cx: 55, cy: 92, delay: "1.2s" },
  { cx: 19, cy: 72, delay: "1.6s" },
  { cx: 19, cy: 32, delay: "2s"   },
];

const LINES = [
  { x1: 55, y1: 38, x2: 44, y2: 55, delay: "0s"   },
  { x1: 55, y1: 38, x2: 66, y2: 55, delay: "0.5s" },
  { x1: 44, y1: 55, x2: 66, y2: 55, delay: "1s"   },
  { x1: 44, y1: 55, x2: 55, y2: 68, delay: "1.5s" },
  { x1: 66, y1: 55, x2: 55, y2: 68, delay: "2s"   },
];

const NODES = [
  { cx: 55, cy: 38, delay: "0s"    },
  { cx: 44, cy: 55, delay: "0.33s" },
  { cx: 66, cy: 55, delay: "0.66s" },
  { cx: 55, cy: 68, delay: "1s"    },
];

// ─── Core SVG (shared by all variants) ───────────────────────────────────────
function LogoSVG({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1 ── Pulse rings */}
      {([0, 1, 2] as const).map((i) => (
        <circle
          key={i}
          cx="55" cy="55" r={0}
          stroke="#F5A623" strokeWidth="0.8" fill="none"
          style={{ animation: `bcc-ring-pulse 3s infinite ${i}s` }}
        />
      ))}

      {/* 2 ── Outer hexagon (rotating CW) */}
      <g style={{ animation: "bcc-hex-spin 16s linear infinite", transformOrigin: "55px 55px" }}>
        <polygon
          points="55,12 91,32 91,72 55,92 19,72 19,32"
          fill="none"
          stroke="rgba(245,166,35,0.25)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {VERTICES.map((v, i) => (
          <circle
            key={i}
            cx={v.cx} cy={v.cy} r={2.5}
            fill="#F5A623"
            style={{ animation: `bcc-vertex-glow 3s infinite ${v.delay}` }}
          />
        ))}
      </g>

      {/* 3 ── Inner hexagon (rotating CCW, dashed) */}
      <g style={{ animation: "bcc-hex-spin-rev 10s linear infinite", transformOrigin: "55px 55px" }}>
        <polygon
          points="55,28 73,38 73,58 55,68 37,58 37,38"
          fill="none"
          stroke="rgba(245,166,35,0.12)"
          strokeWidth="0.8"
          strokeDasharray="3,3"
        />
      </g>

      {/* 4 ── Center glow circle */}
      <circle
        cx="55" cy="55" r="18"
        fill="rgba(245,166,35,0.04)"
        stroke="rgba(245,166,35,0.08)"
        strokeWidth="0.5"
      />

      {/* 5 ── Neural network lines */}
      {LINES.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#F5A623" strokeWidth="1"
          style={{ animation: `bcc-line-on 3s infinite ${l.delay}` }}
        />
      ))}

      {/* 6 ── Neural nodes */}
      {NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.cx} cy={n.cy} r={4}
          fill="#F5A623"
          style={{ animation: `bcc-node-beat 2s infinite ${n.delay}` }}
        />
      ))}
      {/* Center accent dot */}
      <circle cx="55" cy="52" r="2.5" fill="rgba(245,166,35,0.5)" />

      {/* 7 ── Orbit dots */}
      <g style={{ animation: "bcc-orbit 6s linear infinite", transformOrigin: "55px 55px" }}>
        <circle cx="55" cy="55" r="3" fill="#F5A623" opacity="0.6" />
      </g>
      <g style={{ animation: "bcc-orbit 6s linear infinite 3s", transformOrigin: "55px 55px" }}>
        <circle cx="55" cy="55" r="2" fill="rgba(245,166,35,0.5)" />
      </g>

      {/* 8 ── Text (full variant only — rendered here so it scales with SVG) */}
      <text
        x="55" y="104"
        textAnchor="middle"
        fontSize="11"
        fontWeight="500"
        fill="#FFFFFF"
        letterSpacing="5"
        style={{ animation: "bcc-text-fade 4s ease-in-out infinite", display: "none" }}
      >
        BCC AI
      </text>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BCCLogo({ variant = "full" }: BCCLogoProps) {
  const size = SIZES[variant];

  /* Horizontal: icon + wordmark side by side */
  if (variant === "horizontal") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <LogoSVG size={38} />
        <div style={{ lineHeight: 1.2 }}>
          <span style={{ fontSize: 22, fontWeight: 500, color: "#fff", display: "block" }}>
            BCC <span style={{ color: "#F5A623" }}>AI</span>
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#8BA3C7",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginTop: 1,
            }}
          >
            Ассистент
          </span>
        </div>
      </div>
    );
  }

  /* Full: large icon + "BCC AI" label below */
  if (variant === "full") {
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <LogoSVG size={size} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#FFFFFF",
            letterSpacing: 5,
            animation: "bcc-text-fade 4s ease-in-out infinite",
          }}
        >
          BCC AI
        </span>
      </div>
    );
  }

  /* Icon / Mini: just the SVG, no text */
  return <LogoSVG size={size} />;
}
