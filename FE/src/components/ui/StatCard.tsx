import { Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  accent?: "primary" | "secondary" | "success" | "warning" | "info" | "neutral";
  delay?: number;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

const ACCENT_COLORS = {
  primary: { bg: "#FFEAEA", fg: "#B90000", shadow: "rgba(185, 0, 0, 0.12)" },
  secondary: { bg: "#FFE4D6", fg: "#C2410C", shadow: "rgba(255, 107, 53, 0.15)" },
  success: { bg: "#D1FAE5", fg: "#047857", shadow: "rgba(16, 185, 129, 0.15)" },
  warning: { bg: "#FEF3C7", fg: "#B45309", shadow: "rgba(245, 158, 11, 0.18)" },
  info: { bg: "#DBEAFE", fg: "#0369A1", shadow: "rgba(14, 165, 233, 0.16)" },
  neutral: { bg: "#E5E7EB", fg: "#374151", shadow: "rgba(31, 34, 56, 0.10)" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  accent = "primary",
  delay = 0,
  onClick,
  sx,
}: StatCardProps) {
  const tone = ACCENT_COLORS[accent];
  return (
    <Box
      onClick={onClick}
      sx={[
        {
          position: "relative",
          borderRadius: 3,
          p: { xs: 2.25, sm: 2.75 },
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          cursor: onClick ? "pointer" : "default",
          transition:
            "transform 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1), border-color 280ms ease",
          animation: `statIn 480ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
          "@keyframes statIn": {
            from: { opacity: 0, transform: "translate3d(0,16px,0) scale(0.97)" },
            to: { opacity: 1, transform: "translate3d(0,0,0) scale(1)" },
          },
          "&:hover": onClick
            ? {
                transform: "translateY(-3px)",
                boxShadow: `0 18px 36px ${tone.shadow}`,
                borderColor: tone.fg,
                "& .stat-icon-wrap": {
                  transform: "scale(1.08) rotate(-4deg)",
                },
              }
            : {
                "& .stat-icon-wrap": {
                  transform: "scale(1.05)",
                },
              },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: `radial-gradient(circle at top right, ${tone.bg} 0%, transparent 60%)`,
            opacity: 0.6,
            pointerEvents: "none",
            transition: "opacity 320ms ease",
          },
          "&:hover::before": { opacity: 1 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{ position: "relative", zIndex: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              mb: 0.75,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "1.5rem", sm: "1.85rem" },
              fontWeight: 800,
              color: "text.primary",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </Typography>
          {(hint || trend) && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              {trend && (
                <Box
                  sx={{
                    px: 0.85,
                    py: 0.25,
                    borderRadius: 1.25,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    backgroundColor: trend.value >= 0 ? "success.light" : "error.light",
                    color: trend.value >= 0 ? "success.dark" : "error.dark",
                    transition: "transform 220ms ease",
                  }}
                >
                  {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
                </Box>
              )}
              {hint && (
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontSize: "0.72rem" }}
                >
                  {hint}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
        {icon && (
          <Box
            className="stat-icon-wrap"
            sx={{
              width: { xs: 42, sm: 48 },
              height: { xs: 42, sm: 48 },
              borderRadius: 2.25,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tone.bg,
              color: tone.fg,
              transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
