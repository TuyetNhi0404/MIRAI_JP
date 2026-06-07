import { Box, Card, type CardProps, type SxProps, type Theme } from "@mui/material";
import { type ReactNode } from "react";

interface AnimatedCardProps extends Omit<CardProps, "sx"> {
  children: ReactNode;
  interactive?: boolean;
  highlight?: boolean;
  sx?: SxProps<Theme>;
  delay?: number;
}

export function AnimatedCard({
  children,
  interactive = false,
  highlight = false,
  delay = 0,
  sx,
  ...rest
}: AnimatedCardProps) {
  return (
    <Card
      {...rest}
      sx={[
        {
          borderRadius: 3,
          border: "1px solid",
          borderColor: highlight ? "primary.main" : "divider",
          backgroundColor: "background.paper",
          transition:
            "transform 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1), border-color 280ms ease",
          animation: `cardIn 420ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
          position: "relative",
          overflow: "hidden",
          "@keyframes cardIn": {
            from: { opacity: 0, transform: "translate3d(0,12px,0)" },
            to: { opacity: 1, transform: "translate3d(0,0,0)" },
          },
          ...(interactive && {
            cursor: "pointer",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: "0 16px 32px rgba(31, 34, 56, 0.10), 0 4px 8px rgba(31, 34, 56, 0.06)",
              borderColor: "primary.light",
            },
            "&:active": {
              transform: "translateY(-2px) scale(0.995)",
              transition: "transform 120ms ease",
            },
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Card>
  );
}

interface PulseDotProps {
  color?: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export function PulseDot({ color = "success.main", size = 10, sx }: PulseDotProps) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        ...sx,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.45,
          animation: "pulseRing 1.6s ease-out infinite",
          "@keyframes pulseRing": {
            "0%": { transform: "scale(1)", opacity: 0.45 },
            "100%": { transform: "scale(2.4)", opacity: 0 },
          },
        }}
      />
      <Box
        sx={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
    </Box>
  );
}
