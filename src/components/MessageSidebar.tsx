"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageSquare, X } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "patient" | "dentist";
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

interface MessageSidebarProps {
  patientId: string;
}

export default function MessageSidebar({ patientId }: MessageSidebarProps) {
  const [open, setOpen] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // Hydrate any existing thread/messages on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/messaging?patientId=${encodeURIComponent(patientId)}`
        );
        if (!res.ok) throw new Error(`fetch failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setThreadId(data.threadId ?? null);
        setMessages(data.messages ?? []);
      } catch (err) {
        console.error("Message load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Optimistic send:
  //   1. Append a `pending` bubble with a temp id immediately.
  //   2. On 201, swap the temp record for the server's canonical row.
  //   3. On failure, mark the bubble `failed` (red ring) and restore the draft
  //      so the user can edit and retry — nothing is lost.
  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      content,
      sender: "patient",
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          patientId,
          content,
          sender: "patient",
        }),
      });
      if (!res.ok) throw new Error(`send failed (${res.status})`);
      const data = await res.json();

      // Learn the threadId on first successful send so subsequent messages
      // append to the same conversation.
      if (data.threadId && !threadId) setThreadId(data.threadId);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...data.message, pending: false, failed: false }
            : m
        )
      );
    } catch (err) {
      console.error("Message send error", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m
        )
      );
      // Restore the draft so the user can retry without retyping.
      setDraft(content);
    }
  }, [draft, threadId, patientId]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white p-3 shadow-lg z-20"
        aria-label="Open messaging"
      >
        <MessageSquare size={20} />
      </button>
    );
  }

  return (
    <aside className="fixed top-0 right-0 h-full w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 text-white flex flex-col z-20 shadow-2xl">
      <header className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Message your clinic</h2>
          <p className="text-xs text-zinc-500">Replies usually within 24h</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-400 hover:text-white"
          aria-label="Close messaging"
        >
          <X size={18} />
        </button>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading ? (
          <p className="text-sm text-zinc-500 text-center">
            Loading conversation…
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center">
            No messages yet. Ask your clinic about your scan.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={[
                "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                m.sender === "patient"
                  ? "ml-auto bg-blue-600"
                  : "bg-zinc-800",
                m.pending ? "opacity-60" : "",
                m.failed ? "ring-1 ring-red-500" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.failed && (
                <p className="text-[10px] text-red-300 mt-1">
                  Failed to send — edit &amp; retry
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-zinc-800 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 flex items-center justify-center"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
