import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GrammarDocument from "../src/model/grammarDocument.model";

const TARGET_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const BATCH = 100;
const dryRun = process.argv.includes("--dry-run");

interface PendingChunk {
  docId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI required");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY required");

  await mongoose.connect(uri);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: TARGET_MODEL });

  // Load all documents
  const documents = await GrammarDocument.find({});
  const pendingChunks: PendingChunk[] = [];

  for (const doc of documents) {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      doc.chunks.forEach((chunk, index) => {
        if (chunk.embeddingModel !== TARGET_MODEL || !chunk.embedding || chunk.embedding.length === 0) {
          pendingChunks.push({
            docId: doc._id as mongoose.Types.ObjectId,
            chunkIndex: index,
            text: chunk.text,
          });
        }
      });
    }
  }

  const total = pendingChunks.length;
  console.log(`Chunks to re-index: ${total} (model=${TARGET_MODEL}, dryRun=${dryRun})`);

  if (total === 0) {
    console.log("No chunks need re-indexing.");
    await mongoose.disconnect();
    return;
  }

  let processed = 0;
  let batch: PendingChunk[] = [];

  for (const item of pendingChunks) {
    batch.push(item);
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
  batch: PendingChunk[]
): Promise<void> {
  const resp = await model.batchEmbedContents({
    requests: batch.map(b => ({ content: { role: "user", parts: [{ text: b.text }] } })),
  });
  const embs = resp.embeddings ?? [];

  // Group updates by document ID to minimize database writes
  const docUpdates = new Map<string, { docId: mongoose.Types.ObjectId; updates: { index: number; embedding: number[] }[] }>();

  batch.forEach((b, i) => {
    const vec = embs[i]?.values;
    if (!vec?.length) return;

    const key = String(b.docId);
    let docGroup = docUpdates.get(key);
    if (!docGroup) {
      docGroup = { docId: b.docId, updates: [] };
      docUpdates.set(key, docGroup);
    }
    docGroup.updates.push({ index: b.chunkIndex, embedding: vec });
  });

  // Apply updates
  for (const group of docUpdates.values()) {
    const doc = await GrammarDocument.findById(group.docId);
    if (doc) {
      for (const upd of group.updates) {
        if (doc.chunks[upd.index]) {
          doc.chunks[upd.index].embedding = upd.embedding;
          doc.chunks[upd.index].embeddingModel = TARGET_MODEL;
          doc.chunks[upd.index].embeddingDim = upd.embedding.length;
        }
      }
      // mark Modified and save
      doc.markModified("chunks");
      await doc.save();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
