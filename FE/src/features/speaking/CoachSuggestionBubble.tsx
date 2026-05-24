import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import type { CoachReview } from "./types";
import { SEVERITY_LABEL } from "./speakingUtils";

const BRAND = "#c83c3c";

type CoachSuggestionBubbleProps = {
  loading?: boolean;
  review?: CoachReview;
  error?: string;
  onViewErrors?: () => void;
};

export function CoachSuggestionBubble({
  loading,
  review,
  error,
  onViewErrors,
}: CoachSuggestionBubbleProps) {
  if (loading) {
    return (
      <Box
        sx={{
          mt: 0.75,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: "#FFFAF0",
          border: "1px dashed rgba(234, 88, 12, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CircularProgress size={14} sx={{ color: "#ea580c" }} />
        <Typography variant="caption" color="text.secondary">
          Mirai đang kiểm tra ngữ pháp...
        </Typography>
      </Box>
    );
  }

  if (error) return null;

  if (!review) return null;

  const original = review.original.trim();
  const corrected = review.corrected.trim();
  const hasFix = corrected && corrected !== original;

  if (!hasFix) return null;

  const severityColor =
    review.severity === "important"
      ? "#dc2626"
      : review.severity === "should_fix"
        ? "#ea580c"
        : "#16a34a";

  return (
    <Box
      sx={{
        mt: 0.75,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        bgcolor: "#FFFAF0",
        border: "1px solid rgba(234, 88, 12, 0.25)",
        maxWidth: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: "#c2410c" }}>
          Gợi ý sửa
        </Typography>
        <Chip
          label={SEVERITY_LABEL[review.severity] ?? review.severity}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            fontWeight: 600,
            bgcolor: `${severityColor}18`,
            color: severityColor,
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{ fontFamily: '"Noto Sans JP", sans-serif', fontWeight: 600, color: BRAND, lineHeight: 1.5 }}
      >
        {corrected}
      </Typography>

      {review.explanation_vi && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.45 }}>
          {review.explanation_vi}
        </Typography>
      )}

      {onViewErrors && (
        <Box
          component="button"
          type="button"
          onClick={onViewErrors}
          sx={{
            mt: 1,
            border: "none",
            bgcolor: "transparent",
            color: BRAND,
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            p: 0,
            textDecoration: "underline",
          }}
        >
          Xem trong Lỗi gặp phải →
        </Box>
      )}
    </Box>
  );
}
