import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  type SxProps,
  type Theme,
} from "@mui/material";
import { Filter, RefreshCcw, Search, X } from "lucide-react";
import { type ReactNode } from "react";

interface ToolbarSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  rightExtras?: ReactNode;
  onMobileFilter?: () => void;
  sx?: SxProps<Theme>;
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  onRefresh,
  refreshing,
  rightExtras,
  onMobileFilter,
  sx,
}: ToolbarSearchProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={[
        {
          mb: 3,
          p: { xs: 1.5, sm: 1.75 },
          borderRadius: 3,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 2px 6px rgba(31, 34, 56, 0.04)",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: 1,
          minWidth: 0,
          px: 1.5,
          py: { xs: 0.75, sm: 0.5 },
          borderRadius: 2,
          backgroundColor: "rgba(31, 34, 56, 0.04)",
          transition: "background-color 200ms ease, box-shadow 200ms ease",
          "&:focus-within": {
            backgroundColor: "background.paper",
            boxShadow: "0 0 0 2px rgba(185, 0, 0, 0.18)",
          },
        }}
      >
        <Search size={18} color="#5B6079" />
        <Box
          component="input"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          sx={{
            border: "none",
            outline: "none",
            background: "transparent",
            flex: 1,
            fontSize: "0.9rem",
            color: "text.primary",
            minWidth: 0,
            fontFamily: "inherit",
            "&::placeholder": { color: "text.disabled" },
          }}
        />
        {value && (
          <IconButton
            size="small"
            onClick={() => onChange("")}
            sx={{ color: "text.secondary" }}
          >
            <X size={16} />
          </IconButton>
        )}
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {onRefresh && (
          <Button
            variant="outlined"
            onClick={onRefresh}
            disabled={refreshing}
            startIcon={
              <RefreshCcw
                size={16}
                style={{
                  animation: refreshing ? "spin 0.9s linear infinite" : undefined,
                }}
              />
            }
            sx={{
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              px: 2,
              py: 1,
              fontWeight: 600,
              textTransform: "none",
              transition: "all 200ms ease",
              "&:hover": {
                borderColor: "primary.main",
                color: "primary.main",
                backgroundColor: "rgba(185, 0, 0, 0.04)",
                transform: "translateY(-1px)",
              },
              "@keyframes spin": {
                to: { transform: "rotate(360deg)" },
              },
            }}
          >
            Làm mới
          </Button>
        )}
        {onMobileFilter && (
          <Button
            variant="outlined"
            onClick={onMobileFilter}
            startIcon={<Filter size={16} />}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              px: 2,
              py: 1,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Bộ lọc
          </Button>
        )}
        {rightExtras}
      </Stack>
    </Stack>
  );
}

interface ChipFilterProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number; color?: string }[];
  sx?: SxProps<Theme>;
}

export function ChipFilter<T extends string>({
  value,
  onChange,
  options,
  sx,
}: ChipFilterProps<T>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={[
        { flexWrap: "wrap", gap: 1, mb: 2.5 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Box
            key={opt.value}
            component="button"
            onClick={() => onChange(opt.value)}
            sx={{
              border: "1px solid",
              borderColor: active ? "transparent" : "divider",
              background: active
                ? "linear-gradient(135deg, #B90000 0%, #FF6B35 100%)"
                : "background.paper",
              color: active ? "common.white" : "text.secondary",
              borderRadius: 999,
              px: 2,
              py: 0.75,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.85,
              transition: "all 220ms ease",
              boxShadow: active
                ? "0 6px 14px rgba(185, 0, 0, 0.22)"
                : "0 1px 2px rgba(31, 34, 56, 0.04)",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: active
                  ? "0 10px 18px rgba(185, 0, 0, 0.28)"
                  : "0 4px 10px rgba(31, 34, 56, 0.08)",
                color: active ? "common.white" : "text.primary",
              },
              "&:active": { transform: "translateY(0) scale(0.97)" },
            }}
          >
            {opt.color && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: opt.color,
                  boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                }}
              />
            )}
            {opt.label}
            {typeof opt.count === "number" && (
              <Box
                component="span"
                sx={{
                  px: 0.85,
                  py: 0.05,
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  backgroundColor: active ? "rgba(255,255,255,0.22)" : "rgba(31, 34, 56, 0.08)",
                }}
              >
                {opt.count}
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

interface SectionCardProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
  noPadding?: boolean;
}

export function SectionCard({ children, sx, noPadding = false }: SectionCardProps) {
  return (
    <Box
      sx={[
        {
          borderRadius: 3,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 14px rgba(31, 34, 56, 0.05)",
          p: noPadding ? 0 : { xs: 2, sm: 2.5, md: 3 },
          transition: "box-shadow 220ms ease",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function SectionTitle({ title, description, action, sx }: SectionTitleProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={1.5}
      sx={[{ mb: 2.5 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.005em" }}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
