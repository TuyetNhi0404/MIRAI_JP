import {
  Box,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import { type ReactNode } from "react";
import { gradients } from "../../theme/theme";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  gradient?: boolean;
  sx?: SxProps<Theme>;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  gradient = false,
  sx,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: { xs: 3, md: 4 },
        px: { xs: 2.5, sm: 3.5, md: 4 },
        py: { xs: 2.5, sm: 3, md: 3.5 },
        mb: 3,
        background: gradient ? gradients.sunset : "background.paper",
        color: gradient ? "common.white" : "text.primary",
        boxShadow: gradient
          ? "0 14px 40px rgba(255, 107, 53, 0.18)"
          : "0 6px 18px rgba(31, 34, 56, 0.06)",
        border: gradient ? "none" : "1px solid",
        borderColor: gradient ? "transparent" : "divider",
        overflow: "hidden",
        transition: "transform 320ms ease, box-shadow 320ms ease",
        animation: "headerIn 480ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "@keyframes headerIn": {
          from: { opacity: 0, transform: "translate3d(0,-8px,0)" },
          to: { opacity: 1, transform: "translate3d(0,0,0)" },
        },
        "&::before": gradient
          ? {
              content: '""',
              position: "absolute",
              right: -60,
              top: -60,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.16)",
              filter: "blur(2px)",
              pointerEvents: "none",
            }
          : undefined,
        "&::after": gradient
          ? {
              content: '""',
              position: "absolute",
              left: -30,
              bottom: -50,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              pointerEvents: "none",
            }
          : undefined,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ position: "relative", zIndex: 1 }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          {icon && (
            <Box
              sx={{
                width: { xs: 44, sm: 52 },
                height: { xs: 44, sm: 52 },
                borderRadius: 2.5,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: gradient
                  ? "rgba(255,255,255,0.22)"
                  : "linear-gradient(135deg, #FFE4D6 0%, #FFEAEA 100%)",
                color: gradient ? "#fff" : "primary.main",
                boxShadow: gradient
                  ? "0 6px 18px rgba(0,0,0,0.10)"
                  : "0 6px 16px rgba(185, 0, 0, 0.10)",
                transition: "transform 320ms ease",
                "&:hover": { transform: "rotate(-6deg) scale(1.05)" },
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: "1.4rem", sm: "1.7rem", md: "2rem" },
                fontWeight: 800,
                lineHeight: 1.15,
                color: gradient ? "inherit" : "text.primary",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  color: gradient ? "rgba(255,255,255,0.92)" : "text.secondary",
                  fontSize: { xs: "0.82rem", sm: "0.9rem" },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              flexShrink: 0,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {actions}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
