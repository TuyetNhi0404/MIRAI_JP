import {
  Box,
  IconButton,
  Typography,
  type IconButtonProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import { CheckCircle2, Info, X, XCircle, AlertTriangle } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export type ToastSeverity = "success" | "error" | "warning" | "info";

interface AnimatedToastProps {
  open: boolean;
  message: string;
  severity?: ToastSeverity;
  onClose: () => void;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

const SEVERITY_CONFIG: Record<
  ToastSeverity,
  { bg: string; shadow: string; icon: ReactNode }
> = {
  success: {
    bg: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    shadow: "0 12px 30px rgba(16, 185, 129, 0.30)",
    icon: <CheckCircle2 size={22} />,
  },
  error: {
    bg: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
    shadow: "0 12px 30px rgba(220, 38, 38, 0.30)",
    icon: <XCircle size={22} />,
  },
  warning: {
    bg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    shadow: "0 12px 30px rgba(245, 158, 11, 0.30)",
    icon: <AlertTriangle size={22} />,
  },
  info: {
    bg: "linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)",
    shadow: "0 12px 30px rgba(14, 165, 233, 0.28)",
    icon: <Info size={22} />,
  },
};

export function AnimatedToast({
  open,
  message,
  severity = "success",
  onClose,
  duration = 3600,
  action,
}: AnimatedToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 280);
      }, duration);
      return () => clearTimeout(t);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const cfg = SEVERITY_CONFIG[severity];

  return (
    <Box
      sx={{
        position: "fixed",
        top: { xs: 80, sm: 92 },
        right: { xs: 12, sm: 24 },
        zIndex: 1500,
        minWidth: { xs: 280, sm: 340 },
        maxWidth: { xs: "calc(100vw - 24px)", sm: 460 },
        background: cfg.bg,
        color: "common.white",
        borderRadius: 2.5,
        boxShadow: cfg.shadow,
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms ease",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background:
            "linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmerLine 2.4s linear infinite",
          pointerEvents: "none",
          "@keyframes shimmerLine": {
            "0%": { backgroundPosition: "200% 0" },
            "100%": { backgroundPosition: "-200% 0" },
          },
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {cfg.icon}
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, flex: 1, lineHeight: 1.4 }}
      >
        {message}
      </Typography>
      {action && (
        <Box
          component="button"
          onClick={action.onClick}
          sx={{
            background: "rgba(255,255,255,0.22)",
            color: "inherit",
            border: "none",
            borderRadius: 1.5,
            px: 1.5,
            py: 0.5,
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 200ms ease",
            "&:hover": { background: "rgba(255,255,255,0.32)" },
          }}
        >
          {action.label}
        </Box>
      )}
      <IconButton
        size="small"
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 280);
        }}
        sx={{
          color: "inherit",
          opacity: 0.85,
          "&:hover": { opacity: 1, backgroundColor: "rgba(255,255,255,0.18)" },
        }}
      >
        <X size={18} />
      </IconButton>
    </Box>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  size?: "sm" | "md";
  sx?: SxProps<Theme>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  sx,
}: SegmentedProps<T>) {
  const isSm = size === "sm";
  return (
    <Box
      sx={[
        {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          p: 0.5,
          borderRadius: 999,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 2px 6px rgba(31, 34, 56, 0.04)",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value}
            component="button"
            onClick={() => onChange(opt.value)}
            sx={{
              position: "relative",
              zIndex: 1,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              px: isSm ? 1.5 : 2.25,
              py: isSm ? 0.6 : 0.85,
              fontSize: isSm ? "0.78rem" : "0.85rem",
              fontWeight: 700,
              color: active ? "common.white" : "text.secondary",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.85,
              transition: "color 220ms ease",
              "&:hover": !active ? { color: "text.primary" } : undefined,
            }}
          >
            {active && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  background: "linear-gradient(135deg, #B90000 0%, #FF6B35 100%)",
                  boxShadow: "0 6px 14px rgba(185, 0, 0, 0.28)",
                  zIndex: -1,
                  animation: "segIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  "@keyframes segIn": {
                    from: { transform: "scale(0.85)", opacity: 0 },
                    to: { transform: "scale(1)", opacity: 1 },
                  },
                }}
              />
            )}
            {opt.label}
            {typeof opt.count === "number" && (
              <Box
                component="span"
                sx={{
                  px: 0.85,
                  py: 0.1,
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  backgroundColor: active ? "rgba(255,255,255,0.22)" : "rgba(31, 34, 56, 0.08)",
                  color: active ? "common.white" : "text.secondary",
                }}
              >
                {opt.count}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

interface AnimatedButtonBaseProps extends IconButtonProps {
  pulse?: boolean;
}

export function AnimatedIconButton({
  pulse = false,
  sx,
  children,
  ...rest
}: AnimatedButtonBaseProps) {
  return (
    <IconButton
      {...rest}
      sx={[
        {
          transition: "transform 220ms ease, background-color 220ms ease, color 220ms ease",
          "&:hover": { transform: "scale(1.08)" },
          "&:active": { transform: "scale(0.94)" },
          ...(pulse && {
            animation: "iconPulse 1.6s ease-out infinite",
            "@keyframes iconPulse": {
              "0%": { boxShadow: "0 0 0 0 rgba(185, 0, 0, 0.4)" },
              "70%": { boxShadow: "0 0 0 12px rgba(185, 0, 0, 0)" },
              "100%": { boxShadow: "0 0 0 0 rgba(185, 0, 0, 0)" },
            },
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </IconButton>
  );
}
