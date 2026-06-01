"use client";

import { useCallback, useRef, useState } from "react";
import Header from "@/components/Header";
import FAQSidebar from "@/components/FAQSidebar";
import ChatWindow from "@/components/ChatWindow";
import { type Message } from "@/components/MessageBubble";
import { streamChat } from "@/lib/api";

const WELCOME: Message = {
  id: "welcome",
  role: "ai",
  text: "Здравствуйте! Я знаю всё о продуктах BCC Bank — **#картакарта**, кредиты, автокредиты и рефинансирование.\n\nЗадайте вопрос на русском или казахском языке.",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: q };
    const aiId = `a-${Date.now()}`;
    const aiMsg: Message = { id: aiId, role: "ai", text: "", streaming: true };
    setMessages((p) => [...p, userMsg, aiMsg]);
    setLoading(true);

    try {
      let aiText = "";
      let sources: string[] = [];
      for await (const ev of streamChat(q)) {
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
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <FAQSidebar onSelect={handleFAQSelect} />
        <ChatWindow
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={send}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
