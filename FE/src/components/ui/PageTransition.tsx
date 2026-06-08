import { Box, type BoxProps } from "@mui/material";
import { type ReactNode } from "react";

interface PageTransitionProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
}

export function PageTransition({ children, sx, ...rest }: PageTransitionProps) {
  return (
    <Box
      {...rest}
      sx={[
        {
          animation: "pageIn 360ms cubic-bezier(0.4, 0, 0.2, 1) both",
          "@keyframes pageIn": {
            from: { opacity: 0, transform: "translate3d(0, 8px, 0)" },
            to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
