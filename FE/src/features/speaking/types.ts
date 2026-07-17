export type CoachSeverity = "none" | "minor" | "should_fix" | "important";

/** Grammar feedback shape returned inline by the speaking service
 *  (single LLM call: reply + grammar). */
export type GrammarFeedback = {
  severity: CoachSeverity;
  grammar: string;
  explanation: string;
  suggestion: string;
};

/** Coach review is now derived from GrammarFeedback + the user transcript. */
export type CoachReview = GrammarFeedback & {
  original: string;
};

export type GrammarNoteStatus = "new" | "reviewing" | "mastered";

export type GrammarNote = {
  _id: string;
  turnId?: string;
  sessionId?: string;
  original: string;
  corrected?: string;
  explanationVi?: string;
  tags: string[];
  severity?: CoachSeverity;
  status: GrammarNoteStatus;
  level?: string;
  aiReplyContext?: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveCoachTurn = {
  messageId: string;
  turnId: string;
  transcript: string;
  aiReplyContext?: string;
};
