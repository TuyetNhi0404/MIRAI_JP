import { useCallback, useEffect, useRef, useState } from "react";
import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import {
  isSpeakingPracticeEnabled,
  speakingApiPath,
  speakingAudioUrl,
  speakingWebSocketUrl,
} from "./config";

export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "system";
  partial?: boolean;
  /** ID lượt nói (tin user final) — dùng cho sổ lỗi / coach */
  turnId?: string;
};

export type InteractionMode = "request" | "stream";

const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION = 800;

export function useSpeakingPractice() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "こんにちは！料理、旅行、映画、趣味など、何について話したいですか？",
      sender: "system",
    },
  ]);
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

  const modeRef = useRef<InteractionMode>("request");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAiTextRef = useRef("");
  const currentAiIdRef = useRef<string | null>(null);
  const partialIdRef = useRef<string | null>(null);
  const micReadyRef = useRef(false);
  const micRestartPendingRef = useRef(false);
  const isAwaitingAiRef = useRef(false);
  const micRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(
    `sp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  const syncModeRef = (m: InteractionMode) => {
    modeRef.current = m;
  };

  const appendMessage = useCallback((text: string, sender: "user" | "system") => {
    const id = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        text,
        sender,
        ...(sender === "user" ? { turnId: id } : {}),
      },
    ]);
  }, []);

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

  const setupMediaRecorderRef = useRef<(stream: MediaStream) => void>(() => undefined);

  const startRecordingTurn = useCallback(() => {
    if (!isSessionActiveRef.current || isAwaitingAiRef.current) return;

    const tryStart = () => {
      const mr = mediaRecorderRef.current;
      if (!mr || !isSessionActiveRef.current || isAwaitingAiRef.current) return;
      if (mr.state === "recording") return;

      audioChunksRef.current = [];
      isSpeakingRef.current = false;
      setIsUserSpeaking(false);
      clearPartial();
      setRecordLabel("Hãy nói ngay...");
      setIsRecording(true);

      try {
        mr.start(250);
      } catch (err) {
        console.warn("[speaking] MediaRecorder.start failed, recreating:", err);
        const stream = micStreamRef.current;
        if (stream) setupMediaRecorderRef.current(stream);
        const fresh = mediaRecorderRef.current;
        if (fresh && fresh.state === "inactive") {
          fresh.start(250);
        }
      }
    };

    if (micRestartTimerRef.current) {
      clearTimeout(micRestartTimerRef.current);
    }
    micRestartTimerRef.current = setTimeout(tryStart, 200);
  }, [clearPartial]);

  /** Sau mỗi lượt AI: chờ TTS (nếu có) rồi luôn mở mic lượt tiếp theo. */
  const resumeListeningAfterTurn = useCallback(() => {
    if (!isSessionActiveRef.current) return;

    isAwaitingAiRef.current = false;
    setLoading(false);
    setTypingVisible(false);
    setAudioLevel(0);
    micRestartPendingRef.current = true;

    if (isPlayingRef.current || audioQueueRef.current.length > 0) {
      return;
    }

    micRestartPendingRef.current = false;
    startRecordingTurn();
  }, [startRecordingTurn]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      if (micRestartPendingRef.current && isSessionActiveRef.current) {
        micRestartPendingRef.current = false;
        startRecordingTurn();
      }
      return;
    }
    isPlayingRef.current = true;
    const url = audioQueueRef.current.shift()!;
    const player = new Audio(url);
    void player.play();
    player.onended = () => playNextInQueue();
    player.onerror = () => playNextInQueue();
  }, [startRecordingTurn]);

  const queueAudio = useCallback(
    (relativeUrl: string) => {
      audioQueueRef.current.push(speakingAudioUrl(relativeUrl));
      if (!isPlayingRef.current) playNextInQueue();
    },
    [playNextInQueue],
  );

  const appendAiToken = useCallback((token: string) => {
    setTypingVisible(false);
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

  const resetSession = useCallback(async (newLevel: string) => {
    try {
      const form = new FormData();
      form.append("level", newLevel);
      const { data } = await speakingApi.post(speakingApiPath("/reset"), form);
      setLevel(data.level);
      setScore(data.score);
      setMessages([
        {
          id: "welcome-reset",
          text: "こんにちは！料理、旅行、映画、趣味など、何について話したいですか？",
          sender: "system",
        },
      ]);
      setServiceUnavailable(false);
      setLastError(null);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      console.error("[speaking] reset failed:", msg);
      if (msg.includes("đăng nhập")) {
        setLastError(msg);
      } else {
        setServiceUnavailable(true);
        setLastError(msg);
      }
    }
  }, []);

  const sendRequestMode = useCallback(
    async (blob: Blob) => {
      setLoading(true);
      setRecordDisabled(true);
      setLoadingText("Transcribing...");
      const form = new FormData();
      form.append("audio_file", blob, "recording.webm");
      try {
        // One endpoint runs STT → coaching → reply → TTS. Previously request
        // mode made two sequential HTTP requests (/transcribe then /reply).
        const { data } = await speakingApi.post(speakingApiPath("/conversation"), form);
        const transcript = data.transcript as string;
        if (!transcript) {
          if (data.reply) appendMessage(data.reply as string, "system");
          return;
        }
        appendMessage(transcript, "user");
        setTypingVisible(true);
        setLoadingText("Thinking...");
        setTypingVisible(false);
        const { reply, audio_url, level: lv, score: sc } = data;
        if (lv) setLevel(lv);
        if (sc !== undefined) setScore(sc);
        if (reply) appendMessage(reply, "system");
        if (audio_url) {
          const player = new Audio(speakingAudioUrl(audio_url));
          void player.play();
        }
        setLastError(null);
      } catch (err) {
        const msg = getSpeakingErrorMessage(err);
        console.error("[speaking] request mode failed:", err);
        setServiceUnavailable(true);
        setLastError(msg);
        appendMessage(msg, "system");
      } finally {
        setLoading(false);
        setRecordDisabled(false);
        setRecordLabel("Nhấn giữ để nói");
        setIsRecording(false);
      }
    },
    [appendMessage],
  );

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
      try {
        mr.stop();
      } catch {
        isAwaitingAiRef.current = false;
      }
    } else {
      isAwaitingAiRef.current = false;
    }
  }, []);

  const startSilenceDetection = useCallback(async () => {
    const stream = micStreamRef.current;
    if (!stream) return;
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    analyser.fftSize = 512;
    const data = new Float32Array(analyser.frequencyBinCount);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    let smoothedLevel = 0;

    const check = () => {
      if (!isSessionActiveRef.current) {
        setAudioLevel(0);
        return;
      }
      analyser.getFloatTimeDomainData(data);
      analyser.getByteFrequencyData(freqData);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      let freqSum = 0;
      const lowerHalf = Math.floor(freqData.length * 0.5);
      for (let i = 0; i < lowerHalf; i++) freqSum += freqData[i];
      const freqAvg = freqSum / lowerHalf / 255;
      const target = Math.min(1, Math.max(rms * 6, freqAvg));
      smoothedLevel += (target - smoothedLevel) * 0.18;
      setAudioLevel(smoothedLevel);
      const mr = mediaRecorderRef.current;

      if (rms > SILENCE_THRESHOLD) {
        if (!isSpeakingRef.current && mr?.state === "recording") {
          isSpeakingRef.current = true;
          setIsUserSpeaking(true);
          setRecordLabel("Đang lắng nghe...");
        }
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else if (
        isSpeakingRef.current &&
        mr?.state === "recording" &&
        !silenceTimeoutRef.current
      ) {
        silenceTimeoutRef.current = setTimeout(triggerTurnSubmission, SILENCE_DURATION);
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }, [triggerTurnSubmission]);

  const stopStreamingSession = useCallback(() => {
    isSessionActiveRef.current = false;
    isAwaitingAiRef.current = false;
    micRestartPendingRef.current = false;
    if (micRestartTimerRef.current) {
      clearTimeout(micRestartTimerRef.current);
      micRestartTimerRef.current = null;
    }
    setSessionActive(false);
    setIsRecording(false);
    setIsUserSpeaking(false);
    setTypingVisible(false);
    setAudioLevel(0);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setRecordLabel(modeRef.current === "request" ? "Nhấn giữ để nói" : "Bắt đầu phiên");
    setLoading(false);
    clearPartial();
  }, [clearPartial]);

  const initWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(speakingWebSocketUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        audioQueueRef.current = [];
        resetAiBubble();
        resolve();
      };
      ws.onerror = () => reject(new Error("WebSocket error"));
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string);
        switch (data.type) {
          case "status":
            setLoading(true);
            setLoadingText(data.message);
            setTypingVisible(true);
            break;
          case "transcript_partial":
            updatePartial(data.text);
            break;
          case "transcript":
            setLoading(false);
            clearPartial();
            if (data.text) {
              appendMessage(data.text, "user");
            } else if (data.reply) {
              appendMessage(data.reply as string, "system");
            }
            break;
          case "stats":
            if (data.level) setLevel(data.level);
            if (data.score !== undefined) setScore(data.score);
            break;
          case "llm_token":
            setLoading(false);
            setTypingVisible(false);
            appendAiToken(data.text);
            break;
          case "audio_chunk":
            if (data.url) queueAudio(data.url);
            break;
          case "done":
            resetAiBubble();
            resumeListeningAfterTurn();
            break;
          case "error":
            isAwaitingAiRef.current = false;
            appendMessage(
              (data.message as string) || "Lỗi kết nối streaming.",
              "system",
            );
            resumeListeningAfterTurn();
            break;
        }
      };
    });
  }, [
    appendAiToken,
    appendMessage,
    clearPartial,
    queueAudio,
    resetAiBubble,
    resumeListeningAfterTurn,
    stopStreamingSession,
    updatePartial,
  ]);

  const startStreamingSession = useCallback(async () => {
    if (!micReadyRef.current) return;
    try {
      await initWebSocket();
      isSessionActiveRef.current = true;
      setSessionActive(true);
      setIsRecording(true);
      setRecordLabel("Hãy nói ngay...");
      await startSilenceDetection();
      mediaRecorderRef.current?.start(250);
    } catch {
      setServiceUnavailable(true);
      stopStreamingSession();
    }
  }, [initWebSocket, startSilenceDetection, stopStreamingSession]);

  const setupMediaRecorder = useCallback(
    (stream: MediaStream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size <= 0) return;
        if (
          modeRef.current === "stream" &&
          wsRef.current?.readyState === WebSocket.OPEN &&
          !isAwaitingAiRef.current
        ) {
          wsRef.current.send(e.data);
        } else if (modeRef.current === "request") {
          audioChunksRef.current.push(e.data);
        }
      };
      mr.onstop = async () => {
        if (modeRef.current === "request") {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          audioChunksRef.current = [];
          await sendRequestMode(blob);
        } else if (
          wsRef.current?.readyState === WebSocket.OPEN &&
          isAwaitingAiRef.current
        ) {
          wsRef.current.send(JSON.stringify({ type: "stop_talking" }));
        }
      };
    },
    [sendRequestMode],
  );

  setupMediaRecorderRef.current = setupMediaRecorder;

  const initMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone not supported");
    }
    if (!window.isSecureContext) {
      throw new Error("Microphone requires HTTPS or localhost");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;
    setupMediaRecorder(stream);
    micReadyRef.current = true;
  }, [setupMediaRecorder]);

  /** Chỉ ping session — mic xin quyền khi user bấm ghi (tránh lỗi giả "service chưa chạy"). */
  useEffect(() => {
    if (!isSpeakingPracticeEnabled) return;
    void resetSession("N5");
    return () => {
      stopStreamingSession();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [resetSession, stopStreamingSession]);

  const setMode = useCallback(
    (next: InteractionMode) => {
      stopStreamingSession();
      syncModeRef(next);
      setModeState(next);
      setIsRecording(false);
      setIsUserSpeaking(false);
      setAudioLevel(0);
      setRecordLabel(next === "request" ? "Nhấn giữ để nói" : "Bắt đầu phiên");
    },
    [stopStreamingSession],
  );

  const onLevelChange = (lv: string) => {
    setLevel(lv);
    void resetSession(lv);
  };

  /** Request: hold down. Stream: click to toggle session. */
  const onRecordPointerDown = async () => {
    if (recordDisabled) return;
    try {
      if (!micReadyRef.current) await initMic();
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Cần quyền micro — cho phép truy cập mic trên trình duyệt rồi thử lại."
          : err instanceof Error
            ? err.message
            : "Không mở được micro.";
      setLastError(msg);
      setServiceUnavailable(false);
      return;
    }

    if (modeRef.current === "request") {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "recording") return;
      audioChunksRef.current = [];
      mr.start();
      setIsRecording(true);
      setRecordLabel("Đang ghi âm...");
      return;
    }

    if (isSessionActiveRef.current) {
      stopStreamingSession();
    } else {
      await startStreamingSession();
    }
  };

  const onRecordPointerUp = () => {
    if (modeRef.current !== "request") return;
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    mr.stop();
    setIsRecording(false);
    setRecordLabel("Đang xử lý...");
  };

  const onRecordPointerLeave = () => {
    onRecordPointerUp();
  };

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
