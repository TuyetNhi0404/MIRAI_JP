import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./useSpeakingPractice";
import type { CoachReview } from "./types";
import {
  buildCoachHistory,
  getAiReplyAfterUser,
  hasGrammarIssue,
  noteFromReview,
} from "./speakingUtils";
import { hasJapanese } from "./useMessageTranslation";
import { useTurnCoach } from "./useTurnCoach";
import type { useGrammarNotes } from "./useGrammarNotes";

export type TurnCoachEntry = {
  loading?: boolean;
  review?: CoachReview;
  error?: string;
};

type GrammarNotesApi = ReturnType<typeof useGrammarNotes>;

export function useAutoTurnCoach(
  enabled: boolean,
  messages: ChatMessage[],
  level: string,
  sessionId: string,
  grammarNotes: GrammarNotesApi,
) {
  const { reviewTurn } = useTurnCoach();
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
      processedRef.current.add(turnId);
      setByTurnId((prev) => ({ ...prev, [turnId]: { loading: true } }));

      void (async () => {
        const history = buildCoachHistory(messages);
        const review = await reviewTurn(msg.text, level, history, { silent: true });

        if (!review) {
          setByTurnId((prev) => ({
            ...prev,
            [turnId]: { error: "Không phân tích được câu này." },
          }));
          return;
        }

        setByTurnId((prev) => ({ ...prev, [turnId]: { review } }));

        if (!hasGrammarIssue(review)) return;
        if (grammarNotes.hasNoteForTurn(turnId) || savingRef.current.has(turnId)) return;

        savingRef.current.add(turnId);
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
  }, [enabled, messages, level, sessionId, grammarNotes, reviewTurn]);

  const getEntry = (turnId: string) => byTurnId[turnId];

  return { byTurnId, getEntry };
}
