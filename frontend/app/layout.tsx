import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "BCC AI Ассистент",
  description: "Корпоративный AI ассистент BCC Bank для сотрудников-операторов",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.className} h-full`}>
      <body className="h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
