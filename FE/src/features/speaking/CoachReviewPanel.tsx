import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import type { CoachReview } from "./types";
import { SEVERITY_LABEL } from "./speakingUtils";
import { sp } from "./speakingPracticeTheme";

const BRAND = sp.brand;

type CoachReviewPanelProps = {
  open: boolean;
  onClose: () => void;
  editableTranscript: string;
  onTranscriptChange: (value: string) => void;
  onReview: () => void;
  review: CoachReview | null;
  loading: boolean;
  error: string | null;
  onSaveNote: () => void;
  savingNote?: boolean;
};

export function CoachReviewPanel({
  open,
  onClose,
  editableTranscript,
  onTranscriptChange,
  onReview,
  review,
  loading,
  error,
  onSaveNote,
  savingNote,
}: CoachReviewPanelProps) {
  const severityColor =
    review?.severity === "important"
      ? "#dc2626"
      : review?.severity === "should_fix"
        ? "#ea580c"
        : "#16a34a";

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: "16px 16px 0 0" } }}>
      <Box sx={{ p: 2, pb: 3, maxWidth: 720, mx: "auto", width: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700} color={BRAND}>
            Coach · Chỉnh sửa ngữ pháp
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </IconButton>
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Sửa câu STT nếu nghe sai, rồi bấm Phân tích
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          value={editableTranscript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          sx={{ mb: 1.5, "& .MuiInputBase-input": { fontFamily: '"Noto Sans JP", sans-serif' } }}
        />

        <Box
          component="button"
          type="button"
          disabled={loading || !editableTranscript.trim()}
          onClick={onReview}
          sx={{
            border: "none",
            borderRadius: 1,
            px: 2,
            py: 0.75,
            mb: 2,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            bgcolor: BRAND,
            color: "#fff",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Đang phân tích..." : "Phân tích"}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={28} sx={{ color: BRAND }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {review && !loading && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Chip
              label={SEVERITY_LABEL[review.severity] ?? review.severity}
              size="small"
              sx={{ alignSelf: "flex-start", bgcolor: `${severityColor}18`, color: severityColor, fontWeight: 600 }}
            />

            <Box>
              <Typography variant="caption" color="text.secondary">
                Bạn nói
              </Typography>
              <Typography sx={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: "0.95rem" }}>
                {review.original}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Gợi ý
              </Typography>
              <Typography
                sx={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: "0.95rem", color: BRAND, fontWeight: 600 }}
              >
                {review.corrected}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Giải thích
              </Typography>
              <Typography variant="body2">{review.explanation_vi}</Typography>
            </Box>

            {review.tags.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {review.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}

            <Box
              component="button"
              type="button"
              disabled={savingNote}
              onClick={onSaveNote}
              sx={{
                mt: 0.5,
                border: `1px solid ${BRAND}`,
                borderRadius: 1,
                px: 2,
                py: 0.85,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                bgcolor: sp.brandTint,
                color: BRAND,
              }}
            >
              {savingNote ? "Đang lưu..." : "Lưu vào sổ lỗi"}
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
