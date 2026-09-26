import "server-only";
import { randomUUID } from "node:crypto";
import cloudbase from "@cloudbase/js-sdk";
import { prisma as localPrisma, type PrismaClient } from "@littlemo/db";

type ModelName = "user" | "note" | "chatMessage" | "diarySession" | "periodReport";
type RdbQuery = PromiseLike<unknown> & {
  select: (columns?: string) => RdbQuery;
  eq: (field: string, value: unknown) => RdbQuery;
  is: (field: string, value: unknown) => RdbQuery;
  not: (field: string, operator: string, value: unknown) => RdbQuery;
  gte: (field: string, value: unknown) => RdbQuery;
  lte: (field: string, value: unknown) => RdbQuery;
  or: (expression: string) => RdbQuery;
  order: (field: string, options: { ascending: boolean }) => RdbQuery;
  limit: (value: number) => RdbQuery;
  maybeSingle: () => Promise<unknown>;
  single: () => Promise<unknown>;
  insert: (row: Record<string, unknown>) => RdbQuery;
  update: (row: Record<string, unknown>) => RdbQuery;
  delete: () => RdbQuery;
};
type RdbClient = { from: (table: string) => RdbQuery };

const TABLES: Record<ModelName, string> = {
  user: "User",
  note: "Note",
  chatMessage: "ChatMessage",
  diarySession: "DiarySession",
  periodReport: "PeriodReport",
};

const UPDATED_AT_TABLES = new Set(["User", "Note", "DiarySession", "PeriodReport"]);
const DATE_FIELDS: Record<string, string[]> = {
  User: [
    "termsConsentedAt", "sensitiveInfoConsentedAt", "aiDataConsentedAt",
    "adultAgeConfirmedAt", "createdAt", "updatedAt",
  ],
  Note: ["deletedAt", "createdAt", "updatedAt"],
  ChatMessage: ["createdAt"],
  DiarySession: ["startedAt", "endedAt", "lastUserAt", "deletedAt", "createdAt", "updatedAt"],
  PeriodReport: ["generatedAt", "createdAt", "updatedAt"],
};

let cachedRdb: { envId: string; accessKey: string; db: RdbClient } | undefined;

class CloudbaseDatabaseError extends Error {
  readonly code?: string;

  constructor(code?: string) {
    super("CLOUDBASE_DATABASE_OPERATION_FAILED");
    this.name = "CloudbaseDatabaseError";
    this.code = code;
  }
}

function shouldUseCloudbase() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.CLOUDBASE_APIKEY?.trim());
}

function getRdb(): RdbClient {
  const envId = process.env.CLOUDBASE_ENV_ID?.trim() || "littlemo-d2gy2ec0dd102163";
  const accessKey = process.env.CLOUDBASE_APIKEY?.trim();
  if (!accessKey) {
    throw new Error("CLOUDBASE_PG_CONFIG_MISSING:CLOUDBASE_APIKEY");
  }
  if (cachedRdb?.envId === envId && cachedRdb.accessKey === accessKey) return cachedRdb.db;

  const app = cloudbase.init({ env: envId, accessKey });
  const db = app.rdb() as unknown as RdbClient;
  cachedRdb = { envId, accessKey, db };
  return db;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, serializeValue(item)]),
    );
  }
  return value;
}

function addWhere(query: RdbQuery, where: Record<string, unknown> = {}): RdbQuery {
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      if (!Array.isArray(value) || value.length === 0) continue;
      const branches = value.map((branch) => {
        if (!isPlainObject(branch)) throw new Error("UNSUPPORTED_DATABASE_FILTER");
        return Object.entries(branch).map(([field, operand]) => {
          if (operand === null) return `${field}.is.null`;
          if (isPlainObject(operand)) throw new Error("UNSUPPORTED_DATABASE_FILTER");
          return `${field}.eq.${JSON.stringify(serializeValue(operand))}`;
        }).join(" and ");
      });
      query = query.or(branches.join(","));
      continue;
    }

    // Prisma compound-unique selectors (e.g. userId_clientId) contain the
    // actual column filters as their nested value.
    if (key.includes("_") && isPlainObject(value)) {
      query = addWhere(query, value);
      continue;
    }

    if (value === null) {
      query = query.is(key, null);
      continue;
    }

    if (isPlainObject(value)) {
      for (const [operator, operand] of Object.entries(value)) {
        if (operator === "not" && operand === null) query = query.not(key, "is", null);
        else if (operator === "gte") query = query.gte(key, serializeValue(operand));
        else if (operator === "lte") query = query.lte(key, serializeValue(operand));
        else throw new Error("UNSUPPORTED_DATABASE_FILTER");
      }
      continue;
    }

    query = query.eq(key, serializeValue(value));
  }
  return query;
}

