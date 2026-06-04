import type { ConnectionOptions } from "bullmq";
import Redis from "ioredis";

let redisAvailable: boolean | null = null;

export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return { url, maxRetriesPerRequest: null };
}

/** Env-only: user wants queue feature (may still be off if Redis is down). */
export function isGrammarQueueEnabledByEnv(): boolean {
  if (process.env.ENABLE_GRAMMAR_QUEUE === "false") return false;
  if (process.env.NODE_ENV === "development" && process.env.ENABLE_GRAMMAR_QUEUE !== "true") {
    return false;
  }
  return true;
}

/** Runtime: env allows queue and Redis probe succeeded. */
export function isGrammarQueueEnabled(): boolean {
  if (!isGrammarQueueEnabledByEnv()) return false;
  if (redisAvailable === false) return false;
  return true;
}

export async function ensureRedisReady(): Promise<boolean> {
  if (!isGrammarQueueEnabledByEnv()) {
    redisAvailable = false;
    return false;
  }
  if (redisAvailable !== null) return redisAvailable;

  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });

  try {
    await client.connect();
    await client.ping();
    redisAvailable = true;
    console.log("[Redis] Connected — grammar queue enabled");
  } catch {
    redisAvailable = false;
    console.warn(
      "[Redis] Unavailable at",
      url,
      "— grammar queue disabled; uploads use in-process pipeline.",
      "Start Redis: cd BE && docker compose up -d",
      "Or set ENABLE_GRAMMAR_QUEUE=false in BE/.env"
    );
  } finally {
    client.disconnect();
  }

  return redisAvailable;
}
