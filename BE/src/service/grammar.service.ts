import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import GrammarDocument from "../model/grammarDocument.model";
import GrammarChunk from "../model/grammarChunk.model";
import GrammarCard from "../model/grammarCard.model";
import mongoose from "mongoose";
import { writeOcrResult, readOcrResult } from "../utils/uploadStorage";
import { hybridRetrieveChunks } from "./ragSearch.service";
import { getCachedQueryEmbedding, setCachedQueryEmbedding } from "./embedCache.service";
import { notifyStage } from "./grammarProgress.service";

export interface OcrResponse {
  total_pages: number;
  pages: Array<{ page_number: number; text: string }>;
}

// Setup Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
// gemini-2.5-flash: có free tier, context window lớn, phù hợp xử lý văn bản dài
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── Phase 1: Performance constants ─────────────────────────────────────────
const EMBED_BATCH_SIZE = 100;          // batch size cho batchEmbedContents (tiết kiệm quota)
const EMBED_INSERT_BATCH = 100;        // batch size cho GrammarChunk.insertMany
const EXTRACT_BATCH_CONCURRENCY = 1;   // số batch extract chạy song song (giữ =1 vì free tier)
const PAGES_PER_BATCH = 15;            // số trang/batch cho extract grammar
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;             // dim của gemini-embedding-001 default — khớp với Atlas index

// ─── Phase 1: Query embedding cache key builder ─────────────────────────────
function buildQueryCacheKey(centerId: string, level: string, query: string): string {
  // simple djb2 hash — chỉ để giữ key ngắn gọn, không cần crypto-grade
  let hash = 5381;
  const raw = `${centerId}|${level}|${query.trim().toLowerCase()}`;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  }
  return `q:${hash}`;
}

// ─── Phase 1: Adaptive rate limiter (token bucket) ──────────────────────────
// Thay vì sleep 30s cứng, ta dùng token bucket với refill rate = RPM cho phép.
// Khi API trả 429, ta tự động tăng backoff; khi thành công liên tục, ta dần phục hồi.
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private capacity: number,
    private refillPerSec: number,
    initialTokens: number = capacity
  ) {
    this.tokens = initialTokens;
    this.lastRefill = Date.now();
  }
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
  }
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillPerSec * 1000);
    await new Promise(r => setTimeout(r, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }
  // API trả 429 → tạm thời giảm refill rate (conservative backoff)
  penalize(factor = 0.5): void {
    this.refillPerSec = Math.max(0.05, this.refillPerSec * factor);
    this.capacity = Math.max(1, this.capacity * factor);
  }
  // Nếu liên tục thành công → tăng dần rate (recovery)
  reward(factor = 1.1): void {
    this.refillPerSec = Math.min(2, this.refillPerSec * factor);
    this.capacity = Math.min(20, this.capacity * factor);
  }
}
// 10 RPM cho free tier = ~0.167 token/sec, capacity = 2 burst
const extractBucket = new TokenBucket(2, 10 / 60);

function backoffFromQuotaError(err: any): number {
  try {
    const retryInfo = err?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
      if (!isNaN(seconds)) return (seconds + 2) * 1000;
    }
  } catch { /* fallthrough */ }
  return 30000;
}

// ─── Phase 1: In-memory metrics (reset mỗi request) ────────────────────────
interface ProcessMetrics {
  totalChunks: number;
  chunksCreated: number;
  chunksFailed: number;
  embedApiCalls: number;
  embedRetries: number;
  embedBatchFailures: number;
  cardExtractBatches: number;
  cardExtractRetries: number;
  cardsCreated: number;
  ocrDurationMs: number;
  embedDurationMs: number;
  extractDurationMs: number;
  insertDurationMs: number;
}
function newMetrics(): ProcessMetrics {
  return {
    totalChunks: 0, chunksCreated: 0, chunksFailed: 0,
    embedApiCalls: 0, embedRetries: 0, embedBatchFailures: 0,
    cardExtractBatches: 0, cardExtractRetries: 0,
    cardsCreated: 0,
    ocrDurationMs: 0, embedDurationMs: 0, extractDurationMs: 0, insertDurationMs: 0
  };
}
function logMetrics(stage: string, m: ProcessMetrics, extra: Record<string, any> = {}): void {
  console.log(`[GrammarService][Metrics] ${stage}`, JSON.stringify({
    chunks: { total: m.totalChunks, ok: m.chunksCreated, fail: m.chunksFailed },
    embed: { calls: m.embedApiCalls, retries: m.embedRetries, batchFails: m.embedBatchFailures, ms: m.embedDurationMs },
    extract: { batches: m.cardExtractBatches, retries: m.cardExtractRetries, cards: m.cardsCreated, ms: m.extractDurationMs },
    insert: { ms: m.insertDurationMs },
    ocr: { ms: m.ocrDurationMs },
    ...extra
  }));
}

