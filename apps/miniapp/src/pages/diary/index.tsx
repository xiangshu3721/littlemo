import { View, Text, Button, ScrollView } from "@tarojs/components";
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

type DayGroup = {
  key: string;
  label: string;
  notes: Note[];
};

const PREVIEW_LEN = 90;

function dayKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}年${md}`;
}

function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function groupByDay(notes: Note[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  const sorted = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const note of sorted) {
    const key = dayKey(note.createdAt) || note.id;
    const existing = map.get(key);
    if (existing) existing.notes.push(note);
    else map.set(key, { key, label: formatDay(note.createdAt), notes: [note] });
  }
  return [...map.values()];
}

function preview(content: string, expanded: boolean) {
  const text = content.trim();
  if (expanded || text.length <= PREVIEW_LEN) return text;
  return `${text.slice(0, PREVIEW_LEN).trimEnd()}…`;
}

export default function DiaryPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = useMemo(() => groupByDay(notes), [notes]);

  async function load() {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<{ notes: Note[] }>("/api/notes");
      setNotes(res.notes || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      setError(err instanceof ApiError ? err.message : "记录读不出来");
    } finally {
      setLoading(false);
    }
  }

  useDidShow(() => {
    void load();
  });

  function toggle(id: string, long: boolean) {
    if (!long) return;
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <View className="diary">
      <ScrollView className="diary__feed" scrollY>
        {loading ? (
          <View className="diary__state">
            <View className="diary__seal" />
            <Text className="diary__state-title">在读…</Text>
          </View>
        ) : error ? (
          <View className="diary__state">
            <View className="diary__seal" />
            <Text className="diary__state-title">这一页没打开</Text>
            <Text className="diary__state-body">{error}</Text>
            <Button className="diary__retry" onClick={() => void load()}>
              再试一次
            </Button>
          </View>
        ) : groups.length === 0 ? (
          <View className="diary__state">
            <View className="diary__seal" />
            <Text className="diary__state-title">还没有记下</Text>
            <Text className="diary__state-body">去「有点情绪」写下这一刻，就会出现在这里。</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.key} className="diary__group">
              <Text className="diary__day">{group.label}</Text>
              {group.notes.map((note) => {
                const long = note.content.trim().length > PREVIEW_LEN;
                const open = expandedId === note.id;
                return (
                  <View
                    key={note.id}
                    className="diary__card"
                    onClick={() => toggle(note.id, long)}
                  >
                    <Text className="diary__time">{clock(note.createdAt)}</Text>
                    <Text className="diary__body">{preview(note.content, open)}</Text>
                    {long ? <Text className="diary__more">{open ? "收起" : "展开"}</Text> : null}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
