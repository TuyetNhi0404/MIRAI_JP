import mongoose from "mongoose";
import GrammarChunk from "../model/grammarChunk.model";

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
    filter.documentId = new mongoose.Types.ObjectId(documentId);
  }
  return filter;
}

async function vectorCandidates(
  filter: Record<string, unknown>,
  queryEmbedding: number[]
): Promise<Array<{ id: string; text: string; score: number }>> {
  if (process.env.USE_ATLAS_VECTOR_SEARCH === "true") {
    try {
      const index = process.env.ATLAS_VECTOR_INDEX || "grammar_chunk_vector";
      const atlasFilter: Record<string, unknown> = {};
      if (filter.centerId) atlasFilter.centerId = filter.centerId;
      if (filter.level) atlasFilter.level = filter.level;
      if (filter.documentId) atlasFilter.documentId = filter.documentId;

      const rows = await GrammarChunk.aggregate([
        {
          $vectorSearch: {
            index,
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: VECTOR_CANDIDATES,
            filter: atlasFilter,
          },
        },
        { $project: { text: 1, score: { $meta: "vectorSearchScore" } } },
      ]);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: String(r._id),
          text: r.text as string,
          score: (r.score as number) ?? 0,
        }));
      }
    } catch {
      /* fallback to in-memory cosine */
    }
  }

  const chunks = await GrammarChunk.find(filter).select("_id text embedding").lean();
  return chunks
    .map(c => ({
      id: String(c._id),
      text: c.text,
      score: cosineSimilarity(queryEmbedding, c.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, VECTOR_CANDIDATES);
}

async function keywordCandidates(
  filter: Record<string, unknown>,
  query: string
): Promise<Array<{ id: string; text: string }>> {
  try {
    const rows = await GrammarChunk.find(
      { ...filter, $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(KEYWORD_CANDIDATES)
      .select("_id text")
      .lean();
    return rows.map(r => ({ id: String(r._id), text: r.text }));
  } catch {
    return [];
  }
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
  const count = await GrammarChunk.countDocuments(filter);
  if (count === 0) return [];

  const [vectorList, keywordList] = await Promise.all([
    vectorCandidates(filter, queryEmbedding),
    keywordCandidates(filter, query),
  ]);

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
