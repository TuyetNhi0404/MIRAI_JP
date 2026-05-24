import { useCallback, useRef, useState } from "react";
import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import { speakingApiPath } from "./config";
import type { CoachReview } from "./types";

const reviewCache = new Map<string, CoachReview>();

function cacheKey(transcript: string, level: string): string {
  return `${level}::${transcript.trim()}`;
}

export function useTurnCoach() {
  const [review, setReview] = useState<CoachReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef<string | null>(null);

  const reviewTurn = useCallback(
    async (
      transcript: string,
      level: string,
      history?: string[],
      options?: { silent?: boolean },
    ) => {
      const trimmed = transcript.trim();
      if (!trimmed) {
        if (!options?.silent) setError("Câu trống.");
        return null;
      }

      const key = cacheKey(trimmed, level);
      const cached = reviewCache.get(key);
      if (cached) {
        if (!options?.silent) {
          setReview(cached);
          setError(null);
        }
        return cached;
      }

      if (inflightRef.current === key) return null;
      inflightRef.current = key;
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const { data } = await speakingApi.post<CoachReview>(
          speakingApiPath("/coach/review-turn"),
          { transcript: trimmed, level, history },
        );
        reviewCache.set(key, data);
        if (!options?.silent) setReview(data);
        return data;
      } catch (err) {
        if (!options?.silent) {
          setError(getSpeakingErrorMessage(err));
          setReview(null);
        }
        return null;
      } finally {
        inflightRef.current = null;
        if (!options?.silent) setLoading(false);
      }
    },
    [],
  );

  const clearReview = useCallback(() => {
    setReview(null);
    setError(null);
  }, []);

  return { review, loading, error, reviewTurn, clearReview, setReview };
}
