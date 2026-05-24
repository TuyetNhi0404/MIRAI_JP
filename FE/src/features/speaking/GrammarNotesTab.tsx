import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import type { GrammarNote } from "./types";
import { STATUS_LABEL } from "./speakingUtils";

const BRAND = "#c83c3c";

type GrammarNotesTabProps = {
  notes: GrammarNote[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, status: GrammarNote["status"]) => void;
  onDelete: (id: string) => void;
  onPractice: (note: GrammarNote) => void;
};

export function GrammarNotesTab({
  notes,
  loading,
  error,
  onStatusChange,
  onDelete,
  onPractice,
}: GrammarNotesTabProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: BRAND }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="warning">{error}</Alert>;
  }

  if (notes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        Chưa có lỗi nào được ghi nhận. Khi bạn nói sai ngữ pháp, Mirai sẽ gợi ý sửa và lưu tự động tại đây.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, py: 1 }}>
      {notes.map((note) => (
        <Box
          key={note._id}
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: "1px solid rgba(185,0,0,0.1)",
            bgcolor: "#FFFBFB",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
            <Chip
              label={STATUS_LABEL[note.status] ?? note.status}
              size="small"
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
            <IconButton size="small" onClick={() => onDelete(note._id)} aria-label="Xóa">
              <Trash2 size={16} />
            </IconButton>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Bạn đã nói
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: '"Noto Sans JP", sans-serif', color: "#4A1515", lineHeight: 1.5 }}
          >
            {note.original}
          </Typography>

          {note.corrected && note.corrected !== note.original && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Nên nói
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: '"Noto Sans JP", sans-serif', color: BRAND, fontWeight: 600, lineHeight: 1.5 }}
              >
                {note.corrected}
              </Typography>
            </>
          )}

          {note.explanationVi && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              {note.explanationVi}
            </Typography>
          )}

          {note.tags?.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
              {note.tags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.65rem" }} />
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.25 }}>
            {note.status !== "reviewing" && (
              <Box
                component="button"
                type="button"
                onClick={() => onStatusChange(note._id, "reviewing")}
                sx={actionBtnSx}
              >
                Đang ôn
              </Box>
            )}
            {note.status !== "mastered" && (
              <Box
                component="button"
                type="button"
                onClick={() => onStatusChange(note._id, "mastered")}
                sx={actionBtnSx}
              >
                Đã thuần
              </Box>
            )}
            {note.corrected && (
              <Box
                component="button"
                type="button"
                onClick={() => onPractice(note)}
                sx={{ ...actionBtnSx, bgcolor: BRAND, color: "#fff", border: "none" }}
              >
                Luyện lại
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

const actionBtnSx = {
  border: "1px solid rgba(185,0,0,0.2)",
  borderRadius: 1,
  px: 1,
  py: 0.4,
  fontSize: "0.72rem",
  fontWeight: 600,
  cursor: "pointer",
  bgcolor: "#fff",
  color: BRAND,
};
