import { useCallback, useEffect, useState } from "react";
import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import { speakingApiPath, speakingAudioUrl } from "./config";

export type SpeakingTopic = {
  title: string;
  title_vi: string;
  prompt_ja: string;
  prompt_vi: string;
};

type UseSpeakingTopicsParams = {
  enabled: boolean;
  level: string;
  onCoachReply: (reply: string, audioUrl?: string | null) => void;
  setLastError?: (msg: string | null) => void;
};

export function useSpeakingTopics({
  enabled,
  level,
  onCoachReply,
  setLastError,
}: UseSpeakingTopicsParams) {
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<SpeakingTopic | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);

  const applyTopics = useCallback((list: SpeakingTopic[] | undefined) => {
    if (Array.isArray(list) && list.length > 0) {
      setTopics(list);
    }
  }, []);

  const refreshTopics = useCallback(async (lv: string = level) => {
    if (!enabled) return;
    try {
      const { data } = await speakingApi.post(speakingApiPath("/topics/suggest"), {
        level: lv,
        count: 5,
      });
      applyTopics(data.topics as SpeakingTopic[]);
    } catch (err) {
      console.warn("[speaking] topics suggest failed:", getSpeakingErrorMessage(err));
    }
  }, [enabled, level, applyTopics]);

  useEffect(() => {
    if (!enabled) return;
    void refreshTopics(level);
  }, [enabled, level, refreshTopics]);

  const startTopic = useCallback(async (topic: SpeakingTopic) => {
    if (!enabled || loadingTopic) return;
    setLoadingTopic(true);
    try {
      const { data } = await speakingApi.post(speakingApiPath("/topics/start"), topic);
      const reply = (data.reply as string) || "";
      const audioUrl = data.audio_url as string | undefined;
      if (data.topic) setActiveTopic(data.topic as SpeakingTopic);
      else setActiveTopic(topic);
      if (reply) onCoachReply(reply, audioUrl);
      if (audioUrl) {
        const player = new Audio(speakingAudioUrl(audioUrl));
        void player.play().catch(() => undefined);
      }
      setLastError?.(null);
      // Refresh suggestions so chips stay fresh after picking one.
      void refreshTopics(level);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      setLastError?.(msg);
    } finally {
      setLoadingTopic(false);
    }
  }, [enabled, loadingTopic, onCoachReply, setLastError, refreshTopics, level]);

  const shuffleTopics = useCallback(() => {
    void refreshTopics(level);
  }, [refreshTopics, level]);

  return {
    topics,
    activeTopic,
    setActiveTopic,
    loadingTopic,
    startTopic,
    shuffleTopics,
    applyTopics,
    refreshTopics,
  };
}
