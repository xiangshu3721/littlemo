export type ChatProvider = "deepseek";

export type GatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatInput = {
  provider: ChatProvider;
  messages: GatewayMessage[];
  temperature?: number;
  json?: boolean;
};

export type ChatResult = {
  content: string;
  model: string;
  provider: ChatProvider;
};

const DEEPSEEK_BASE = "https://api.deepseek.com";

/**
 * Thin provider gateway so a later model can plug in without changing routes.
 * Mini-program V1 only uses DeepSeek. Keys stay on the server.
 */
export async function chat(input: ChatInput): Promise<ChatResult> {
  if (input.provider === "deepseek") {
    return deepseekChat(input);
  }
  throw new Error("UNSUPPORTED_PROVIDER");
}

async function deepseekChat(input: ChatInput): Promise<ChatResult> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const body: Record<string, unknown> = {
    model,
    messages: input.messages,
    temperature: input.temperature ?? 0.55,
  };
  if (input.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    try {
      await res.text();
    } catch {
      /* discard upstream body */
    }
    throw new Error("UPSTREAM");
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("BAD_MODEL");
  return { content: content.trim(), model, provider: "deepseek" };
}
