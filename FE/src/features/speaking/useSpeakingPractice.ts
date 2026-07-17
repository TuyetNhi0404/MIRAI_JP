import { useCallback, useEffect, useRef, useState } from "react";
import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import { isSpeakingPracticeEnabled, speakingApiPath, speakingWebSocketUrl } from "./config";
import { useChatMessages } from "./useChatMessages";
import { useAudioPlayback } from "./useAudioPlayback";
import { useSilenceDetection } from "./useSilenceDetection";
import { useRequestMode } from "./useRequestMode";
import { useMediaRecorder } from "./useMediaRecorder";

export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "system";
  partial?: boolean;
  turnId?: string;
  grammarFeedback?: import("./types").GrammarFeedback;
};

export type InteractionMode = "request" | "stream";

export function useSpeakingPractice() {
  // ── Sub-hooks ──────────────────────────────────────────────
  const { messages, api: chat } = useChatMessages();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isSessionActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micReadyRef = useRef(false);
  const micRestartPendingRef = useRef(false);
  const isAwaitingAiRef = useRef(false);
  const micRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingSessionRef = useRef(false);
  const modeRef = useRef<InteractionMode>("request");

  const [level, setLevel] = useState("N5");
  const [score, setScore] = useState(50);
  const [mode, setModeState] = useState<InteractionMode>("request");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [recordLabel, setRecordLabel] = useState("Nhấn giữ để nói");
  const [sessionActive, setSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);
  const [recordDisabled, setRecordDisabled] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioPlayback = useAudioPlayback({
    onQueueEmpty: () => startRecordingTurn(),
    onAudioFinished: () => {
      if (micRestartPendingRef.current && isSessionActiveRef.current) {
        micRestartPendingRef.current = false;
        startRecordingTurn();
      }
    },
  });

  const silence = useSilenceDetection({
    isSessionActiveRef,
    mediaRecorderRef,
    isSpeakingRef,
    silenceTimeoutRef,
    audioContextRef,
    onSilenceTimeout: () => triggerTurnSubmission(),
    setIsUserSpeaking,
    setRecordLabel,
    setAudioLevel,
  });

  const requestMode = useRequestMode({
    chat,
    setLoading,
    setLoadingText,
    setRecordDisabled,
    setRecordLabel,
    setIsRecording,
    setLevel,
    setScore,
    setServiceUnavailable,
    setLastError,
    onResumeListening: () => resumeListeningAfterTurn(),
  });

  const recorder = useMediaRecorder({
    mediaRecorderRef,
    modeRef,
    audioChunksRef,
    isAwaitingAiRef,
    wsRef,
    isSessionActiveRef,
    onRequestStop: requestMode.send,
    onResumeListening: () => resumeListeningAfterTurn(),
    setRecordLabel,
    setIsRecording,
    onStreamError: () => stopStreamingSession(),
  });

  // ── Trigger functions ──────────────────────────────────────
  const triggerTurnSubmission = useCallback(() => {
    if (isAwaitingAiRef.current) return;
    isSpeakingRef.current = false;
    setIsUserSpeaking(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    isAwaitingAiRef.current = true;
    setRecordLabel("Đang suy nghĩ...");
    setIsRecording(false);
    setTypingVisible(true);
    const mr = mediaRecorderRef.current;
    if (mr?.state === "recording") {
      try { mr.stop(); } catch {
        isAwaitingAiRef.current = false;
        setRecordLabel("Hãy nói ngay...");
        setTypingVisible(false);
      }
    } else {
      isAwaitingAiRef.current = false;
      setRecordLabel("Hãy nói ngay...");
      setTypingVisible(false);
    }
  }, []);

  const startRecordingTurn = useCallback(() => {
    if (!isSessionActiveRef.current || isAwaitingAiRef.current) return;
    const tryStart = () => {
      const stream = micStreamRef.current;
      if (!stream || !isSessionActiveRef.current || isAwaitingAiRef.current) return;
      audioChunksRef.current = [];
      isSpeakingRef.current = false;
      setIsUserSpeaking(false);
      chat.clearPartial();
      setRecordLabel("Hãy nói ngay...");
      setIsRecording(true);
      const started = recorder.startRecording(stream, 250);
      if (!started) {
        console.warn("[speaking] stream mode MediaRecorder.start failed, retrying once");
        const fresh = recorder.startRecording(stream, 250);
        if (!fresh) {
          setIsRecording(false);
          setRecordLabel("Lỗi ghi âm — đang thử lại...");
        }
      }
    };
    if (micRestartTimerRef.current) clearTimeout(micRestartTimerRef.current);
    micRestartTimerRef.current = setTimeout(tryStart, 200);
  }, [chat.clearPartial, recorder]);

  const resumeListeningAfterTurn = useCallback(() => {
    if (!isSessionActiveRef.current) return;
    isAwaitingAiRef.current = false;
    setLoading(false);
    setTypingVisible(false);
    setAudioLevel(0);
    micRestartPendingRef.current = true;
    if (!audioPlayback.isPlayingRef.current) {
      micRestartPendingRef.current = false;
      startRecordingTurn();
    }
  }, [startRecordingTurn, audioPlayback]);

  // ── Session lifecycle ──────────────────────────────────────
  const stopStreamingSession = useCallback(() => {
    isSessionActiveRef.current = false;
    isAwaitingAiRef.current = false;
    micRestartPendingRef.current = false;
    chat.resetAiBubble();
    if (micRestartTimerRef.current) { clearTimeout(micRestartTimerRef.current); micRestartTimerRef.current = null; }
    if (silenceTimeoutRef.current) { clearTimeout(silenceTimeoutRef.current); silenceTimeoutRef.current = null; }
    setSessionActive(false);
    setIsRecording(false);
    setIsUserSpeaking(false);
    setTypingVisible(false);
    setAudioLevel(0);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (audioContextRef.current) { void audioContextRef.current.close(); audioContextRef.current = null; }
    wsRef.current?.close();
    wsRef.current = null;
    audioPlayback.stopAll();
    setRecordLabel(modeRef.current === "request" ? "Nhấn giữ để nói" : "Bắt đầu phiên");
    setLoading(false);
    chat.clearPartial();
  }, [chat, audioPlayback]);

  const initWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(speakingWebSocketUrl());
      wsRef.current = ws;
      ws.onopen = () => { audioPlayback.stopAll(); chat.resetAiBubble(); resolve(); };
      ws.onerror = () => reject(new Error("WebSocket error"));
      ws.onclose = () => {
        if (isSessionActiveRef.current) { console.warn("[speaking] WS closed unexpectedly"); stopStreamingSession(); chat.appendMessage("Mất kết nối. Thử lại.", "system"); }
      };
      ws.onmessage = (event) => {
        let data: Record<string, unknown>;
        try { data = JSON.parse(event.data as string); } catch { return; }
        switch (data.type) {
          case "status": setLoading(true); setLoadingText(data.message as string); setTypingVisible(true); break;
          case "transcript_partial": chat.updatePartial(data.text as string); break;
          case "transcript":
            setLoading(false); chat.clearPartial();
            if (data.text) chat.appendMessage(data.text as string, "user", data.grammar_feedback as import("./types").GrammarFeedback);
            else if (data.reply) chat.appendMessage(data.reply as string, "system");
            break;
          case "stats": if (data.level) setLevel(data.level as string); if (data.score !== undefined) setScore(data.score as number); break;
          case "grammar_feedback":
            if (data.grammar_feedback) chat.attachGrammarToLastUser(data.grammar_feedback as import("./types").GrammarFeedback);
            break;
          case "llm_token": setLoading(false); setTypingVisible(false); if (typeof data.text === "string") chat.appendAiToken(data.text); break;
          case "audio_chunk": if (data.url) audioPlayback.queue(data.url as string); break;
          case "done": chat.resetAiBubble(); resumeListeningAfterTurn(); break;
          case "error":
            chat.resetAiBubble(); isAwaitingAiRef.current = false;
            chat.appendMessage((data.message as string) || "Lỗi kết nối streaming.", "system");
            resumeListeningAfterTurn(); break;
        }
      };
    });
  }, [chat, audioPlayback, resumeListeningAfterTurn, stopStreamingSession]);

  const startStreamingSession = useCallback(async () => {
    if (!micReadyRef.current || isSessionActiveRef.current || startingSessionRef.current) return;
    startingSessionRef.current = true;
    isAwaitingAiRef.current = false;
    try {
      await initWebSocket();
      isSessionActiveRef.current = true;
      setSessionActive(true);
      setIsRecording(true);
      setRecordLabel("Hãy nói ngay...");
      const stream = micStreamRef.current;
      if (stream) await silence.start(stream);
      if (stream) recorder.startRecording(stream, 250);
    } catch {
      setServiceUnavailable(true);
      stopStreamingSession();
    } finally {
      startingSessionRef.current = false;
    }
  }, [initWebSocket, silence, stopStreamingSession]);

  // ── Mic init ───────────────────────────────────────────────
  const initMic = useCallback(async () => {
    if (micReadyRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone not supported");
    if (!window.isSecureContext) throw new Error("Microphone requires HTTPS or localhost");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;
    micReadyRef.current = true;
  }, []);

  // ── Mode switch ────────────────────────────────────────────
  const setMode = useCallback(
    (next: InteractionMode) => {
      stopStreamingSession();
      modeRef.current = next;
      setModeState(next);
      setIsRecording(false);
      setIsUserSpeaking(false);
      setAudioLevel(0);
      setRecordLabel(next === "request" ? "Nhấn giữ để nói" : "Bắt đầu phiên");
    },
    [stopStreamingSession],
  );

  const onLevelChange = (lv: string) => {
    if (isSessionActiveRef.current) stopStreamingSession();
    setLevel(lv);
    void resetSession(lv);
  };

  // ── Reset ──────────────────────────────────────────────────
  const resetSession = useCallback(async (newLevel: string) => {
    try {
      const form = new FormData();
      form.append("level", newLevel);
      const { data } = await speakingApi.post(speakingApiPath("/reset"), form);
      setLevel(data.level);
      setScore(data.score);
      chat.resetWelcome();
      setServiceUnavailable(false);
      setLastError(null);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      console.error("[speaking] reset failed:", msg);
      setServiceUnavailable(msg.includes("đăng nhập") ? false : true);
      setLastError(msg);
    }
  }, [chat.api]);

  // ── Pointer handlers ───────────────────────────────────────
  const onRecordPointerDown = async () => {
    if (recordDisabled) return;
    try {
      if (!micReadyRef.current) await initMic();
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Cần quyền micro — cho phép truy cập mic trên trình duyệt rồi thử lại."
          : err instanceof Error ? err.message : "Không mở được micro.";
      setLastError(msg);
      setServiceUnavailable(false);
      return;
    }
    if (modeRef.current === "request") {
      const stream = micStreamRef.current;
      if (!stream) {
        setLastError("Chưa có quyền micro. Thử lại.");
        return;
      }
      audioChunksRef.current = [];
      const started = recorder.startRecording(stream);
      if (!started) {
        setLastError("Không thể bắt đầu ghi âm (MediaRecorder không hỗ trợ). Thử lại hoặc đổi trình duyệt.");
        return;
      }
      setIsRecording(true);
      setRecordLabel("Đang ghi âm...");
      return;
    }
    if (isSessionActiveRef.current) stopStreamingSession();
    else await startStreamingSession();
  };

  const onRecordPointerUp = () => {
    if (modeRef.current !== "request") return;
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    mr.stop();
    setIsRecording(false);
    setRecordLabel("Đang xử lý...");
  };

  const onRecordPointerLeave = () => { onRecordPointerUp(); };

  // ── Lifecycle ──────────────────────────────────────────────
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!isSpeakingPracticeEnabled || didInitRef.current) return;
    didInitRef.current = true;
    void resetSession("N5");
    return () => {
      stopStreamingSession();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [resetSession, stopStreamingSession]);

  const sessionIdRef = useRef(
    `sp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  return {
    enabled: isSpeakingPracticeEnabled,
    sessionId: sessionIdRef.current,
    messages,
    level,
    score,
    mode,
    setMode,
    loading,
    loadingText,
    recordLabel,
    sessionActive,
    isRecording,
    isUserSpeaking,
    typingVisible,
    recordDisabled,
    serviceUnavailable,
    lastError,
    audioLevel,
    onLevelChange,
    onRecordPointerDown,
    onRecordPointerUp,
    onRecordPointerLeave,
  };
}
