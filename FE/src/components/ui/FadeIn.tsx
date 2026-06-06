import { Box, type BoxProps } from "@mui/material";
import { type ReactNode } from "react";
import {
  fadeIn,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  fadeInUp,
  scaleIn,
} from "../../theme/animations";

export type FadeDirection = "up" | "down" | "left" | "right" | "scale" | "none";

interface FadeInProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
  direction?: FadeDirection;
  delay?: number;
  duration?: number;
  asBlock?: boolean;
}

const keyframeMap = {
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
  scale: scaleIn,
  none: fadeIn,
};

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 420,
  asBlock = true,
  sx,
  ...rest
}: FadeInProps) {
  const animation = keyframeMap[direction];
  return (
    <Box
      sx={{
        animation: `${animation} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
        display: asBlock ? "block" : undefined,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

interface StaggerProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
  baseDelay?: number;
  step?: number;
  duration?: number;
}

export function Stagger({
  children,
  baseDelay = 0,
  step = 60,
  duration = 420,
  sx,
  ...rest
}: StaggerProps) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <Box sx={sx} {...rest}>
      {arr.map((child, i) => (
        <FadeIn key={i} delay={baseDelay + i * step} duration={duration}>
          {child}
        </FadeIn>
      ))}
    </Box>
  );
}