// Cosine similarity utility
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Text splitter logic (similar to LangChain's RecursiveCharacterTextSplitter)
function splitTextIntoChunks(text: string, chunkSize = 350, chunkOverlap = 50): string[] {
  const chunks: string[] = [];
  if (!text || text.length === 0) return chunks;

  // Split by standard Japanese punctuation / English newlines
  const sentences = text.split(/(?<=[。！？\n])/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      // Start next chunk with overlap from the current chunk
      const overlapWords = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapWords + sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

// Helper: gọi Gemini với retry + adaptive backoff (điều chỉnh token bucket) khi gặp 503/429
async function callGeminiWithRetry(
  model: any,
  prompt: string,
  maxRetries = 4
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Acquire a token trước khi gọi (rate limit chủ động)
    await extractBucket.acquire();
    try {
      const result = await model.generateContent(prompt);
      // success → reward bucket
      extractBucket.reward();
      return result.response.text().trim();
    } catch (err: any) {
      // 404 = tên model sai / không tồn tại → không retry, báo lỗi ngay
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        throw new Error(`[Gemini] Model không tồn tại (404). Kiểm tra lại tên model trong grammar.service.ts. Chi tiết: ${err.message}`);
      }

      const isRetryable = err?.status === 503 || err?.status === 429 ||
        (err?.message && (err.message.includes('503') || err.message.includes('429') ||
          err.message.includes('Service Unavailable') || err.message.includes('quota')));

      if (isRetryable && attempt < maxRetries) {
        // Penalize bucket: giảm rate để tránh 429 tiếp theo
        extractBucket.penalize();
        const waitMs = backoffFromQuotaError(err);
        console.warn(`[GrammarService] Gemini trả về ${err?.status || 'lỗi'}, thử lại lần ${attempt + 1}/${maxRetries} sau ${Math.round(waitMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Gemini retry exhausted');
}

// Helper: gọi batch embedContents với retry. Một batch lỗi → fallback về embedContent lẻ
// để không mất toàn bộ progress.
async function callEmbedBatchWithRetry(
  texts: string[]
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const result: (number[] | null)[] = new Array(texts.length).fill(null);
  try {
    const resp = await embeddingModel.batchEmbedContents({
      requests: texts.map(t => ({ content: { role: "user", parts: [{ text: t }] } }))
    });
    const embs = resp.embeddings ?? [];
    for (let i = 0; i < embs.length && i < result.length; i++) {
      const v = embs[i]?.values;
      if (Array.isArray(v) && v.length > 0) result[i] = v;
    }
    return result;
  } catch (batchErr: any) {
    console.warn(`[GrammarService] batchEmbedContents lỗi (${batchErr?.status || batchErr?.message}), fallback embedContent lẻ cho ${texts.length} items`);
    // Fallback: gọi embedContent tuần tự cho từng item (rate-limited bằng token bucket)
    for (let i = 0; i < texts.length; i++) {
      try {
        await extractBucket.acquire();
        const r = await embeddingModel.embedContent(texts[i]);
        const v = r.embedding?.values;
        if (Array.isArray(v) && v.length > 0) result[i] = v;
        extractBucket.reward();
      } catch (itemErr: any) {
        if (itemErr?.status === 429) extractBucket.penalize();
        console.error(`[GrammarService] embedContent lẻ lỗi tại index ${i}:`, itemErr?.message);
      }
    }
    return result;
  }
}

export class GrammarService {
  /** OCR stage — gọi FastAPI, lưu kết quả JSON cho job tiếp theo */
  static async runOcrStage(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<OcrResponse> {
    const speakingServiceUrl = process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000";
    const formData = new FormData();
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });
    formData.append("file", fileBlob, fileName);

    let response;
    try {
      response = await axios.post(`${speakingServiceUrl}/process-pdf`, formData, {
        timeout: 600000,
      });
    } catch (axiosError: any) {
      const status = axiosError.response?.status || "Unknown status";
      const errorText = typeof axiosError.response?.data === "string"
        ? axiosError.response.data
        : JSON.stringify(axiosError.response?.data || axiosError.message);
      throw new Error(`FastAPI OCR trả về lỗi: ${status} - ${errorText}`);
    }

    const ocrResult = response.data as OcrResponse;
    await writeOcrResult(documentId, ocrResult);
    await GrammarDocument.findByIdAndUpdate(documentId, {
      totalPages: ocrResult.total_pages,
      processingStage: "embed",
    });
    await notifyStage(documentId, "ocr", { status: "processing" });
    return ocrResult;
  }

  /** Embed stage — batch embed + insertMany */
  static async runEmbedStage(
    documentId: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<ProcessMetrics> {
    const metrics = newMetrics();
    const ocrResult = await readOcrResult<OcrResponse>(documentId);

    const chunksToProcess: Array<{ pageNum: number; text: string }> = [];
    for (const page of ocrResult.pages) {
      if (!page.text || page.text.trim().length < 10) continue;
      for (const textChunk of splitTextIntoChunks(page.text)) {
        chunksToProcess.push({ pageNum: page.page_number, text: textChunk });
      }
    }
    metrics.totalChunks = chunksToProcess.length;

    const embedStart = Date.now();
    const chunkDocs: Record<string, unknown>[] = [];
    for (let i = 0; i < chunksToProcess.length; i += EMBED_BATCH_SIZE) {
      const slice = chunksToProcess.slice(i, i + EMBED_BATCH_SIZE);
      metrics.embedApiCalls++;
      const vectors = await callEmbedBatchWithRetry(slice.map(c => c.text));
      for (let j = 0; j < slice.length; j++) {
        const v = vectors[j];
        if (!v) { metrics.chunksFailed++; continue; }
        chunkDocs.push({
          documentId,
          centerId,
          level,
          pageNumber: slice[j].pageNum,
          text: slice[j].text,
          embedding: v,
          embeddingModel: EMBEDDING_MODEL,
          embeddingDim: EMBEDDING_DIM,
        });
      }
    }
    metrics.embedDurationMs = Date.now() - embedStart;

    const insertStart = Date.now();
    for (let i = 0; i < chunkDocs.length; i += EMBED_INSERT_BATCH) {
      const slice = chunkDocs.slice(i, i + EMBED_INSERT_BATCH);
      try {
        const inserted = await GrammarChunk.insertMany(slice, { ordered: false });
        metrics.chunksCreated += inserted.length;
      } catch (insertErr: any) {
        const inserted = Array.isArray(insertErr?.insertedDocs) ? insertErr.insertedDocs.length : 0;
        metrics.chunksCreated += inserted;
        metrics.chunksFailed += slice.length - inserted;
      }
    }
    metrics.insertDurationMs = Date.now() - insertStart;
    await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "extract" });
    await notifyStage(documentId, "embed", { status: "processing", chunkCount: metrics.chunksCreated });
    logMetrics("indexed", metrics, { documentId });
    return metrics;
  }

  /** Extract stage — trích xuất grammar cards từ OCR pages */
  static async runExtractStage(
    documentId: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<ProcessMetrics> {
    const metrics = newMetrics();
    const ocrResult = await readOcrResult<OcrResponse>(documentId);
    const allExtractedCards: Record<string, unknown>[] = [];
    const seenTitles = new Set<string>();
    const pages = ocrResult.pages.filter(p => p.text && p.text.trim().length > 10);
    const totalBatches = Math.ceil(pages.length / PAGES_PER_BATCH);
    const extractStart = Date.now();

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchPages = pages.slice(batchIdx * PAGES_PER_BATCH, (batchIdx + 1) * PAGES_PER_BATCH);
      const batchText = batchPages.map(p => `[Trang ${p.page_number}]\n${p.text}`).join("\n\n");
      const pageRange = `${batchPages[0].page_number}-${batchPages[batchPages.length - 1].page_number}`;

      const extractionPrompt = `
Bạn là chuyên gia giáo dục tiếng Nhật. Dưới đây là nội dung các trang ${pageRange} từ tài liệu học tập (cấp độ: ${level}):
"""
${batchText}
"""

NHIỆM VỤ: Trích xuất TẤT CẢ các mẫu ngữ pháp tiếng Nhật trong đoạn trên.
- Tài liệu có thể đánh số thứ tự các mẫu ngữ pháp (ví dụ: "1.", "2.", "10.", "60."). Hãy trích xuất TẤT CẢ chúng.
- Nếu có N mẫu ngữ pháp được đánh số, hãy trả về đúng N đối tượng.
- Nếu không tìm thấy mẫu ngữ pháp nào, trả về mảng rỗng: []

Định dạng đầu ra bắt buộc là một mảng JSON (KHÔNG có markdown, KHÔNG có text nào ngoài mảng JSON):
[
  {
    "title": "Tên mẫu ngữ pháp (ví dụ: ~てみる)",
    "structure": "Cấu trúc (ví dụ: V-て + みる)",
    "meaningVi": "Ý nghĩa tiếng Việt ngắn gọn",
    "explanation": "Giải thích cách dùng bằng tiếng Việt",
    "examples": [
      {
        "japanese": "Câu ví dụ tiếng Nhật",
        "furigana": "Phiên âm hiragana (để trống nếu không có)",
        "vietnamese": "Dịch nghĩa tiếng Việt"
      }
    ]
  }
]`;

      metrics.cardExtractBatches++;
      try {
        const responseText = await callGeminiWithRetry(flashModel, extractionPrompt);
        const jsonStart = responseText.indexOf("[");
        const jsonEnd = responseText.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const batchCards = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
          if (Array.isArray(batchCards)) {
            for (const card of batchCards) {
              if (!card.title || !card.structure || !card.meaningVi) continue;
              const normalizedTitle = card.title.trim().toLowerCase();
              if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                allExtractedCards.push(card);
              }
            }
          }
        }
      } catch (batchError: any) {
        metrics.cardExtractRetries++;
        console.error(`[GrammarService] Lỗi trích xuất trang ${pageRange}:`, batchError);
      }

      if (batchIdx < totalBatches - 1) await extractBucket.acquire();
    }
    metrics.extractDurationMs = Date.now() - extractStart;

    if (allExtractedCards.length > 0) {
      const docRecord = await GrammarDocument.findById(documentId);
      const uploadedBy = docRecord?.uploadedBy || new mongoose.Types.ObjectId();
      const cardDocs = allExtractedCards.map((cardData: any) => ({
        centerId,
        level,
        title: cardData.title.trim(),
        structure: cardData.structure.trim(),
        meaningVi: cardData.meaningVi.trim(),
        explanation: (cardData.explanation || "").trim(),
        examples: Array.isArray(cardData.examples)
          ? cardData.examples
              .filter((ex: any) => ex?.japanese?.trim())
              .map((ex: any) => ({
                japanese: (ex.japanese || "").trim(),
                furigana: (ex.furigana || "").trim(),
                vietnamese: (ex.vietnamese || "").trim(),
              }))
          : [],
        createdBy: uploadedBy,
      }));
      const insertedCards = await GrammarCard.insertMany(cardDocs, { ordered: false });
      metrics.cardsCreated = insertedCards.length;
    }
    logMetrics("extract", metrics, { documentId });
    await notifyStage(documentId, "extract", { status: "processing", chunkCount: metrics.chunksCreated });
    return metrics;
  }

  /**
   * Trích xuất OCR văn bản từ PDF qua FastAPI service, sau đó tạo chunk và vector embeddings lưu vào DB.
   * Fallback in-process khi BullMQ/Redis không khả dụng.
   */
  static async processAndIndexDocument(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string,
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1"
  ): Promise<void> {
    const metrics = newMetrics();
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình trong file BE/.env.");
      }

      await GrammarDocument.findByIdAndUpdate(documentId, { processingStage: "ocr" });
      const ocrStart = Date.now();
      await this.runOcrStage(documentId, fileBuffer, fileName);
      metrics.ocrDurationMs = Date.now() - ocrStart;

      const embedMetrics = await this.runEmbedStage(documentId, centerId, level);
      Object.assign(metrics, embedMetrics);

      const extractMetrics = await this.runExtractStage(documentId, centerId, level);
      metrics.cardsCreated = extractMetrics.cardsCreated;
      metrics.extractDurationMs = extractMetrics.extractDurationMs;

      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "completed",
        processingStage: "done",
      });
      await notifyStage(documentId, "done", { status: "completed" });
      logMetrics("done", metrics, { documentId });

    } catch (error: any) {
      console.error(`[GrammarService] Lỗi trong quá trình xử lý tài liệu:`, error);
      logMetrics("failed", metrics, { documentId, err: error?.message });
      await GrammarDocument.findByIdAndUpdate(documentId, {
        status: "failed",
        processingStage: "failed",
      });
      await notifyStage(documentId, "failed", { status: "failed" });
    }
  }

  /**
   * Thực hiện truy vấn RAG lấy Top K chunks có độ tương đồng cosine cao nhất.
   * Phase 1: cache embedding query theo (centerId, level, query) → giảm quota.
   * Phase 5: thêm documentId? để scope RAG về 1 tài liệu cụ thể.
   */
  static async retrieveRelevantChunks(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    query: string,
    topK = 4,
    documentId?: string
  ): Promise<string[]> {
    try {
      const cacheKey = buildQueryCacheKey(
        documentId ? `${centerId}|${documentId}` : centerId,
        level,
        query
      );
      let queryEmbedding = await getCachedQueryEmbedding(cacheKey);
      if (!queryEmbedding) {
        await extractBucket.acquire();
        const embedResult = await embeddingModel.embedContent(query);
        queryEmbedding = embedResult.embedding.values;
        if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
          await setCachedQueryEmbedding(cacheKey, queryEmbedding);
        }
        extractBucket.reward();
      }

      return hybridRetrieveChunks(
        centerId,
        level,
        query,
        queryEmbedding as number[],
        topK,
        documentId
      );
    } catch (err) {
      console.error("[GrammarService] Lỗi truy vấn RAG chunks:", err);
      return [];
    }
  }

  static async generateDraftGrammarCards(
    centerId: string,
    level: "N5" | "N4" | "N3" | "N2" | "N1",
    topic: string,
    documentId?: string
  ): Promise<{ draftCards: any[]; contextChunksFound: number }> {
    const contexts = await this.retrieveRelevantChunks(centerId, level, topic, 4, documentId);
    const contextString = contexts.length > 0
      ? contexts.join("\n---\n")
      : "(Không tìm thấy tài liệu gốc liên quan trực tiếp. Sử dụng kiến thức chuẩn về ngữ pháp tiếng Nhật để tự động soạn thẻ).";

    // 2. Tạo Prompt gửi Gemini sinh định dạng JSON chuẩn
    const prompt = `
Bạn là một AI chuyên gia giáo dục tiếng Nhật. Hãy biên soạn danh sách các Thẻ Ngữ Pháp (Grammar Cards) dựa trên chủ đề: "${topic}" và tài liệu nguồn đính kèm dưới đây.

Tài liệu nguồn từ trung tâm đào tạo (mức độ ưu tiên cao nhất để làm đúng định dạng giáo trình trung tâm):
"""
${contextString}
"""

Yêu cầu biên soạn:
1. Mỗi thẻ ngữ pháp phải thuộc trình độ: ${level}.
2. Định dạng đầu ra bắt buộc phải là một mảng JSON các object, không có markdown text bao ngoài, theo cấu trúc:
[
  {
    "title": "Tên mẫu ngữ pháp",
    "structure": "Cấu trúc ngữ pháp (ví dụ: V-て + みる)",
    "meaningVi": "Ý nghĩa tiếng Việt ngắn gọn",
    "explanation": "Giải thích ngắn gọn cách dùng và lưu ý bằng tiếng Việt",
    "examples": [
      {
        "japanese": "Câu ví dụ bằng tiếng Nhật (Kanji đầy đủ)",
        "furigana": "Phiên âm Hiragana/Furigana cho câu ví dụ trên",
        "vietnamese": "Dịch nghĩa câu ví dụ sang tiếng Việt"
      }
    ]
  }
]
Biên soạn khoảng 1-3 mẫu ngữ pháp quan trọng nhất liên quan trực tiếp đến chủ đề "${topic}". Hãy đảm bảo JSON hợp lệ, không chứa ký tự lỗi.
`;

    await extractBucket.acquire();
    let result;
    try {
      result = await flashModel.generateContent(prompt);
      extractBucket.reward();
    } catch (err: any) {
      if (err?.status === 429) extractBucket.penalize();
      throw err;
    }
    const responseText = result.response.text().trim();

    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini returned invalid json layout");
      }
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
      return {
        draftCards: JSON.parse(jsonString),
        contextChunksFound: contexts.length,
      };
    } catch (err) {
      console.error("Gemini Card generator JSON parse error. Response raw:", responseText);
      throw new Error("Không thể chuyển đổi kết quả từ AI thành cấu trúc JSON thẻ ngữ pháp.");
    }
  }

  /**
   * Giáo viên chọn mẫu ngữ pháp -> Sinh câu hỏi trắc nghiệm tự động bằng Gemini
   */
  static async generateQuizQuestions(
    grammarCardIds: string[],
    numQuestions = 5
  ): Promise<any[]> {
    // 1. Lấy chi tiết các thẻ ngữ pháp
    const cards = await GrammarCard.find({ _id: { $in: grammarCardIds } });
    if (cards.length === 0) {
      throw new Error("Không tìm thấy các thẻ ngữ pháp tương ứng.");
    }

    const cardsContext = cards.map(c => `
- Ngữ pháp: ${c.title}
  Cấu trúc: ${c.structure}
  Ý nghĩa: ${c.meaningVi}
  Giải thích: ${c.explanation}
  Ví dụ tiêu biểu: ${c.examples.map(ex => ex.japanese + " -> " + ex.vietnamese).join("; ")}
`).join("\n");

    const prompt = `
Bạn là chuyên gia biên soạn đề thi JLPT. Hãy sinh ra ${numQuestions} câu hỏi trắc nghiệm khách quan dạng 4 lựa chọn (Multiple Choice Questions) dựa trên các ngữ pháp tiếng Nhật sau:
${cardsContext}

Yêu cầu câu hỏi:
1. Câu hỏi phải kiểm tra cách sử dụng chính xác cấu trúc ngữ pháp nêu trên.
2. Định dạng đầu ra bắt buộc phải là một mảng JSON các object, không có markdown text bao ngoài, theo cấu trúc:
[
  {
    "grammarCardId": "ID thẻ ngữ pháp tương ứng (hãy dùng một trong các ID sau để gán đúng thẻ: ${grammarCardIds.join(', ')})",
    "questionText": "Câu hỏi tiếng Nhật dạng điền vào chỗ trống (dùng ___ để đại diện chỗ trống)",
    "correctAnswer": 1, // từ 1 đến 4 đại diện cho đáp án đúng
    "answer1": "Lựa chọn 1",
    "answer2": "Lựa chọn 2",
    "answer3": "Lựa chọn 3",
    "answer4": "Lựa chọn 4"
  }
]
Sinh câu hỏi chất lượng cao, các đáp án gây nhiễu hợp lý, chỉ có một đáp án đúng nhất. Đảm bảo JSON hợp lệ.
`;

    const result = await flashModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini returned invalid json layout for questions");
      }
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    } catch (err) {
      console.error("Gemini Quiz generator JSON parse error. Response raw:", responseText);
      throw new Error("Không thể chuyển đổi câu hỏi từ AI thành cấu trúc JSON câu hỏi.");
    }
  }
}
