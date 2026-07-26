import { useCallback, useRef } from "react";
import { speakingAudioUrl } from "./config";

export type AudioPlaybackParams = {
  onQueueEmpty: () => void;
  onAudioFinished: () => void;
};

export type AudioPlaybackReturn = {
  queue: (relativeUrl: string) => void;
  stopAll: () => void;
  isPlayingRef: React.MutableRefObject<boolean>;
};

export function useAudioPlayback({ onQueueEmpty, onAudioFinished }: AudioPlaybackParams): AudioPlaybackReturn {
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentPlayerRef = useRef<HTMLAudioElement | null>(null);
  const onQueueEmptyRef = useRef(onQueueEmpty);
  onQueueEmptyRef.current = onQueueEmpty;
  const onAudioFinishedRef = useRef(onAudioFinished);
  onAudioFinishedRef.current = onAudioFinished;

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      const wasPlaying = isPlayingRef.current;
      isPlayingRef.current = false;
      currentPlayerRef.current = null;
      onQueueEmptyRef.current();
      if (wasPlaying) onAudioFinishedRef.current();
      return;
    }
    isPlayingRef.current = true;
    const url = audioQueueRef.current.shift()!;
    const player = new Audio(url);
    currentPlayerRef.current = player;
    player.play().catch(() => {});
    player.onended = () => playNextInQueue();
    player.onerror = () => playNextInQueue();
  }, []);

  const queue = useCallback(
    (relativeUrl: string) => {
      audioQueueRef.current.push(speakingAudioUrl(relativeUrl));
      if (!isPlayingRef.current) playNextInQueue();
    },
    [playNextInQueue],
  );

  const stopAll = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (currentPlayerRef.current) {
      currentPlayerRef.current.pause();
      currentPlayerRef.current.src = "";
      currentPlayerRef.current = null;
    }
  }, []);

  return { queue, stopAll, isPlayingRef };
}
