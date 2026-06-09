import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { Mic, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import speakingApi from "./speakingApi";
import { speakingApiPath } from "./config";
import type { GrammarNote } from "./types";
import { sp } from "./speakingPracticeTheme";

const BRAND = sp.brand;

type NotePracticeDialogProps = {
  note: GrammarNote | null;
  open: boolean;
  onClose: () => void;
  onMastered: (id: string) => void;
};

export function NotePracticeDialog({ note, open, onClose, onMastered }: NotePracticeDialogProps) {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; heard: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    const mr = mrRef.current;
    if (mr && mr.state === "recording") mr.stop();
    setRecording(false);
  }, []);

  const startPractice = useCallback(async () => {
    if (!note?.corrected) return;
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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
          if (score >= 0.75) {
            onMastered(note._id);
          }
        } catch {
          setError("Không transcribe được. Thử lại.");
        }
      };
      mr.start();
      setRecording(true);
      setTimeout(() => stopRecording(), 5000);
    } catch {
      setError("Không truy cập được micro.");
    }
  }, [note, onMastered, stopRecording]);

  const handleClose = () => {
    stopRecording();
    setResult(null);
    setError(null);
    onClose();
  };

  if (!note) return null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Luyện nói lại
        <IconButton size="small" onClick={handleClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary">
          Nói câu mẫu (tối đa ~5 giây)
        </Typography>
        <Typography
          sx={{ mt: 1, mb: 2, fontFamily: '"Noto Sans JP", sans-serif', fontWeight: 600, color: BRAND }}
        >
          {note.corrected}
        </Typography>

        <Box
          component="button"
          type="button"
          disabled={recording}
          onClick={() => void startPractice()}
          sx={{
            border: "none",
            borderRadius: "50px",
            px: 3,
            py: 1,
            bgcolor: BRAND,
            color: "#fff",
            fontWeight: 600,
            cursor: recording ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 1,
            mx: "auto",
          }}
        >
          <Mic size={18} />
          {recording ? "Đang nghe..." : "Bắt đầu nói"}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            Nghe được: <span style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{result.heard || "Chưa rõ"}</span>
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Độ khớp {Math.round(result.score * 100)}%
            {result.score >= 0.75 ? " · Tốt! Đã đánh dấu thuần." : " · Thử lại nhé."}
          </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
