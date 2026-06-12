
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GrammarChunk from "../src/model/grammarChunk.model";

const TARGET_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const BATCH = 100;
const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI required");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY required");

  await mongoose.connect(uri);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: TARGET_MODEL });

  const filter = { $or: [{ embeddingModel: { $ne: TARGET_MODEL } }, { embeddingModel: { $exists: false } }] };
  const total = await GrammarChunk.countDocuments(filter);
  console.log(`Chunks to re-index: ${total} (model=${TARGET_MODEL}, dryRun=${dryRun})`);

  let processed = 0;
  let cursor = GrammarChunk.find(filter).select("_id text embeddingModel").cursor();

  let batch: { _id: mongoose.Types.ObjectId; text: string }[] = [];
  for await (const doc of cursor) {
    batch.push({ _id: doc._id as mongoose.Types.ObjectId, text: doc.text });
    if (batch.length < BATCH) continue;

    if (!dryRun) await reindexBatch(model, batch);
    processed += batch.length;
    console.log(`Progress: ${processed}/${total}`);
    batch = [];
  }
  if (batch.length > 0 && !dryRun) {
    await reindexBatch(model, batch);
    processed += batch.length;
  }

  console.log(`Done. Re-indexed ${processed} chunks.`);
  await mongoose.disconnect();
}

async function reindexBatch(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  batch: { _id: mongoose.Types.ObjectId; text: string }[]
): Promise<void> {
  const resp = await model.batchEmbedContents({
    requests: batch.map(b => ({ content: { role: "user", parts: [{ text: b.text }] } })),
  });
  const embs = resp.embeddings ?? [];
  await Promise.all(
    batch.map((b, i) => {
      const vec = embs[i]?.values;
      if (!vec?.length) return Promise.resolve();
      return GrammarChunk.updateOne(
        { _id: b._id },
        { $set: { embedding: vec, embeddingModel: TARGET_MODEL, embeddingDim: vec.length } }
      );
    })
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
