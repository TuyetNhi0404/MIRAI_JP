import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Check, Mic, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import speakingApi from "./speakingApi";
import { speakingApiPath } from "./config";
import type { GrammarNote } from "./types";
import { sp } from "./speakingPracticeTheme";
import { transcriptSimilarity } from "./speakingUtils";
import { toHiraganaReading, toPracticeRomaji } from "./japaneseReading";

const RECORD_MS = 5000;
const PASS_SCORE = 0.72;

type Phase = "idle" | "recording" | "processing" | "done";

type NotePracticeDialogProps = {
  note: GrammarNote | null;
  open: boolean;
  onClose: () => void;
  onMastered: (id: string) => void;
};

export function NotePracticeDialog({ note, open, onClose, onMastered }: NotePracticeDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<{ score: number; heard: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef(0);

  const cleanupAudio = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupAudio();
      setPhase("idle");
      setResult(null);
      setError(null);
      setLevel(0);
      setElapsed(0);
    }
  }, [open, cleanupAudio]);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  const startMeter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let smooth = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const next = Math.min(1, sum / data.length / 80);
      smooth += (next - smooth) * 0.22;
      setLevel(smooth);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const evaluateBlob = useCallback(
    async (blob: Blob) => {
      if (!note?.corrected) return;
      setPhase("processing");
      const form = new FormData();
      form.append("audio_file", blob, "practice.webm");
      try {
        const { data } = await speakingApi.post<{ transcript: string }>(
          speakingApiPath("/transcribe"),
          form,
        );
        const heard = (data.transcript || "").trim();
        const target = note.corrected || "";
        const score = transcriptSimilarity(heard, target);
        setResult({ score, heard });
        setPhase("done");
        if (score >= PASS_SCORE) onMastered(note._id);
      } catch {
        setError("Không nhận dạng được giọng nói. Thử lại nhé.");
        setPhase("idle");
      }
    },
    [note, onMastered],
  );

  const stopRecording = useCallback(() => {
    const mr = mrRef.current;
    if (mr && mr.state === "recording") {
      try {
        if (typeof mr.requestData === "function") mr.requestData();
      } catch {
        /* ignore */
      }
      mr.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startPractice = useCallback(async () => {
    if (!note?.corrected || phase === "recording" || phase === "processing") return;
    setError(null);
    setResult(null);
    setElapsed(0);
    setLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        cleanupAudio();
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        if (blob.size < 200) {
          setError("Chưa ghi được âm thanh. Giữ mic gần hơn và thử lại.");
          setPhase("idle");
          return;
        }
        await evaluateBlob(blob);
      };
      mr.start(200);
      setPhase("recording");
      startedAtRef.current = Date.now();
      startMeter(stream);
      tickRef.current = setInterval(() => {
        setElapsed(Math.min(RECORD_MS, Date.now() - startedAtRef.current));
      }, 50);
      timerRef.current = setTimeout(() => stopRecording(), RECORD_MS);
    } catch {
      setError("Không truy cập được micro. Cho phép quyền mic rồi thử lại.");
      setPhase("idle");
    }
  }, [cleanupAudio, evaluateBlob, note, phase, startMeter, stopRecording]);

  const handleClose = () => {
    stopRecording();
    cleanupAudio();
    setPhase("idle");
    setResult(null);
    setError(null);
    onClose();
  };

  if (!note) return null;

  const progress = elapsed / RECORD_MS;
  const passed = (result?.score ?? 0) >= PASS_SCORE;
  const bars = [0.35, 0.55, 0.8, 1, 0.75, 0.5, 0.4];
  const sampleJa = note.corrected || "";
  const sampleHiragana = toHiraganaReading(sampleJa);
  const sampleRomaji = toPracticeRomaji(sampleJa);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: `${sp.radiusXl}px`,
          border: `1px solid ${sp.hairline}`,
          boxShadow: sp.shadowLg,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
          fontWeight: 700,
          fontSize: "1.05rem",
          color: sp.text,
        }}
      >
        Luyện nói lại
        <IconButton size="small" onClick={handleClose} aria-label="Đóng" sx={{ color: sp.textMuted }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 2.5 }}>
        <Typography variant="caption" sx={{ color: sp.textMuted, fontWeight: 500 }}>
          Đọc to câu mẫu · tối đa ~{RECORD_MS / 1000} giây
        </Typography>

        <Box
          sx={{
            mt: 1.25,
            mb: 2,
            px: 1.75,
            py: 1.75,
            borderRadius: `${sp.radiusMd}px`,
            bgcolor: sp.brandTint,
            border: `1px solid ${sp.brandBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 700,
              fontSize: "1.35rem",
              lineHeight: 1.45,
              color: sp.brand,
              letterSpacing: "0.02em",
            }}
          >
            {note.corrected}
          </Typography>
          {sampleRomaji && (
              <Stack spacing={0.35} sx={{ mt: 1 }}>
                {sampleHiragana && sampleHiragana !== sampleJa.trim() && (
                  <Typography
                    sx={{
                      fontFamily: '"Noto Sans JP", sans-serif',
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      color: sp.brandMid,
                      letterSpacing: "0.04em",
                      lineHeight: 1.4,
                    }}
                  >
                    {sampleHiragana}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontFamily: '"Inter", "Segoe UI", sans-serif',
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: sp.text,
                    letterSpacing: "0.02em",
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                  aria-label={`Romaji: ${sampleRomaji}`}
                >
                  {sampleRomaji}
                </Typography>
              </Stack>
            )}
        </Box>

        {/* Visualizer / status */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.25,
            mb: 1.75,
            minHeight: 72,
          }}
        >
          {phase === "recording" && (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 0.6,
                  height: 36,
                  "@keyframes note-bar": {
                    "0%, 100%": { transform: "scaleY(0.45)" },
                    "50%": { transform: "scaleY(1)" },
                  },
                }}
                aria-hidden
              >
                {bars.map((base, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 5,
                      height: 36,
                      borderRadius: 99,
                      bgcolor: sp.brand,
                      opacity: 0.55 + level * 0.45,
                      transformOrigin: "bottom",
                      transform: `scaleY(${Math.max(0.2, base * (0.35 + level * 0.9))})`,
                      animation: "note-bar 0.9s ease-in-out infinite",
                      animationDelay: `${i * 0.08}s`,
                      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ width: "100%", maxWidth: 260 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "rgba(185,0,0,0.08)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: sp.brand,
                      transition: "transform 50ms linear",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ display: "block", textAlign: "center", mt: 0.5, color: sp.textMuted }}
                >
                  Đang nghe… {Math.max(0, Math.ceil((RECORD_MS - elapsed) / 1000))}s
                </Typography>
              </Box>
            </>
          )}

          {phase === "processing" && (
            <Stack alignItems="center" spacing={1} sx={{ width: "100%", maxWidth: 260 }}>
              <LinearProgress
                sx={{
                  width: "100%",
                  height: 4,
                  borderRadius: 2,
                  bgcolor: "rgba(185,0,0,0.08)",
                  "& .MuiLinearProgress-bar": { bgcolor: sp.brand },
                }}
              />
              <Typography variant="caption" sx={{ color: sp.textMuted, fontWeight: 500 }}>
                Đang nhận dạng câu nói…
              </Typography>
            </Stack>
          )}

          {phase === "done" && result && (
            <Box
              sx={{
                width: "100%",
                px: 1.5,
                py: 1.35,
                borderRadius: `${sp.radiusMd}px`,
                bgcolor: passed ? sp.successSoft : sp.warnSoft,
                border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(217,119,6,0.28)"}`,
                animation: "note-fade-in 0.28s ease-out",
                "@keyframes note-fade-in": {
                  from: { opacity: 0, transform: "translateY(6px)" },
                  to: { opacity: 1, transform: "translateY(0)" },
                },
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                {passed ? (
                  <Check size={16} color={sp.success} strokeWidth={2.5} />
                ) : (
                  <RotateCcw size={15} color={sp.warn} strokeWidth={2.4} />
                )}
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: sp.text }}>
                  Độ khớp {Math.round(result.score * 100)}%
                  {passed ? " · Đạt!" : " · Thử lại nhé"}
                </Typography>
              </Stack>
              <Box sx={{ width: "100%", mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(result.score * 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "rgba(15,23,42,0.06)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: passed ? sp.success : sp.warn,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: sp.textMuted, fontSize: "0.8rem" }}>
                Nghe được:{" "}
                <Box
                  component="span"
                  sx={{ fontFamily: '"Noto Sans JP", sans-serif', color: sp.text, fontWeight: 600 }}
                >
                  {result.heard || "Chưa rõ"}
                </Box>
              </Typography>
              {passed && (
                <Typography variant="caption" sx={{ color: sp.success, fontWeight: 600, mt: 0.5, display: "block" }}>
                  Đã đánh dấu thuần thục cho ghi chú này.
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={1} justifyContent="center">
          {phase === "recording" ? (
            <Box
              component="button"
              type="button"
              onClick={stopRecording}
              sx={{
                border: "none",
                borderRadius: sp.radiusPill,
                px: 3,
                py: 1.15,
                minHeight: 44,
                bgcolor: sp.brand,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                boxShadow: sp.shadowBrand,
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: -3,
                  borderRadius: sp.radiusPill,
                  border: `2px solid ${sp.brandBorder}`,
                  animation: "speaking-pulse 1.5s ease-out infinite",
                  pointerEvents: "none",
                },
                "@keyframes speaking-pulse": {
                  "0%": { opacity: 0.85, transform: "scale(1)" },
                  "100%": { opacity: 0, transform: "scale(1.08)" },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  "&::before": { animation: "none" },
                },
              }}
            >
              <Square size={15} fill="currentColor" />
              Dừng lại
            </Box>
          ) : (
            <Box
              component="button"
              type="button"
              disabled={phase === "processing"}
              onClick={() => void startPractice()}
              sx={{
                border: "none",
                borderRadius: sp.radiusPill,
                px: 3,
                py: 1.15,
                minHeight: 44,
                bgcolor: phase === "processing" ? sp.textFaint : sp.brand,
                color: "#fff",
                fontWeight: 700,
                cursor: phase === "processing" ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                boxShadow: phase === "processing" ? "none" : sp.shadowBrand,
                transition: sp.transition,
                "&:hover:not(:disabled)": { filter: "brightness(1.04)" },
              }}
            >
              {phase === "done" ? <RotateCcw size={16} /> : <Mic size={17} />}
              {phase === "processing"
                ? "Đang xử lý…"
                : phase === "done"
                  ? "Nói lại"
                  : "Bắt đầu nói"}
            </Box>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 1.75, borderRadius: `${sp.radiusSm}px` }}>
            {error}
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
