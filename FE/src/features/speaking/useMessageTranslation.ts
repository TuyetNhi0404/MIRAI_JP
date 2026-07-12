import { useCallback, useEffect, useRef, useState } from "react";
import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import { speakingApiPath } from "./config";

const translationCache = new Map<string, string>();

/** Japanese script — skip API for non-Japanese bubbles (errors, etc.) */
export function hasJapanese(text: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FFF]/.test(text);
}

export function useMessageTranslation(text: string) {
  const [translation, setTranslation] = useState<string | null>(
    () => translationCache.get(text) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTranslation = useCallback(async () => {
    if (!hasJapanese(text)) return;
    if (translationCache.has(text)) {
      setTranslation(translationCache.get(text)!);
      return;
    }
    if (loading) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await speakingApi.post<{ translation: string }>(
        speakingApiPath("/translate"),
        { text },
      );
      const vi = (data.translation || "").trim();
      translationCache.set(text, vi);
      setTranslation(vi);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [text, loading]);

  useEffect(() => {
    if (prefetchedRef.current) return;
    if (!hasJapanese(text)) return;
    if (translationCache.has(text)) return;

    timeoutRef.current = setTimeout(() => {
      prefetchedRef.current = true;
      fetchTranslation();
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, fetchTranslation]);

  return { translation, loading, error, fetchTranslation, translatable: hasJapanese(text) };
}
