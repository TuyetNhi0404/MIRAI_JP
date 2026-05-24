import type { ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { sp } from "./speakingPracticeTheme";

type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  size?: "sm" | "md";
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  size = "md",
}: SegmentedControlProps<T>) {
  const py = size === "sm" ? 0.55 : 0.7;
  const fontSize = size === "sm" ? "0.75rem" : "0.8rem";

  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={{
        display: "inline-flex",
        bgcolor: sp.surfaceMuted,
        p: "4px",
        borderRadius: `${sp.radiusMd}px`,
        border: `1px solid ${sp.border}`,
        gap: 0.25,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            sx={{
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              px: size === "sm" ? 1.25 : 1.75,
              py,
              borderRadius: `${sp.radiusSm}px`,
              fontSize,
              fontWeight: 600,
              fontFamily: "inherit",
              lineHeight: 1.3,
              transition: sp.transition,
              bgcolor: active ? sp.brand : "transparent",
              color: active ? "#fff" : sp.textSoft,
              boxShadow: active ? sp.shadowSm : "none",
              minHeight: 36,
              "&:hover": {
                bgcolor: active ? sp.brandMid : "rgba(185,0,0,0.06)",
              },
              "&:focus-visible": {
                outline: "none",
                boxShadow: sp.focusRing,
              },
            }}
          >
            {opt.icon}
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

type RecordButtonProps = {
  label: string;
  disabled: boolean;
  isRecording: boolean;
  isUserSpeaking: boolean;
  sessionActive: boolean;
  modeIcon: ReactNode;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
};

export function RecordButton({
  label,
  disabled,
  isRecording,
  isUserSpeaking,
  sessionActive,
  modeIcon,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: RecordButtonProps) {
  const active = isRecording || isUserSpeaking;

  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onPointerDown();
      }}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerLeave}
      onTouchStart={(e) => {
        e.preventDefault();
        onPointerDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onPointerUp();
      }}
      sx={{
        position: "relative",
        border: "none",
        borderRadius: sp.radiusPill,
        px: 4,
        py: 1.75,
        minHeight: 52,
        fontSize: "1rem",
        fontWeight: 700,
        fontFamily: "inherit",
        letterSpacing: "0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.25,
        color: "#fff",
        width: "100%",
        maxWidth: 340,
        transition: sp.transition,
        opacity: disabled ? 0.5 : 1,
        background: active
          ? `linear-gradient(135deg, ${sp.brandLight} 0%, ${sp.brand} 100%)`
          : `linear-gradient(135deg, ${sp.brandMid} 0%, ${sp.brand} 100%)`,
        boxShadow: active
          ? `0 6px 24px rgba(185, 0, 0, 0.35), 0 0 0 4px rgba(250, 157, 157, 0.35)`
          : sp.shadowMd,
        transform: active ? "scale(0.98)" : "scale(1)",
        "@media (prefers-reduced-motion: reduce)": {
          transform: "none",
          transition: "opacity 0.2s",
        },
        "&:hover:not(:disabled)": {
          boxShadow: `0 8px 28px rgba(185, 0, 0, 0.32)`,
          filter: "brightness(1.03)",
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `${sp.focusRing}, ${sp.shadowMd}`,
        },
        "&::before": active
          ? {
              content: '""',
              position: "absolute",
              inset: -4,
              borderRadius: sp.radiusPill,
              border: `2px solid rgba(250, 157, 157, 0.5)`,
              animation: "speaking-pulse 1.6s ease-out infinite",
              pointerEvents: "none",
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }
          : undefined,
        "@keyframes speaking-pulse": {
          "0%": { opacity: 0.9, transform: "scale(1)" },
          "70%": { opacity: 0, transform: "scale(1.06)" },
          "100%": { opacity: 0, transform: "scale(1.06)" },
        },
      }}
    >
      {modeIcon}
      <span>{label}</span>
      {sessionActive && !active && (
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: 8,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: sp.success,
            border: "2px solid #fff",
          }}
          aria-hidden
        />
      )}
    </Box>
  );
}

export function panelSx(): SxProps<Theme> {
  return {
    bgcolor: sp.surface,
    borderRadius: `${sp.radiusLg}px`,
    border: `1px solid ${sp.border}`,
    boxShadow: sp.shadowSm,
  };
}
