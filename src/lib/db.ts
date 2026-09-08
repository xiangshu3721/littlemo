import type { Analysis, AnalysisStatus, Message, MoodId, PeriodReport, Session } from "./types";

type LegacyEntry = {
  id: string;
  createdAt: number;
  day: string;
  text: string;
  image?: Blob;
  mood?: MoodId;
  analysis?: Analysis | null;
  analysisStatus: AnalysisStatus;
  analysisError?: string;
  deletedAt?: number;
};

const DB_NAME = "suisuinian";
const VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("entries")) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("byCreated", "createdAt");
        store.createIndex("byDay", "day");
      }
      if (!db.objectStoreNames.contains("reports")) {
        db.createObjectStore("reports", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("byCreated", "createdAt");
        messages.createIndex("bySession", "sessionId");
      }
      if (!db.objectStoreNames.contains("sessions")) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("byDay", "day");
        sessions.createIndex("byStarted", "startedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function listEntries(): Promise<LegacyEntry[]> {
  const db = await openDb();
  if (!db.objectStoreNames.contains("entries")) return [];
  return new Promise((resolve, reject) => {
    const req = db.transaction("entries", "readonly").objectStore("entries").getAll();
    req.onsuccess = () => resolve((req.result as LegacyEntry[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function listMessages(): Promise<Message[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("messages", "readonly").objectStore("messages").index("byCreated").getAll();
    req.onsuccess = () => {
      const rows = (req.result as Message[]).sort((a, b) => a.createdAt - b.createdAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listSessions(): Promise<Session[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("sessions", "readonly").objectStore("sessions").index("byStarted").getAll();
    req.onsuccess = () => {
      const rows = (req.result as Session[]).sort((a, b) => a.startedAt - b.startedAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putMessage(message: Message) {
  const db = await openDb();
  const tx = db.transaction("messages", "readwrite");
  tx.objectStore("messages").put(message);
  await txDone(tx);
}

export async function putSession(session: Session) {
  const db = await openDb();
  const tx = db.transaction("sessions", "readwrite");
  tx.objectStore("sessions").put(session);
  await txDone(tx);
}

export async function deleteMessage(id: string) {
  const db = await openDb();
  const tx = db.transaction("messages", "readwrite");
  tx.objectStore("messages").delete(id);
  await txDone(tx);
}

export async function deleteSessionForever(id: string) {
  const db = await openDb();
  const tx = db.transaction(["sessions", "messages"], "readwrite");
  const messages = tx.objectStore("messages");
  const bySession = messages.index("bySession");
  const rows = await new Promise<Message[]>((resolve, reject) => {
    const req = bySession.getAll(id);
    req.onsuccess = () => resolve((req.result as Message[]) || []);
    req.onerror = () => reject(req.error);
  });
  for (const row of rows) {
    messages.delete(row.id);
  }
  tx.objectStore("sessions").delete(id);
  await txDone(tx);
}

export async function getReport(id: string): Promise<PeriodReport | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("reports", "readonly").objectStore("reports").get(id);
    req.onsuccess = () => resolve(req.result as PeriodReport | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putReport(report: PeriodReport) {
  const db = await openDb();
  const tx = db.transaction("reports", "readwrite");
  tx.objectStore("reports").put(report);
  await txDone(tx);
}

export async function migrateLegacyEntries() {
  const existing = await listSessions();
  if (existing.length) return;
  const legacy = await listEntries();
  for (const entry of legacy) {
    const session: Session = {
      id: entry.id,
      day: entry.day,
      startedAt: entry.createdAt,
      endedAt: entry.createdAt,
      title: (entry.text || "一段记录").slice(0, 12),
      mood: entry.mood,
      analysis: entry.analysis,
      analysisStatus: entry.analysisStatus === "pending" ? "idle" : entry.analysisStatus,
      analysisError: entry.analysisError,
      deletedAt: entry.deletedAt,
    };
    const message: Message = {
      id: `${entry.id}-u`,
      sessionId: entry.id,
      role: "user",
      createdAt: entry.createdAt,
      day: entry.day,
      text: entry.text,
      image: entry.image,
    };
    await putSession(session);
    await putMessage(message);
  }
}
