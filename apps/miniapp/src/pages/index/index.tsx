import { View, Text, Textarea, Button, ScrollView } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api, ApiError } from "../../utils/api";
import { isLoggedIn } from "../../utils/session";
import "./index.scss";

type Note = {
  id: string;
  content: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  pending?: boolean;
};

function mergeTimeline(notes: Note[], messages: ChatMessage[]): Bubble[] {
  const user = notes.map((note) => ({
    id: `note-${note.id}`,
    role: "user" as const,
    content: note.content,
    createdAt: note.createdAt,
  }));
  const assistant = messages
    .filter((row) => row.role === "assistant")
    .map((row) => ({
      id: `ai-${row.id}`,
      role: "assistant" as const,
      content: row.content,
      createdAt: row.createdAt,
    }));
  return [...user, ...assistant].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  const bubbles = useMemo(() => {
    const list = mergeTimeline(notes, messages);
    if (pending) {
      list.push({
        id: "pending",
        role: "assistant",
        content: "在听…",
        createdAt: new Date().toISOString(),
        pending: true,
      });
    }
    return list;
  }, [notes, messages, pending]);

  async function load() {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    try {
      const [noteRes, chatRes] = await Promise.all([
        api<{ notes: Note[] }>("/api/notes"),
        api<{ messages: ChatMessage[] }>("/api/chat"),
      ]);
      setNotes(noteRes.notes || []);
      setMessages(chatRes.messages || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "记录读不出来",
        icon: "none",
      });
    }
  }

  useDidShow(() => {
    void load();
  });

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setPending(true);
    setDraft("");
    try {
      const res = await api<{
        note: Note;
        reply: ChatMessage;
      }>("/api/chat", {
        method: "POST",
        data: { content },
      });
      setNotes((prev) => [...prev, res.note]);
      setMessages((prev) => [...prev, res.reply]);
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "没接上",
        icon: "none",
      });
    } finally {
      setBusy(false);
      setPending(false);
    }
  }

  return (
    <View className="home">
      <ScrollView className="home__feed" scrollY scrollIntoView={bubbles.at(-1)?.id}>
        {bubbles.length === 0 ? (
          <View className="home__empty">
            <View className="home__seal" />
            <Text className="home__empty-title">去记下这一刻</Text>
            <Text className="home__empty-body">繁华之外的心灵净土，让灵魂慢一点，让烦恼少一些</Text>
          </View>
        ) : (
          bubbles.map((bubble) => (
            <View
              id={bubble.id}
              key={bubble.id}
              className={`bubble ${bubble.role === "user" ? "bubble--user" : "bubble--ai"}`}
            >
              <View className={`bubble__sheet ${bubble.pending ? "bubble__sheet--pending" : ""}`}>
                <Text className="bubble__text">{bubble.content}</Text>
              </View>
              <Text className="bubble__time">{bubble.pending ? "" : clock(bubble.createdAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View className="home__composer">
        <Textarea
          className="home__input"
          value={draft}
          maxlength={4000}
          autoHeight
          placeholder="这一刻想说的…"
          onInput={(e) => setDraft(e.detail.value)}
        />
        <Button className="home__send" disabled={busy || !draft.trim()} onClick={send}>
          送出
        </Button>
      </View>
    </View>
  );
}
