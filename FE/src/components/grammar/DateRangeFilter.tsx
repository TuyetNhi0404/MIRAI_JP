import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Tooltip,
  IconButton,
  Grid,
} from "@mui/material";
import { Calendar, RotateCcw } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import type { DateRangePreset } from "../../services/grammar.service";
import { brandColors } from "../../theme/theme";

export interface DateRangeValue {
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "title";
  order?: "asc" | "desc";
}

export interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  showSort?: boolean;
}

function toIsoDate(d: Dayjs | undefined): string | undefined {
  if (!d) return undefined;
  const v = d.format("YYYY-MM-DD");
  return v === "Invalid Date" ? undefined : v;
}

function computePreset(preset: DateRangePreset): { from?: string; to?: string } {
  const today = dayjs().endOf("day");
  switch (preset) {
    case "today":
      return { from: toIsoDate(today.startOf("day")), to: toIsoDate(today) };
    case "7d":
      return { from: toIsoDate(today.subtract(6, "day").startOf("day")), to: toIsoDate(today) };
    case "30d":
      return { from: toIsoDate(today.subtract(29, "day").startOf("day")), to: toIsoDate(today) };
    case "custom":
    case "all":
    default:
      return {};
  }
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange, showSort = true }) => {
  const [preset, setPreset] = useState<DateRangePreset>("all");

  // Khi parent thay đổi value từ bên ngoài (clear), đồng bộ lại preset
  useEffect(() => {
    if (!value.dateFrom && !value.dateTo) {
      setPreset("all");
    }
  }, [value.dateFrom, value.dateTo]);

  const handlePresetChange = (next: DateRangePreset) => {
    setPreset(next);
    if (next === "all") {
      onChange({ ...value, dateFrom: undefined, dateTo: undefined });
      return;
    }
    if (next === "custom") {
      // Giữ nguyên giá trị hiện tại (nếu có) để user tinh chỉnh
      return;
    }
    const { from, to } = computePreset(next);
    onChange({ ...value, dateFrom: from, dateTo: to });
  };

  const handleFromChange = (v: string) => {
    setPreset("custom");
    onChange({ ...value, dateFrom: v || undefined });
  };
  const handleToChange = (v: string) => {
    setPreset("custom");
    onChange({ ...value, dateTo: v || undefined });
  };

  const handleSortChange = (sortBy: "createdAt" | "title") => {
    onChange({ ...value, sortBy });
  };
  const handleOrderToggle = () => {
    onChange({ ...value, order: value.order === "asc" ? "desc" : "asc" });
  };

  const handleReset = () => {
    setPreset("all");
    onChange({ dateFrom: undefined, dateTo: undefined, sortBy: value.sortBy, order: value.order });
  };

  const currentSortBy = value.sortBy || "createdAt";
  const currentOrder = value.order || "desc";

  const presetLabel = useMemo(() => {
    switch (preset) {
      case "today": return "Hôm nay";
      case "7d": return "7 ngày qua";
      case "30d": return "30 ngày qua";
      case "custom": return "Tùy chỉnh";
      default: return "Tất cả";
    }
  }, [preset]);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
      {/* Khoảng ngày preset */}
      <FormControl size="small" sx={{ width: 130 }}>
        <InputLabel id="date-preset-label">Khoảng ngày</InputLabel>
        <Select
          labelId="date-preset-label"
          label="Khoảng ngày"
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="today">Hôm nay</MenuItem>
          <MenuItem value="7d">7 ngày qua</MenuItem>
          <MenuItem value="30d">30 ngày qua</MenuItem>
          <MenuItem value="custom">Tùy chỉnh</MenuItem>
        </Select>
      </FormControl>

      {/* Từ ngày & Đến ngày nhóm chung 1 Box để luôn nằm cùng 1 hàng */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <TextField
          type="date"
          size="small"
          label="Từ ngày"
          value={value.dateFrom || ""}
          onChange={(e) => handleFromChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 145 }}
        />
        <TextField
          type="date"
          size="small"
          label="Đến ngày"
          value={value.dateTo || ""}
          onChange={(e) => handleToChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 145 }}
        />
      </Box>

      {showSort && (
        <>
          {/* Sắp xếp */}
          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel id="sort-by-label">Sắp xếp</InputLabel>
            <Select
              labelId="sort-by-label"
              label="Sắp xếp"
              value={currentSortBy}
              onChange={(e) => handleSortChange(e.target.value as "createdAt" | "title")}
            >
              <MenuItem value="createdAt">Ngày tạo</MenuItem>
              <MenuItem value="title">Tên</MenuItem>
            </Select>
          </FormControl>

          {/* Tăng / Giảm dần */}
          <Button
            size="small"
            variant="outlined"
            onClick={handleOrderToggle}
            sx={{
              height: 38,
              px: 1.5,
              textTransform: "none",
              color: brandColors.red,
              borderColor: brandColors.red,
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap",
              '&:hover': {
                borderColor: brandColors.redDark,
                backgroundColor: brandColors.redSoft,
              }
            }}
          >
            {currentOrder === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
          </Button>
        </>
      )}

      {/* Reset Button */}
      <Tooltip title={`Đặt lại (hiện tại: ${presetLabel})`}>
        <span>
          <IconButton
            size="small"
            onClick={handleReset}
            disabled={preset === "all" && !value.dateFrom && !value.dateTo}
            sx={{ border: "1px solid #eee", height: 38, width: 38, borderRadius: "8px" }}
          >
            <RotateCcw size={16} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default DateRangeFilter;
