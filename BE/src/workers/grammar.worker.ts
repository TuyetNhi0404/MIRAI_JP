import { Worker, Job } from "bullmq";
import { getRedisConnection, isGrammarQueueEnabled } from "../config/redis.config";
import { GrammarService } from "../service/grammar.service";
import { enqueueNextJob, moveToDlq, QUEUE_NAME } from "../queue/grammar.queue";
import type {
  GrammarEmbedJobData,
  GrammarExtractJobData,
  GrammarJobName,
  GrammarOcrJobData,
} from "../queue/grammar.types";
import GrammarDocument from "../model/grammarDocument.model";
import fs from "fs/promises";
import { notifyStage } from "../service/grammarProgress.service";

let worker: Worker | null = null;

async function handleOcr(job: Job<GrammarOcrJobData>): Promise<void> {
  const { documentId, filePath, centerId, level } = job.data;
  await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "ocr" });
  await notifyStage(documentId, "ocr", { status: "processing" });
  const buffer = await fs.readFile(filePath);
  const fileName = filePath.split("/").pop() || "document.pdf";
  await GrammarService.runOcrStage(documentId, buffer, fileName);
  await enqueueNextJob("embed", { documentId, centerId, level }, documentId);
}

async function handleEmbed(job: Job<GrammarEmbedJobData>): Promise<void> {
  const { documentId, centerId, level } = job.data;
  await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "embed" });
  await notifyStage(documentId, "embed", { status: "processing" });
  await GrammarService.runEmbedStage(documentId, centerId, level);
  await enqueueNextJob("extract", { documentId, centerId, level }, documentId);
}

async function handleExtract(job: Job<GrammarExtractJobData>): Promise<void> {
  const { documentId, centerId, level } = job.data;
  await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "extract" });
  await notifyStage(documentId, "extract", { status: "processing" });
  await GrammarService.runExtractStage(documentId, centerId, level);
  await GrammarDocument.findByIdAndUpdate(documentId, {
    status: "completed",
    processingStage: "done",
  });
  await notifyStage(documentId, "done", { status: "completed" });
}

export function startGrammarWorker(): void {
  if (!isGrammarQueueEnabled() || worker) return;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const name = job.name as GrammarJobName;
      if (name === "ocr") return handleOcr(job as Job<GrammarOcrJobData>);
      if (name === "embed") return handleEmbed(job as Job<GrammarEmbedJobData>);
      if (name === "extract") return handleExtract(job as Job<GrammarExtractJobData>);
      throw new Error(`Unknown grammar job: ${job.name}`);
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    console.error(`[GrammarWorker] Job ${job.name} failed:`, err.message);
    await moveToDlq(job.name, job.data, err.message);
    const documentId = (job.data as { documentId?: string }).documentId;
    if (documentId) {
      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "failed",
        processingStage: "failed",
      });
      await notifyStage(documentId, "failed", { status: "failed" });
    }
  });

  worker.on("ready", () => console.log("[GrammarWorker] Ready"));
}
