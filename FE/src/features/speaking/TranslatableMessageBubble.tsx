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
      maxWidth: 340,
      fontSize: "0.85rem",
      lineHeight: 1.5,
      fontFamily: '"Inter", sans-serif',
      bgcolor: "rgba(30,30,30,0.92)",
    },
  },
};

const hoverableSx: SxProps<Theme> = {
  cursor: "help",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
};

function variantSx(
  variant: "user" | "system",
  partial?: boolean,
): SxProps<Theme> {
  if (variant === "system") {
    return {
      bgcolor: "#F8F9FA",
      color: "text.primary",
      borderBottomLeftRadius: 4,
      border: "1px solid rgba(0,0,0,0.05)",
      "&:hover": {
        bgcolor: "#F0F4F8",
        borderColor: "rgba(185,0,0,0.12)",
      },
    };
  }
  return {
    bgcolor: partial ? "rgba(255,240,240,0.6)" : "#FFF0F0",
    color: partial ? "text.secondary" : "#4A1515",
    borderBottomRightRadius: 4,
    border: partial
      ? "1.5px dashed rgba(185,0,0,0.35)"
      : "1px solid rgba(185,0,0,0.1)",
    fontStyle: partial ? "italic" : "normal",
    opacity: partial ? 0.9 : 1,
    "&:hover": {
      bgcolor: partial ? "rgba(255,235,235,0.85)" : "#FFE8E8",
      borderColor: "rgba(185,0,0,0.2)",
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
        px: 2,
        py: 1.25,
        borderRadius: 2.5,
        fontSize: "0.9rem",
        lineHeight: 1.5,
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
