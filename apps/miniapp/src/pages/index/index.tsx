/* eslint-disable jsx-a11y/alt-text -- Taro Image has no cross-platform alt prop. */
import { View, Text, Textarea, Button, ScrollView, Image } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api, ApiError } from "../../utils/api";
import {
  avatarInitial,
  avatarSrc,
  companionTagline,
  displayName,
} from "../../utils/avatar";
import { isArchiveMark } from "../../utils/diary-moods";
import {
  appendTurn,
  ensureOpenSession,
  hydrateFromCloud,
  liveMessages,
  liveSessions,
  newDiaryId,
  openTalkSession,
  requestInsight,
  resumePendingAnalysis,
} from "../../utils/diary-store";
import type { Message } from "../../utils/diary-types";
import { pickChatImage, isPickCancel } from "../../utils/image";
import { getToken, getUser, isLoggedIn, saveSession, type SessionUser } from "../../utils/session";
import { customNavInset, usePageTheme } from "../../utils/theme";
import "./index.scss";

function clock(ts: number) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HomePage() {
  const theme = usePageTheme();
  const [thread, setThread] = useState<Message[]>([]);
  const [endedById, setEndedById] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingAt, setPendingAt] = useState(0);
  const [closing, setClosing] = useState(false);
  const [canInsight, setCanInsight] = useState(false);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(isLoggedIn());
  const [openPlus, setOpenPlus] = useState(false);
  const [nickname, setNickname] = useState(displayName(getUser()));
  const [tagline, setTagline] = useState(companionTagline());
  const [face, setFace] = useState(avatarSrc(getUser()));
  const [inset, setInset] = useState(customNavInset);

  const bubbles = useMemo(() => {
    const list = [...thread];
    if (pending) {
      list.push({
        id: "pending",
        sessionId: "",
        role: "assistant",
        text: "在听…",
        createdAt: pendingAt,
        day: "",
        pending: true,
      });
    }
    return list;
  }, [thread, pending, pendingAt]);

  function syncProfile(user?: SessionUser | null) {
    const current = user || getUser();
    setNickname(displayName(current));
    setTagline(companionTagline());
    setFace(avatarSrc(current));
  }

  function syncLocal() {
    const sessions = liveSessions();
    const map: Record<string, boolean> = {};
    for (const session of sessions) map[session.id] = Boolean(session.endedAt);
    setEndedById(map);
    setThread(liveMessages());
    setCanInsight(Boolean(openTalkSession()));
  }

  async function load() {
    if (!isLoggedIn()) {
      setAuthed(false);
      setThread([]);
      setEndedById({});
      setCanInsight(false);
      setReady(true);
      return;
    }
    setAuthed(true);
    syncProfile(getUser());
    try {
      const meRes = await api<{ user: SessionUser }>("/api/me").catch(() => null);
      const token = getToken();
      if (token && meRes?.user) {
        saveSession(token, meRes.user);
        syncProfile(meRes.user);
      }
      await hydrateFromCloud();
      void resumePendingAnalysis();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthed(false);
        setThread([]);
        setEndedById({});
        setCanInsight(false);
        setReady(true);
        return;
      }
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "记录读不出来",
        icon: "none",
      });
    }
    syncLocal();
    setReady(true);
  }

  useDidShow(() => {
    setInset(customNavInset());
    void load();
  });

  function goLogin() {
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  function requireAuth() {
    if (isLoggedIn()) return true;
    goLogin();
    return false;
  }

  async function send() {
    if (!requireAuth()) return;
    const content = draft.trim();
    if ((!content && !image) || busy) return;
    const sendingImage = image;
    setBusy(true);
    setPending(true);
    setPendingAt(Date.now());
    setDraft("");
    setImage("");
    setOpenPlus(false);
    try {
      const open = await ensureOpenSession(content || (sendingImage ? "（图片）" : ""));
      const userMessageId = newDiaryId();
      const res = await api<{
        note: { createdAt: string };
        reply: { content: string; createdAt: string; id: string };
        messages?: { id: string; createdAt: string }[];
      }>("/api/chat", {
        method: "POST",
        timeout: 25_000,
        data: {
          content,
          hasImage: Boolean(sendingImage),
          sessionId: open.id,
          clientId: userMessageId,
        },
      });
      await appendTurn({
        text: content,
        image: sendingImage || undefined,
        reply: res.reply.content,
        createdAt: new Date(res.note.createdAt).getTime() || Date.now(),
        replyAt: new Date(res.reply.createdAt).getTime() || Date.now(),
        sessionId: open.id,
        userMessageId,
        assistantMessageId: res.reply.id,
      });
      syncLocal();
    } catch (err) {
      setDraft(content);
      setImage(sendingImage);
      const msg =
        err instanceof ApiError
          ? err.message
          : "这次没有接上服务，请稍后再试。";
      Taro.showToast({
        title: msg.slice(0, 40),
        icon: "none",
        duration: 2500,
      });
    } finally {
      setBusy(false);
      setPending(false);
      setPendingAt(0);
    }
  }

  async function closeAndInsight() {
    if (!requireAuth()) return;
    if (!canInsight || closing || busy) return;
    setClosing(true);
    try {
      await requestInsight();
      syncLocal();
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : "没收进去",
        icon: "none",
      });
    } finally {
      setClosing(false);
    }
  }

  async function onPickImage() {
    if (!requireAuth() || busy) return;
    setOpenPlus(false);
    try {
      const path = await pickChatImage();
      setImage(path);
    } catch (err) {
      if (isPickCancel(err)) return;
      const message = err instanceof Error ? err.message : "图片读不进去";
      Taro.showToast({ title: message.slice(0, 40), icon: "none" });
    }
  }

  function goMine() {
    Taro.switchTab({ url: "/pages/mine/index" });
  }

  function previewPhoto(src: string) {
    if (!src) return;
    Taro.previewImage({ urls: [src], current: src });
  }

  const lastId = bubbles.at(-1)?.id;
  const canSend = Boolean(draft.trim() || image);

  return (
    <View className={`home ${theme.className}`}>
      <View
        className="home__header"
        style={{
          paddingTop: `${inset.paddingTop}PX`,
          paddingRight: `${inset.paddingRight}PX`,
          paddingBottom: `${inset.paddingBottom}PX`,
          minHeight: `${inset.paddingTop + inset.rowHeight + inset.paddingBottom}PX`,
        }}
      >
        <View className="home__who" onClick={goMine}>
          <View
            className="home__avatar"
            aria-label="打开我的资料"
            style={{ width: `${inset.rowHeight}PX`, height: `${inset.rowHeight}PX` }}
          >
            {face ? (
              <Image
                className="home__avatar-img"
                src={face}
                mode="aspectFill"
                style={{ width: `${inset.rowHeight}PX`, height: `${inset.rowHeight}PX` }}
              />
            ) : (
              <Text className="home__avatar-mark">{avatarInitial(nickname)}</Text>
            )}
          </View>
          <View className="home__who-copy">
            <Text className="home__name">{nickname}</Text>
            <Text className="home__tagline">{tagline}</Text>
          </View>
        </View>
        <View
          className="home__theme"
          hoverClass="none"
          aria-label={theme.isDark ? "切换到白天 · 干净手账" : "切换到黑夜 · 墨夜金线"}
          style={{ width: `${inset.rowHeight}PX`, height: `${inset.rowHeight}PX` }}
          onClick={theme.cycleDayNight}
        >
          <View className={theme.isDark ? "glyph glyph--moon" : "glyph glyph--sun"} />
        </View>
      </View>
      <View className="home__hairline" />
      <ScrollView className="home__feed" scrollY scrollIntoView={lastId}>
        {!ready ? (
          <View className="home__loading">
            <Text className="home__loading-text">正在打开记录…</Text>
          </View>
        ) : bubbles.length === 0 ? (
          <View className="home__empty">
            <View className="home__seal" />
            <Text className="home__empty-title">去记下这一刻</Text>
            <Text className="home__empty-body">
              {authed
                ? "想说就说。这是情绪记录与文字陪伴，不是心理咨询或医疗建议。"
                : "可以先看看日记和洞察。进入后即可记下这一刻。"}
            </Text>
            {authed ? null : (
              <Button className="home__login" onClick={goLogin}>
                进入
              </Button>
            )}
          </View>
        ) : (
          bubbles.map((bubble, index) => {
            const next = bubbles[index + 1];
            const archived =
              isArchiveMark(bubble.text) ||
              (Boolean(endedById[bubble.sessionId]) && (!next || next.sessionId !== bubble.sessionId));
            const hideArchiveBubble = isArchiveMark(bubble.text) && bubble.role === "assistant";
            return (
              <View id={bubble.id} key={bubble.id}>
                {hideArchiveBubble ? null : (
                  <View className={`bubble ${bubble.role === "user" ? "bubble--user" : "bubble--ai"}`}>
                    <View className={`bubble__sheet ${bubble.pending ? "bubble__sheet--pending" : ""}`}>
                      {bubble.image ? (
                        <Image
                          className="bubble__photo"
                          src={bubble.image}
                          mode="aspectFill"
                          onClick={() => previewPhoto(bubble.image!)}
                        />
                      ) : null}
                      {bubble.text ? <Text className="bubble__text">{bubble.text}</Text> : null}
                    </View>
                    <Text className="bubble__time">{bubble.pending ? "" : clock(bubble.createdAt)}</Text>
                  </View>
                )}
                {archived ? (
                  <Text className="home__archive">这段已收进情绪日记，深度洞察可在日记里展开</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
      <View className="home__composer">
        {canInsight ? (
          <Button
            className="home__close"
            disabled={closing || busy}
            onClick={() => void closeAndInsight()}
          >
            {closing ? "正在收这段…" : "就聊到这，帮我深度洞察下这段情绪"}
          </Button>
        ) : null}
        {image ? (
          <View className="home__preview">
            <Image className="home__preview-img" src={image} mode="aspectFill" />
            <Button className="home__preview-drop" aria-label="去掉这张图" onClick={() => setImage("")}>
              ×
            </Button>
          </View>
        ) : null}
        {openPlus ? (
          <View className="home__plus-menu">
            <Button className="home__photo" onClick={() => void onPickImage()}>
              照片
            </Button>
          </View>
        ) : null}
        <View className="home__row">
          <Button
            className="home__plus"
            aria-label="附件"
            disabled={busy}
            onClick={() => setOpenPlus((v) => !v)}
          >
            <View className="glyph glyph--plus" />
          </Button>
          <Textarea
            className="home__input"
            value={draft}
            maxlength={4000}
            autoHeight
            placeholder="想说就说…"
            onInput={(e) => setDraft(e.detail.value)}
          />
          <Button
            className="home__send"
            aria-label="发送"
            disabled={busy || !canSend}
            onClick={() => void send()}
          >
            <View className="glyph glyph--send" />
          </Button>
        </View>
      </View>
    </View>
  );
}