function decodeRow<T>(table: string, row: unknown): T {
  if (!isPlainObject(row)) return row as T;
  const decoded = { ...row };
  for (const field of DATE_FIELDS[table] || []) {
    const value = decoded[field];
    if (typeof value === "string" || typeof value === "number") decoded[field] = new Date(value);
  }
  return decoded as T;
}

async function run(query: PromiseLike<unknown>) {
  let result: unknown;
  try {
    result = await query;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
    throw new CloudbaseDatabaseError(code);
  }
  const response = isPlainObject(result) ? result : {};
  const error = isPlainObject(response.error) ? response.error : null;
  if (error) {
    const code = typeof error.code === "string" ? error.code : undefined;
    throw new CloudbaseDatabaseError(code);
  }
  return response.data;
}

function newId() {
  return `c${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function prepareData(table: string, data: Record<string, unknown>, creating: boolean) {
  const cleaned = serializeValue(data) as Record<string, unknown>;
  const now = new Date().toISOString();
  if (creating && !cleaned.id) cleaned.id = newId();
  if (creating && !cleaned.createdAt) cleaned.createdAt = now;
  if (UPDATED_AT_TABLES.has(table)) cleaned.updatedAt = now;
  return cleaned;
}

function queryFor(table: string, where: Record<string, unknown> = {}) {
  return addWhere(getRdb().from(table).select("*"), where);
}

async function findOne<T>(table: string, where: Record<string, unknown>) {
  const data = await run(queryFor(table, where).maybeSingle());
  return data ? decodeRow<T>(table, data) : null;
}

function delegate(table: string) {
  return {
    async findUnique<T = unknown>({ where }: { where: Record<string, unknown> }) {
      return findOne<T>(table, where);
    },
    async findFirst<T = unknown>({ where, orderBy }: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }) {
      let query = queryFor(table, where).limit(1);
      for (const [field, direction] of Object.entries(orderBy || {})) {
        query = query.order(field, { ascending: direction === "asc" });
      }
      const data = await run(query.maybeSingle());
      return data ? decodeRow<T>(table, data) : null;
    },
    async findMany<T = unknown>({ where, orderBy, take, select }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
      select?: Record<string, boolean>;
    } = {}) {
      const columns = select ? Object.keys(select).filter((field) => select[field]).join(",") : "*";
      let query = addWhere(getRdb().from(table).select(columns || "*"), where);
      for (const [field, direction] of Object.entries(orderBy || {})) {
        query = query.order(field, { ascending: direction === "asc" });
      }
      if (typeof take === "number") query = query.limit(take);
      const data = await run(query);
      return (Array.isArray(data) ? data : []).map((row) => decodeRow<T>(table, row));
    },
    async create<T = unknown>({ data }: { data: Record<string, unknown> }) {
      const created = prepareData(table, data, true);
      const row = await run(getRdb().from(table).insert(created).select("*").single());
      return decodeRow<T>(table, row);
    },
    async update<T = unknown>({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const updated = prepareData(table, data, false);
      const query = addWhere(getRdb().from(table).update(updated).select("*"), where);
      const row = await run(query.maybeSingle());
      if (!row) throw new CloudbaseDatabaseError("PGRST116");
      return decodeRow<T>(table, row);
    },
    async upsert<T = unknown>({ where, create, update }: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      const existing = await findOne<T>(table, where);
      if (existing) return this.update<T>({ where, data: update });
      try {
        return await this.create<T>({ data: create });
      } catch (error) {
        // Resolve concurrent first-login/report writes through the unique key.
        if (!(error instanceof CloudbaseDatabaseError) || error.code !== "23505") throw error;
        const winner = await findOne<T>(table, where);
        if (!winner) throw error;
        return this.update<T>({ where, data: update });
      }
    },
    async delete({ where }: { where: Record<string, unknown> }) {
      const query = addWhere(getRdb().from(table).delete().select("id"), where);
      const row = await run(query.maybeSingle());
      if (!row) throw new CloudbaseDatabaseError("PGRST116");
    },
  };
}

const delegates = Object.fromEntries(
  Object.entries(TABLES).map(([model, table]) => [model, delegate(table)]),
);

/**
 * Local development keeps the existing Prisma/PostgreSQL connection. In
 * CloudRun, production uses CloudBase's server-side PostgreSQL SDK so the
 * shared PostgreSQL cluster needs no public TCP address or paid upgrade.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (!shouldUseCloudbase()) {
      const value = Reflect.get(localPrisma, property, localPrisma);
      return typeof value === "function" ? value.bind(localPrisma) : value;
    }
    if (typeof property === "string" && property in delegates) return delegates[property as ModelName];
    throw new Error("UNSUPPORTED_DATABASE_METHOD");
  },
});

export type { Prisma, User, Note, ChatMessage, DiarySession, PeriodReport } from "@littlemo/db";
