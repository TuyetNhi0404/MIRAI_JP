import type { ChatMessage } from "./useSpeakingPractice";
import type { CoachReview } from "./types";

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

/** Lịch sử vài câu gần nhất cho coach API. */
export function buildCoachHistory(messages: ChatMessage[], limit = 6): string[] {
  return messages
    .filter((m) => !m.partial && m.text.trim())
    .slice(-limit)
    .map((m) => `${m.sender === "user" ? "User" : "AI"}: ${m.text}`);
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
  minor: "Nhẹ",
  should_fix: "Nên sửa",
  important: "Quan trọng",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  reviewing: "Đang ôn",
  mastered: "Đã thuần",
};

/** Có lỗi ngữ pháp đáng ghi nhận (khác câu gốc, không chỉ lỗi nhẹ). */
export function hasGrammarIssue(review: CoachReview): boolean {
  const original = review.original.trim();
  const corrected = review.corrected.trim();
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
    corrected: review.corrected.trim(),
    explanationVi: review.explanation_vi,
    tags: review.tags ?? [],
    severity: review.severity,
    level,
    aiReplyContext,
    status: "new" as const,
  };
}
