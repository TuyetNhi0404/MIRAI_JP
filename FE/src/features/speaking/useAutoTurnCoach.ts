import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./useSpeakingPractice";
import type { CoachReview } from "./types";
import {
  getAiReplyAfterUser,
  hasGrammarIssue,
  noteFromReview,
  reviewFromFeedback,
} from "./speakingUtils";
import { hasJapanese } from "./useMessageTranslation";

export type TurnCoachEntry = {
  loading?: boolean;
  review?: CoachReview;
  error?: string;
};

type GrammarNotesApi = {
  hasNoteForTurn: (turnId: string) => boolean;
  saveNote: (note: unknown) => Promise<unknown>;
};

export function useAutoTurnCoach(
  enabled: boolean,
  messages: ChatMessage[],
  level: string,
  sessionId: string,
  grammarNotes: GrammarNotesApi,
) {
  const [byTurnId, setByTurnId] = useState<Record<string, TurnCoachEntry>>({});
  const processedRef = useRef<Set<string>>(new Set());
  const savingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const pending = messages.filter(
      (m) =>
        m.sender === "user" &&
        !m.partial &&
        m.turnId &&
        hasJapanese(m.text) &&
        !processedRef.current.has(m.turnId),
    );

    for (const msg of pending) {
      const turnId = msg.turnId!;

      const feedback = msg.grammarFeedback;
      if (!feedback) {
        // Grammar is produced inline by the speaking service; if absent, skip.
        continue;
      }

      const review = reviewFromFeedback(feedback, msg.text);
      setByTurnId((prev) => ({ ...prev, [turnId]: { review } }));

      if (!hasGrammarIssue(review)) {
        processedRef.current.add(turnId);
        continue;
      }
      if (grammarNotes.hasNoteForTurn(turnId) || savingRef.current.has(turnId)) {
        processedRef.current.add(turnId);
        continue;
      }

      savingRef.current.add(turnId);
      processedRef.current.add(turnId);
      void (async () => {
        try {
          await grammarNotes.saveNote(
            noteFromReview(
              review,
              turnId,
              sessionId,
              level,
              getAiReplyAfterUser(messages, msg.id),
            ),
          );
        } catch {
          /* ignore — user can still see inline suggestion */
        } finally {
          savingRef.current.delete(turnId);
        }
      })();
    }
  }, [enabled, messages, level, sessionId, grammarNotes]);

  const getEntry = (turnId: string) => byTurnId[turnId];

  return { byTurnId, getEntry };
}
