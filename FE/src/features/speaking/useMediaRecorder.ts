import { useCallback, useRef } from "react";
import type { InteractionMode } from "./useSpeakingPractice";

export type MediaRecorderParams = {
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  modeRef: React.MutableRefObject<InteractionMode>;
  audioChunksRef: React.MutableRefObject<Blob[]>;
  isAwaitingAiRef: React.MutableRefObject<boolean>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  isSessionActiveRef: React.MutableRefObject<boolean>;
  onRequestStop: (blob: Blob) => Promise<void>;
  onResumeListening: () => void;
  setRecordLabel: (v: string) => void;
  setIsRecording: (v: boolean) => void;
  onStreamError: () => void;
};

export type MediaRecorderReturn = {
  startRecording: (stream: MediaStream, timeslice?: number) => boolean;
};

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "",
];

export function useMediaRecorder(p: MediaRecorderParams): MediaRecorderReturn {
  const pRef = useRef(p);
  pRef.current = p;

  const startRecording = useCallback((stream: MediaStream, timeslice?: number): boolean => {
    const track = stream.getAudioTracks()[0];
    if (!track) {
      console.warn("[speaking] no audio tracks in stream, cannot start recorder");
      return false;
    }
    console.debug("[speaking] audio track:", {
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    });
    if (track.readyState !== "live") {
      console.warn("[speaking] audio track not live (", track.readyState, "), cannot start recorder");
      return false;
    }

    const begin = () => {
      for (const mimeType of MIME_CANDIDATES) {
        try {
          const mr = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          pRef.current.mediaRecorderRef.current = mr;

          mr.ondataavailable = (e) => {
            if (e.data.size <= 0) return;
            const { modeRef, audioChunksRef, isAwaitingAiRef, wsRef } = pRef.current;
            if (modeRef.current === "stream" && wsRef.current?.readyState === WebSocket.OPEN && !isAwaitingAiRef.current) {
              wsRef.current.send(e.data);
            } else if (modeRef.current === "request") {
              audioChunksRef.current.push(e.data);
            }
          };

          mr.onstop = async () => {
            const { modeRef, audioChunksRef, isAwaitingAiRef, wsRef } = pRef.current;
            if (modeRef.current === "request") {
              if (audioChunksRef.current.length === 0) {
                isAwaitingAiRef.current = false;
                pRef.current.setRecordLabel("Nhấn giữ để nói");
                pRef.current.setIsRecording(false);
                pRef.current.onResumeListening();
                return;
              }
              const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
              audioChunksRef.current = [];
              try {
                await pRef.current.onRequestStop(blob);
              } catch (err) {
                console.warn("[speaking] onstop sendRequestMode failed:", err);
              }
            } else if (wsRef.current?.readyState === WebSocket.OPEN && isAwaitingAiRef.current) {
              wsRef.current.send(JSON.stringify({ type: "stop_talking" }));
            }
          };

          mr.onerror = () => {
            console.warn("[speaking] MediaRecorder error");
            const { modeRef, isSessionActiveRef } = pRef.current;
            if (modeRef.current === "stream" && isSessionActiveRef.current) {
              pRef.current.onStreamError();
            }
          };

          mr.start(timeslice);
          console.debug("[speaking] MediaRecorder started with mimeType:", mimeType || "(default)", "timeslice:", timeslice ?? "none");
          return true;
        } catch (err) {
          console.warn("[speaking] MediaRecorder start failed for mimeType", mimeType || "(default)", ":", err);
        }
      }
      return false;
    };

    if (track.muted) {
      console.debug("[speaking] track muted, waiting for unmute before start");
      let done = false;
      const cleanup = () => {
        clearTimeout(timer);
        track.removeEventListener("unmute", onUnmute);
      };
      const onUnmute = () => {
        if (done) return;
        done = true;
        cleanup();
        begin();
      };
      const timer = setTimeout(onUnmute, 1500);
      track.addEventListener("unmute", onUnmute);
      return true;
    }

    return begin();
  }, []);

  return { startRecording };
}
