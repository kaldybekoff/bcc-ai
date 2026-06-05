"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import FAQSidebar, { type RecentItem } from "@/components/FAQSidebar";
import ChatWindow from "@/components/ChatWindow";
import { type Message } from "@/components/MessageBubble";
import { streamChat, type HistoryMessage } from "@/lib/api";

const RECENT_KEY = "bcc-recent";
const RECENT_MAX = 8;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Загрузка истории запросов из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const pushRecent = useCallback((q: string) => {
    setRecent((prev) => {
      const next = [{ q, ts: Date.now() }, ...prev.filter((r) => r.q !== q)].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }, []);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    pushRecent(q);

    // история диалога для контекста бэкенда (без пустых/стриминговых сообщений)
    const history: HistoryMessage[] = messagesRef.current
      .filter((m) => m.text.trim())
      .map((m) => ({ role: m.role, text: m.text }));

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: q };
    const aiId = `a-${Date.now()}`;
    const aiMsg: Message = { id: aiId, role: "ai", text: "", streaming: true };
    setMessages((p) => [...p, userMsg, aiMsg]);
    setLoading(true);

    try {
      let aiText = "";
      let sources: string[] = [];
      for await (const ev of streamChat(q, history)) {
        if (ev.text) {
          aiText += ev.text;
          setMessages((p) => p.map((m) => (m.id === aiId ? { ...m, text: aiText } : m)));
        }
        if (ev.done) sources = ev.sources ?? [];
      }
      setMessages((p) =>
        p.map((m) => (m.id === aiId ? { ...m, streaming: false, sources } : m))
      );
    } catch {
      setMessages((p) =>
        p.map((m) =>
          m.id === aiId
            ? { ...m, text: "Ошибка подключения к серверу. Попробуйте ещё раз.", streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loading, pushRecent]);

  const handleFAQSelect = (question: string) => {
    setInput(question);
    setMobileDrawerOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <FAQSidebar
          onSelect={handleFAQSelect}
          mobileOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          recent={recent}
          onClearRecent={clearRecent}
        />
        <ChatWindow
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={send}
          inputRef={inputRef}
          onOpenFAQ={() => setMobileDrawerOpen(true)}
        />
      </div>
    </div>
  );
}
