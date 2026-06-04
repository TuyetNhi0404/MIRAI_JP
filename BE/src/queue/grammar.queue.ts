import { Queue } from "bullmq";
import { getRedisConnection, isGrammarQueueEnabled } from "../config/redis.config";
import type { GrammarJobName, GrammarOcrJobData } from "./grammar.types";

const QUEUE_NAME = "grammar-document";
const DLQ_NAME = "grammar-document-dlq";

let grammarQueue: Queue | null = null;
let dlq: Queue | null = null;

function getQueue(): Queue {
  if (!isGrammarQueueEnabled()) {
    throw new Error("Grammar queue disabled (Redis unavailable)");
  }
  if (!grammarQueue) {
    grammarQueue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    });
  }
  return grammarQueue;
}

function getDlq(): Queue {
  if (!isGrammarQueueEnabled()) {
    throw new Error("Grammar queue disabled (Redis unavailable)");
  }
  if (!dlq) {
    dlq = new Queue(DLQ_NAME, { connection: getRedisConnection() });
  }
  return dlq;
}

export async function enqueueGrammarPipeline(data: GrammarOcrJobData): Promise<boolean> {
  if (!isGrammarQueueEnabled()) return false;
  try {
    const queue = getQueue();
    await queue.add("ocr" satisfies GrammarJobName, data, { jobId: `ocr-${data.documentId}` });
    return true;
  } catch (err) {
    console.error("[GrammarQueue] enqueue failed, fallback to in-process:", err);
    return false;
  }
}

export async function enqueueNextJob(
  name: GrammarJobName,
  data: Record<string, unknown>,
  documentId: string
): Promise<void> {
  const queue = getQueue();
  await queue.add(name, data, { jobId: `${name}-${documentId}-${Date.now()}` });
}

export async function moveToDlq(
  jobName: string,
  data: unknown,
  errorMessage: string
): Promise<void> {
  await getDlq().add("failed", { jobName, data, errorMessage, failedAt: new Date().toISOString() });
}

export { getQueue, getDlq, QUEUE_NAME, DLQ_NAME };
