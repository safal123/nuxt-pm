import { createHmac, randomBytes } from "node:crypto";
import type { RealtimeEvent } from "~/utils/realtime";

const ABLY_REST = "https://rest.ably.io";

const ablyApiKey = () =>
  (
    (useRuntimeConfig().ablyApiKey as string | undefined) ||
    process.env.ABLY_API_KEY ||
    ""
  ).trim();

export const isAblyConfigured = () => Boolean(ablyApiKey());

const splitApiKey = () => {
  const key = ablyApiKey();
  const separator = key.indexOf(":");
  if (separator < 1) return null;
  return {
    key,
    keyName: key.slice(0, separator),
    keySecret: key.slice(separator + 1),
  };
};

const ablyHeaders = (key: string) => ({
  Authorization: `Basic ${Buffer.from(key).toString("base64")}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});

const canonicalCapability = (capability: Record<string, string[]>) => {
  const ordered: Record<string, string[]> = {};
  for (const name of Object.keys(capability).sort()) {
    ordered[name] = [...capability[name]].sort();
  }
  return JSON.stringify(ordered);
};

const ablyTime = async (key: string) => {
  try {
    const times = await $fetch<number[]>(`${ABLY_REST}/time`, {
      headers: ablyHeaders(key),
    });
    return Array.isArray(times) ? times[0] : Date.now();
  } catch {
    return Date.now();
  }
};

export const createAblyTokenRequest = async (params: {
  clientId: string;
  channels: string[];
}) => {
  const parts = splitApiKey();
  if (!parts) {
    throw createError({
      statusCode: 503,
      message: "Realtime is not configured.",
    });
  }

  const channels = [...new Set(params.channels.filter(Boolean))];
  if (!channels.length) {
    throw createError({
      statusCode: 400,
      message: "At least one realtime channel is required.",
    });
  }

  const ttl = 60 * 60 * 1000;
  const capability = canonicalCapability(
    Object.fromEntries(channels.map((channel) => [channel, ["subscribe"]])),
  );
  const timestamp = await ablyTime(parts.key);
  const nonce = randomBytes(8).toString("hex");
  const signText =
    [
      parts.keyName,
      ttl,
      capability,
      params.clientId,
      timestamp,
      nonce,
    ].join("\n") + "\n";
  const mac = createHmac("sha256", parts.keySecret)
    .update(signText)
    .digest("base64");

  return {
    keyName: parts.keyName,
    clientId: params.clientId,
    capability,
    ttl,
    timestamp,
    nonce,
    mac,
  };
};

export const publishRealtime = async (
  channel: string,
  event: RealtimeEvent,
  clientId?: string | null,
) => {
  const parts = splitApiKey();
  if (!parts) return;

  try {
    await $fetch(
      `${ABLY_REST}/channels/${encodeURIComponent(channel)}/messages`,
      {
        method: "POST",
        headers: ablyHeaders(parts.key),
        body: {
          name: event.type,
          data: { ...event, clientId: clientId || null },
        },
      },
    );
  } catch (error: any) {
    const ably = error?.data?.error;
    if (ably?.code === 40160) {
      console.error(
        "Failed to publish realtime event: this Ably API key cannot publish. In the Ably dashboard open API keys and use the Root key, or create a key with publish + subscribe on *.",
      );
      return;
    }
    console.error("Failed to publish realtime event", ably || error);
  }
};
