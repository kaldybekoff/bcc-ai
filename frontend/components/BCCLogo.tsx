"use client";

import Image from "next/image";

export interface BCCLogoProps {
  variant?: "full" | "icon" | "mini" | "horizontal";
}

// Натуральные размеры файла public/bcc-ai-logo.png (после обрезки полей)
const LOGO_W = 1315;
const LOGO_H = 357;
const RATIO = LOGO_W / LOGO_H;

// Высота отрисовки логотипа по вариантам
const HEIGHTS: Record<NonNullable<BCCLogoProps["variant"]>, number> = {
  full: 64,
  horizontal: 34,
  icon: 30,
  mini: 24,
};

export default function BCCLogo({ variant = "horizontal" }: BCCLogoProps) {
  const h = HEIGHTS[variant];
  return (
    <Image
      src="/bcc-ai-logo.png"
      alt="BCC AI"
      width={LOGO_W}
      height={LOGO_H}
      priority
      sizes={`${Math.round(h * RATIO)}px`}
      style={{ height: h, width: "auto", display: "block" }}
    />
  );
}
