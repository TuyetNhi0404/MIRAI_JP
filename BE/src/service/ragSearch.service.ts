import mongoose from "mongoose";
import GrammarDocument from "../model/grammarDocument.model";

const RRF_K = 60;
const VECTOR_CANDIDATES = 20;
const KEYWORD_CANDIDATES = 20;
const FUSION_TOP = 8;
const FINAL_TOP = 4;

export function reciprocalRankFusion(
  lists: Array<Array<{ id: string; text: string }>>
): Array<{ id: string; text: string; score: number }> {
  const scores = new Map<string, { id: string; text: string; score: number }>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.id) ?? { ...item, score: 0 };
      prev.score += 1 / (RRF_K + rank + 1);
      scores.set(item.id, prev);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA?.length || vecA.length !== vecB?.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildChunkFilter(
  centerId: string,
  level: string,
  documentId?: string
): Record<string, unknown> {
  const filter: Record<string, unknown> = { centerId, level };
  if (documentId) {
    filter._id = new mongoose.Types.ObjectId(documentId);
  }
  return filter;
}

/** Phase 3: hybrid vector + BM25 with RRF, re-rank top fusion by cosine → topK */
export async function hybridRetrieveChunks(
  centerId: string,
  level: string,
  query: string,
  queryEmbedding: number[],
  topK = FINAL_TOP,
  documentId?: string
): Promise<string[]> {
  const filter = buildChunkFilter(centerId, level, documentId);
  
  // Fetch documents containing the chunks
  const docs = await GrammarDocument.find(filter).select("_id chunks").lean();
  
  // Extract all chunks from documents
  const allChunks: Array<{ id: string; text: string; embedding: number[] }> = [];
  for (const doc of docs) {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      for (const chunk of doc.chunks) {
        if (chunk.text && chunk.embedding) {
          allChunks.push({
            id: `${doc._id}_${chunk.pageNumber}_${chunk.text.substring(0, 15)}`,
            text: chunk.text,
            embedding: chunk.embedding
          });
        }
      }
    }
  }

  if (allChunks.length === 0) return [];

  // 1. Vector candidates (cosine similarity)
  const vectorList = allChunks
    .map(c => ({
      id: c.id,
      text: c.text,
      score: cosineSimilarity(queryEmbedding, c.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, VECTOR_CANDIDATES);

  // 2. Keyword candidates (simple in-memory TF matching)
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const keywordList = allChunks
    .map(c => {
      const textLower = c.text.toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        if (textLower.includes(term)) {
          const occurrences = textLower.split(term).length - 1;
          score += occurrences;
        }
      }
      return { id: c.id, text: c.text, score };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, KEYWORD_CANDIDATES)
    .map(({ id, text }) => ({ id, text }));

  if (keywordList.length === 0) {
    return vectorList.slice(0, topK).map(v => v.text);
  }

  const fused = reciprocalRankFusion([
    vectorList.map(({ id, text }) => ({ id, text })),
    keywordList,
  ]).slice(0, FUSION_TOP);

  const vectorById = new Map(vectorList.map(v => [v.id, v.score]));
  const reranked = fused
    .map(item => ({
      text: item.text,
      score: vectorById.get(item.id) ?? item.score,
    }))
    .sort((a, b) => b.score - a.score);

  return reranked.slice(0, topK).map(r => r.text);
}

export { cosineSimilarity };
