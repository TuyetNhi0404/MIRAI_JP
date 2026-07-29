import type { ChatMessage } from "./useSpeakingPractice";
import type { CoachReview, GrammarFeedback } from "./types";
import { toReadingLoose } from "./japaneseReading";

/** Tin system ngay sau tin user (ngữ cảnh coach). */
export function getAiReplyAfterUser(
  messages: ChatMessage[],
  userMessageId: string,
): string | undefined {
  const idx = messages.findIndex((m) => m.id === userMessageId);
  if (idx < 0) return undefined;
  for (let i = idx + 1; i < messages.length; i++) {
    if (messages[i].sender === "system" && !messages[i].partial) {
      return messages[i].text;
    }
    if (messages[i].sender === "user") break;
  }
  return undefined;
}

/** Katakana → hiragana so ナンジ ≈ なんじ. */
function katakanaToHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/** Normalize Japanese speech transcripts for fuzzy compare. */
export function normalizeJapaneseTranscript(s: string): string {
  return katakanaToHiragana(
    s
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[ー−–—―]/g, "") // long vowel marks often vary in STT
      .replace(/[\s\u3000、。！？!?,.「」『』（）()\[\]【】・…‥〜~♪★☆♥♡]/g, "")
      .replace(/^(えーと|えっと|あの|あのう|うーん)+/g, "")
      .trim(),
  );
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Bigram Dice coefficient — tolerant to local swaps. */
function diceBigrams(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      set.set(g, (set.get(g) || 0) + 1);
    }
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  let overlap = 0;
  for (const [g, c] of A) overlap += Math.min(c, B.get(g) || 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function pairScore(x: string, y: string): number {
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) {
    const ratio = Math.min(x.length, y.length) / Math.max(x.length, y.length);
    return Math.max(0.82, Math.min(0.98, 0.75 + ratio * 0.23));
  }
  const longer = Math.max(x.length, y.length);
  const lev = 1 - levenshtein(x, y) / longer;
  const dice = diceBigrams(x, y);
  return Math.max(0, Math.min(1, Math.max(lev, dice) * 0.65 + Math.min(lev, dice) * 0.35));
}

/**
 * Fuzzy speech match (0–1). Edit distance + bigrams after JP normalize,
 * also compares loose kana readings so 今何時ですか ≈ いまなんじですか.
 */
export function transcriptSimilarity(heard: string, target: string): number {
  const x = normalizeJapaneseTranscript(heard);
  const y = normalizeJapaneseTranscript(target);
  if (!x || !y) return 0;

  const direct = pairScore(x, y);
  const reading = pairScore(toReadingLoose(x), toReadingLoose(y));
  return Math.max(direct, reading);
}


export const SEVERITY_LABEL: Record<string, string> = {
  none: "Không lỗi",
  minor: "Nhẹ",
  should_fix: "Nên sửa",
  important: "Quan trọng",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  reviewing: "Đang ôn",
  mastered: "Đã thuần",
};

/** Build a CoachReview from inline grammar feedback + the user transcript. */
export function reviewFromFeedback(
  feedback: GrammarFeedback,
  transcript: string,
): CoachReview {
  return {
    ...feedback,
    original: transcript.trim(),
  };
}

/** Có lỗi ngữ pháp đáng ghi nhận (khác câu gốc, không chỉ lỗi nhẹ). */
export function hasGrammarIssue(review: CoachReview): boolean {
  const original = review.original.trim();
  const corrected = (review.suggestion ?? "").trim();
  if (!corrected || original === corrected) return false;
  return review.severity === "should_fix" || review.severity === "important";
}

export function noteFromReview(
  review: CoachReview,
  turnId: string,
  sessionId: string,
  level: string,
  aiReplyContext?: string,
) {
  return {
    turnId,
    sessionId,
    original: review.original.trim(),
    corrected: (review.suggestion ?? "").trim(),
    explanationVi: review.explanation,
    tags: review.grammar ? [review.grammar] : [],
    severity: review.severity,
    level,
    aiReplyContext,
    status: "new" as const,
  };
}
