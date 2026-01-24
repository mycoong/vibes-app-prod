// lib/upstashKv.ts
type UpstashCmd = (string | number | null)[];

const URL = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function pipeline(commands: UpstashCmd[]) {
  if (!URL || !TOKEN) throw new Error("UPSTASH_ENV_MISSING");
  const res = await fetch(`${URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`UPSTASH_HTTP_${res.status}:${text}`);
  return JSON.parse(text);
}

export const whiskKv = {
  async setJson(key: string, value: any, ttlSeconds: number) {
    const v = JSON.stringify(value);
    const out = await pipeline([
      ["SET", key, v],
      ["EXPIRE", key, ttlSeconds],
    ]);
    return out;
  },

  async getJsonWithTtl(key: string): Promise<{ value: any | null; ttl: number }> {
    const out = await pipeline([
      ["GET", key],
      ["TTL", key],
    ]);

    // Upstash pipeline returns array of { result, error }
    const getRes = out?.[0]?.result ?? null;
    const ttlRes = typeof out?.[1]?.result === "number" ? out[1].result : -2;

    if (!getRes) return { value: null, ttl: ttlRes };

    try {
      return { value: JSON.parse(getRes), ttl: ttlRes };
    } catch {
      return { value: getRes, ttl: ttlRes };
    }
  },

  async del(key: string) {
    const out = await pipeline([["DEL", key]]);
    return out;
  },
};
