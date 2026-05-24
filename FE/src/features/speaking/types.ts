export type CoachSeverity = "minor" | "should_fix" | "important";

export type CoachReview = {
  original: string;
  corrected: string;
  explanation_vi: string;
  severity: CoachSeverity;
  tags: string[];
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
