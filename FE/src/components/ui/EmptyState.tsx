import { Box, Typography, Button, type SxProps, type Theme } from "@mui/material";
import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  illustration?: ReactNode;
  sx?: SxProps<Theme>;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  illustration,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          py: { xs: 6, sm: 8 },
          px: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          border: "1px dashed",
          borderColor: "divider",
          animation: "emptyIn 420ms cubic-bezier(0.4, 0, 0.2, 1) both",
          "@keyframes emptyIn": {
            from: { opacity: 0, transform: "scale(0.96)" },
            to: { opacity: 1, transform: "scale(1)" },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFE4D6 0%, #FFEAEA 100%)",
          color: "primary.main",
          mb: 2.5,
          animation: "floaty 3s ease-in-out infinite",
          "@keyframes floaty": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-6px)" },
          },
        }}
      >
        {illustration ?? icon ?? <Inbox size={36} strokeWidth={1.5} />}
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          mb: 0.75,
          fontSize: { xs: "1rem", sm: "1.15rem" },
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            maxWidth: 420,
            mb: action ? 2.5 : 0,
          }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.1,
            boxShadow: "0 8px 20px rgba(185, 0, 0, 0.22)",
            transition: "transform 200ms ease, box-shadow 200ms ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 12px 26px rgba(185, 0, 0, 0.28)",
            },
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
