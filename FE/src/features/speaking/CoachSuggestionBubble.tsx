import { Box, Chip, CircularProgress, Tooltip, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";
import type { CoachReview } from "./types";
import { SEVERITY_LABEL } from "./speakingUtils";
import { sp } from "./speakingPracticeTheme";
import { useMessageTranslation } from "./useMessageTranslation";

const BRAND = sp.brand;

type CoachSuggestionBubbleProps = {
  loading?: boolean;
  review?: CoachReview;
  error?: string;
  onViewErrors?: () => void;
};

const SEVERITY_PALETTE: Record<CoachReview["severity"], { color: string; bg: string; label: string }> = {
  important: { color: "#DC2626", bg: "#FEE2E2", label: "Lỗi nặng" },
  should_fix: { color: "#D97706", bg: "#FEF3C7", label: "Nên sửa" },
  minor: { color: "#16A34A", bg: "#DCFCE7", label: "Tốt rồi" },
};

function TranslatableSuggestion({ text }: { text: string }) {
  const { translation, loading, error, fetchTranslation, translatable } =
    useMessageTranslation(text);

  const title = !translatable
    ? null
    : loading
      ? "Đang dịch..."
      : error
        ? error
        : translation
          ? translation
          : "Di chuột để xem nghĩa tiếng Việt";

  return (
    <Tooltip
      title={title}
      arrow
      placement="top"
      enterDelay={200}
      onOpen={() => void fetchTranslation()}
      slotProps={{
        tooltip: { sx: { maxWidth: 320, fontSize: "0.85rem", lineHeight: 1.55 } },
      }}
    >
      <Box
        component="span"
        sx={{
          cursor: translatable ? "help" : "default",
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 600,
          color: sp.text,
          lineHeight: 1.5,
          fontSize: "0.85rem",
          borderBottom: translatable ? `1px dotted ${sp.hairline}` : "none",
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

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
          mt: 0.5,
          px: 1.25,
          py: 0.85,
          borderRadius: 1.5,
          bgcolor: "rgba(15, 23, 42, 0.04)",
          border: `1px solid ${sp.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <CircularProgress size={12} sx={{ color: BRAND }} thickness={5} />
        <Typography variant="caption" sx={{ color: sp.textSoft, fontSize: "0.75rem" }}>
          Mirai đang kiểm tra...
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

  const severity = SEVERITY_PALETTE[review.severity] ?? SEVERITY_PALETTE.minor;

  return (
    <Box
      sx={{
        mt: 0.5,
        px: 1.25,
        py: 1.1,
        borderRadius: 1.75,
        bgcolor: sp.surfaceSunken,
        border: `1px solid ${sp.hairline}`,
        maxWidth: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.6 }}>
        <Sparkles size={11} color={BRAND} />
        <Typography variant="caption" fontWeight={700} sx={{ color: BRAND, fontSize: "0.7rem" }}>
          Gợi ý
        </Typography>
        <Chip
          label={SEVERITY_LABEL[review.severity] ?? severity.label}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.62rem",
            fontWeight: 600,
            bgcolor: severity.bg,
            color: severity.color,
            ml: "auto",
            border: "none",
          }}
        />
      </Box>

      <Typography variant="body2" sx={{ m: 0 }}>
        <TranslatableSuggestion text={corrected} />
      </Typography>

      {original && original !== corrected && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: sp.textFaint, fontSize: "0.7rem", textDecoration: "line-through" }}>
          <TranslatableSuggestion text={original} />
        </Typography>
      )}

      {review.explanation_vi && (
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0.5, lineHeight: 1.5, color: sp.textSoft, fontSize: "0.72rem" }}
        >
          {review.explanation_vi}
        </Typography>
      )}
    </Box>
  );
}
