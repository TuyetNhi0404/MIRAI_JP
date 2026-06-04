import { Router, Request, Response, NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import { getQueue, getDlq } from "../queue/grammar.queue";
import { isGrammarQueueEnabled } from "../config/redis.config";

const router = Router();

let boardRouter: ReturnType<ExpressAdapter["getRouter"]> | null = null;

function ensureBullBoard(): boolean {
  if (boardRouter) return true;
  if (!isGrammarQueueEnabled()) return false;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/admin/grammar-queues");

  createBullBoard({
    queues: [new BullMQAdapter(getQueue()), new BullMQAdapter(getDlq())],
    serverAdapter,
  });

  boardRouter = serverAdapter.getRouter();
  return true;
}

router.use(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  (req: Request, res: Response, next: NextFunction) => {
    if (!ensureBullBoard()) {
      res.status(503).json({
        message:
          "Grammar queue unavailable. Start Redis (cd BE && docker compose up -d) or set ENABLE_GRAMMAR_QUEUE=false.",
      });
      return;
    }
    boardRouter!(req, res, next);
  }
);

export default router;
