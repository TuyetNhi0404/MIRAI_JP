import Redis from "ioredis";
import { isGrammarQueueEnabled } from "../config/redis.config";

const TTL_SEC = 24 * 60 * 60;
const MAX_MEMORY = 200;

type MemEntry = { vec: number[]; expiresAt: number };
const memory = new Map<string, MemEntry>();

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!isGrammarQueueEnabled()) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redis.connect().catch(() => {
      redis = null;
    });
  }
  return redis;
}

export async function getCachedQueryEmbedding(key: string): Promise<number[] | null> {
  const r = getRedis();
  if (r) {
    try {
      const raw = await r.get(`grammar:embed:${key}`);
      if (raw) return JSON.parse(raw) as number[];
    } catch {
      /* fallback to memory */
    }
  }
  const entry = memory.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.vec;
}

export async function setCachedQueryEmbedding(key: string, vec: number[]): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(`grammar:embed:${key}`, JSON.stringify(vec), "EX", TTL_SEC);
      return;
    } catch {
      /* fallback to memory */
    }
  }
  if (memory.size >= MAX_MEMORY) {
    const first = memory.keys().next().value;
    if (first !== undefined) memory.delete(first);
  }
  memory.set(key, { vec, expiresAt: Date.now() + TTL_SEC * 1000 });
}
