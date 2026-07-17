import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "./useSpeakingPractice";
import type { GrammarFeedback } from "./types";

export type ChatMessagesApi = {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  appendMessage: (text: string, sender: "user" | "system", grammarFeedback?: GrammarFeedback) => void;
  updatePartial: (text: string) => void;
  clearPartial: () => void;
  appendAiToken: (token: string) => void;
  resetAiBubble: () => void;
  resetWelcome: () => void;
  attachGrammarFeedback: (msgId: string, feedback: GrammarFeedback) => void;
  attachGrammarToLastUser: (feedback: GrammarFeedback) => void;
};

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "こんにちは！料理、旅行、映画、趣味など、何について話したいですか？",
      sender: "system",
    },
  ]);

  const partialIdRef = useRef<string | null>(null);
  const currentAiTextRef = useRef("");
  const currentAiIdRef = useRef<string | null>(null);

  const appendMessage = useCallback(
    (text: string, sender: "user" | "system", grammarFeedback?: GrammarFeedback) => {
      const id = `${Date.now()}-${Math.random()}`;
      setMessages((prev) => [
        ...prev,
        {
          id,
          text,
          sender,
          ...(sender === "user" ? { turnId: id } : {}),
          ...(sender === "user" && grammarFeedback ? { grammarFeedback } : {}),
        },
      ]);
    },
    [],
  );

  const updatePartial = useCallback((text: string) => {
    const id = partialIdRef.current || `partial-${Date.now()}`;
    partialIdRef.current = id;
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === id);
      if (exists) {
        return prev.map((m) => (m.id === id ? { ...m, text } : m));
      }
      return [...prev, { id, text, sender: "user", partial: true }];
    });
  }, []);

  const clearPartial = useCallback(() => {
    if (!partialIdRef.current) return;
    const id = partialIdRef.current;
    partialIdRef.current = null;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const appendAiToken = useCallback((token: string) => {
    currentAiTextRef.current += token;
    const id = currentAiIdRef.current || `ai-${Date.now()}`;
    currentAiIdRef.current = id;
    const text = currentAiTextRef.current;
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === id);
      if (exists) {
        return prev.map((m) => (m.id === id ? { ...m, text } : m));
      }
      return [...prev, { id, text, sender: "system" }];
    });
  }, []);

  const resetAiBubble = useCallback(() => {
    currentAiTextRef.current = "";
    currentAiIdRef.current = null;
  }, []);

  const resetWelcome = useCallback(() => {
    setMessages([
      {
        id: "welcome-reset",
        text: "こんにちは！料理、旅行、映画、趣味など、何について話したいですか？",
        sender: "system",
      },
    ]);
  }, []);

  const attachGrammarFeedback = useCallback(
    (msgId: string, feedback: GrammarFeedback) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, grammarFeedback: feedback } : m)),
      );
    },
    [],
  );

  const attachGrammarToLastUser = useCallback((feedback: GrammarFeedback) => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].sender === "user" && prev[i].turnId && !prev[i].partial) {
          if (prev[i].grammarFeedback) return prev;
          return prev.map((m, idx) =>
            idx === i ? { ...m, grammarFeedback: feedback } : m,
          );
        }
      }
      return prev;
    });
  }, []);

  // Stable API reference — never changes across renders
  const api: ChatMessagesApi = useMemo(
    () => ({
      setMessages,
      appendMessage,
      updatePartial,
      clearPartial,
      appendAiToken,
      resetAiBubble,
      resetWelcome,
      attachGrammarFeedback,
      attachGrammarToLastUser,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { messages, api };
}
