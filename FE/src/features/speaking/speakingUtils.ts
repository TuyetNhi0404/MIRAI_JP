import type { ChatMessage } from "./useSpeakingPractice";
import type { CoachReview, GrammarFeedback } from "./types";

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

/** So khớp đơn giản sau khi luyện nói lại (0–1). */
export function transcriptSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s\u3000、。！？]/g, "")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const longer = Math.max(x.length, y.length);
  let matches = 0;
  const minLen = Math.min(x.length, y.length);
  for (let i = 0; i < minLen; i++) {
    if (x[i] === y[i]) matches++;
  }
  return matches / longer;
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
