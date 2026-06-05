"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import FAQSidebar from "@/components/FAQSidebar";
import ChatWindow from "@/components/ChatWindow";
import { type Message } from "@/components/MessageBubble";
import { streamChat, type HistoryMessage } from "@/lib/api";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");

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
  }, [loading]);

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
