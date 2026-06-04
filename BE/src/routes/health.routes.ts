import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { isGrammarQueueEnabled } from "../config/redis.config";
import Redis from "ioredis";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = !isGrammarQueueEnabled();

  if (isGrammarQueueEnabled()) {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const probe = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    try {
      await probe.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    } finally {
      probe.disconnect();
    }
  }

  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({
    ok,
    mongo: mongoOk,
    redis: redisOk,
    uptime: process.uptime(),
  });
});

export default router;
