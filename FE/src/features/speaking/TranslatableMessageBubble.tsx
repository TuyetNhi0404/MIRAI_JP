import { Box, Tooltip, type SxProps, type Theme } from "@mui/material";
import { useMessageTranslation } from "./useMessageTranslation";

type TranslatableMessageBubbleProps = {
  text: string;
  variant: "user" | "system";
  partial?: boolean;
};

const tooltipSlotProps = {
  tooltip: {
    sx: {
      maxWidth: 320,
      fontSize: "0.85rem",
      lineHeight: 1.55,
      fontFamily: '"Inter", sans-serif',
      bgcolor: "#FFFFFF",
      color: "#0F172A",
      border: "1px solid rgba(15, 23, 42, 0.1)",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
      px: 1.5,
      py: 1,
    },
  },
  arrow: { sx: { color: "#FFFFFF", "&::before": { border: "1px solid rgba(15, 23, 42, 0.1)" } } },
};

const hoverableSx: SxProps<Theme> = {
  cursor: "help",
  transition: "all 0.2s ease",
};

function variantSx(
  variant: "user" | "system",
  partial?: boolean,
): SxProps<Theme> {
  if (variant === "system") {
    return {
      bgcolor: "#FFFFFF",
      color: "#0F172A",
      borderBottomLeftRadius: 4,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      "&:hover": {
        borderColor: "rgba(185, 0, 0, 0.18)",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
      },
    };
  }
  return {
    bgcolor: partial ? "rgba(185, 0, 0, 0.04)" : "#B90000",
    color: partial ? "#94A3B8" : "#FFFFFF",
    borderBottomRightRadius: 4,
    border: partial
      ? "1.5px dashed rgba(185, 0, 0, 0.35)"
      : "1px solid rgba(185, 0, 0, 0.85)",
    fontStyle: partial ? "italic" : "normal",
    opacity: partial ? 0.85 : 1,
    boxShadow: partial ? "none" : "0 4px 12px rgba(185, 0, 0, 0.22)",
    "&:hover": {
      filter: partial ? "none" : "brightness(1.05)",
    },
  };
}

export function TranslatableMessageBubble({
  text,
  variant,
  partial,
}: TranslatableMessageBubbleProps) {
  const { translation, loading, error, fetchTranslation, translatable } =
    useMessageTranslation(text);

  const tooltipTitle = !translatable
    ? null
    : loading
      ? "Đang dịch..."
      : error
        ? error
        : translation
          ? translation
          : "Di chuột để xem nghĩa tiếng Việt";

  const bubble = (
    <Box
      sx={{
        px: 1.75,
        py: 1.15,
        borderRadius: 2.25,
        fontSize: "0.92rem",
        lineHeight: 1.55,
        fontFamily: '"Noto Sans JP", "Inter", sans-serif',
        ...variantSx(variant, partial),
        ...(translatable && hoverableSx),
      }}
    >
      {text}
    </Box>
  );

  if (!translatable) {
    return bubble;
  }

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      placement="top"
      enterDelay={200}
      enterTouchDelay={0}
      onOpen={() => void fetchTranslation()}
      slotProps={tooltipSlotProps}
    >
      {bubble}
    </Tooltip>
  );
}
