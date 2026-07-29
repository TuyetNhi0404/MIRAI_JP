import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { ThinkingOrb } from "thinking-orbs";
import { sp } from "./speakingPracticeTheme";

type AiAwaitingIndicatorProps = {
  loadingText?: string;
};

function awaitingCopy(loadingText?: string): { title: string; subtitle: string; listening: boolean } {
  const raw = loadingText || "";
  if (/transcrib|nhận dạng|nghe/i.test(raw)) {
    return {
      title: "Đang nhận dạng giọng nói…",
      subtitle: "Chuyển giọng nói thành chữ",
      listening: true,
    };
  }
  if (/suy nghĩ|thinking/i.test(raw)) {
    return {
      title: "Mirai đang suy nghĩ…",
      subtitle: "Chuẩn bị phản hồi cho bạn",
      listening: false,
    };
  }
  return {
    title: raw || "Mirai đang xử lý…",
    subtitle: "Chờ phản hồi từ coach",
    listening: false,
  };
}

/**
 * Soft-UI awaiting chip for chat — matches Mirai surfaces (#FFF / #FFF1F0 / #B90000),
 * not the Three.js mic sphere. Canvas orb is tinted to brand red; animation stays slow.
 */
export function AiAwaitingIndicator({ loadingText }: AiAwaitingIndicatorProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { title, subtitle, listening } = awaitingCopy(loadingText);

  return (
    <Box
      className="mira-msg-enter"
      sx={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        maxWidth: "82%",
        px: 1.5,
        py: 1.15,
        bgcolor: sp.surface,
        borderRadius: `${sp.radiusMd}px`,
        border: `1px solid ${sp.hairline}`,
        boxShadow: sp.shadowSm,
        transition: sp.transition,
      }}
      aria-live="polite"
      aria-label={title}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          bgcolor: "transparent",
          border: "none",
          boxShadow: "none",
          "& canvas": {
            display: "block !important",
            width: "64px !important",
            height: "64px !important",
            margin: 0,
            // thinking-orbs is grayscale; map ink → Mirai primary #B90000
            filter:
              "brightness(0) saturate(100%) invert(10%) sepia(90%) saturate(5200%) hue-rotate(348deg) brightness(0.92) contrast(1.05)",
          },
        }}
      >
        <ThinkingOrb
          state={listening ? "listening" : "working"}
          size={64}
          speed={reduceMotion ? 0 : 0.32}
          paused={reduceMotion}
          theme="light"
          aria-hidden
          style={{ width: 64, height: 64, display: "block", background: "transparent" }}
        />
      </Box>
      <Stack spacing={0.2} sx={{ minWidth: 0, pr: 0.5 }}>
        <Typography
          sx={{
            color: sp.text,
            fontWeight: 600,
            fontSize: "0.84rem",
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: sp.textMuted,
            fontWeight: 500,
            fontSize: "0.72rem",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </Typography>
      </Stack>
    </Box>
  );
}
