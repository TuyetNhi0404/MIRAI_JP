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
  const fetchingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTranslation = useCallback(async () => {
    if (!hasJapanese(text)) return;
    if (translationCache.has(text)) {
      setTranslation(translationCache.get(text)!);
      return;
    }
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data } = await speakingApi.post<{ translation: string }>(
        speakingApiPath("/translate"),
        { text },
      );
      const vi = (data.translation || "").trim();
      if (!vi) {
        // Do not cache an empty provider response: it made a bubble display
        // the hover hint forever and prevented later retries.
        setError("Chưa dịch được. Di chuột hoặc chạm lại để thử lại.");
        return;
      }
      translationCache.set(text, vi);
      setTranslation(vi);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      setError(msg);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [text]);

  // A streamed/partial message can keep the same React component while its
  // text changes. Reset its state so a previous failed or cached translation
  // cannot prevent the final user sentence from being translated.
  useEffect(() => {
    prefetchedRef.current = false;
    fetchingRef.current = false;
    setTranslation(translationCache.get(text) ?? null);
    setError(null);
    setLoading(false);
  }, [text]);

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
