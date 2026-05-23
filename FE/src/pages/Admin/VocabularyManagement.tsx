import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment,
  Divider,
  TablePagination,
} from "@mui/material";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Search,
  X,
  BookMarked,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { vocabularyService } from "../../services/vocabulary.service";
import type { IVocabulary, VocabularyFilter } from "../../services/vocabulary.service";

const LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const LEVEL_COLORS: Record<string, string> = {
  N1: "#7B1FA2",
  N2: "#1565C0",
  N3: "#2E7D32",
  N4: "#F57F17",
  N5: "#B90000",
};

const emptyForm: Omit<IVocabulary, "_id"> = {
  word: "",
  reading: "",
  meaning: "",
  level: "N5",
  topic: "",
  example: "",
  exampleMeaning: "",
  tags: [],
};

const VocabularyManagement: React.FC = () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [vocabularies, setVocabularies] = useState<IVocabulary[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<VocabularyFilter>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Dialog states
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<IVocabulary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import state
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    message: string;
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const [openImportResult, setOpenImportResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<{
    total: number;
    byLevel: { _id: string; count: number }[];
  } | null>(null);

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchVocabularies = useCallback(async () => {
    setLoading(true);
    try {
      const result = await vocabularyService.getAll(filter);
      setVocabularies(result.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchTopics = useCallback(async () => {
    try {
      const t = await vocabularyService.getTopics(filter.level);
      setTopics(t);
    } catch {
      // silently ignore
    }
  }, [filter.level]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await vocabularyService.getStats();
      setStats(s);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchVocabularies();
    fetchTopics();
  }, [fetchVocabularies, fetchTopics]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) => ({ ...prev, search: searchInput || undefined }));
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setFormError("");
    setOpenForm(true);
  };

  const handleOpenEdit = (vocab: IVocabulary) => {
    setEditingId(vocab._id);
    setFormData({
      word: vocab.word,
      reading: vocab.reading,
      meaning: vocab.meaning,
      level: vocab.level,
      topic: vocab.topic,
      example: vocab.example || "",
      exampleMeaning: vocab.exampleMeaning || "",
      tags: vocab.tags || [],
    });
    setFormError("");
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!formData.word || !formData.reading || !formData.meaning || !formData.topic) {
      setFormError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      if (editingId) {
        await vocabularyService.update(editingId, formData);
      } else {
        await vocabularyService.create(formData);
      }
      setOpenForm(false);
      fetchVocabularies();
      fetchStats();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await vocabularyService.delete(deleteTarget._id);
      setDeleteTarget(null);
      fetchVocabularies();
      fetchStats();
    } catch {
      // silently ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await vocabularyService.exportExcel(filter);
    } catch {
      // silently ignore
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await vocabularyService.importExcel(file);
      setImportResult(result);
      setOpenImportResult(true);
      fetchVocabularies();
      fetchStats();
    } catch (err: any) {
      setImportResult({
        message: err?.response?.data?.message || "Import thất bại",
        created: 0,
        updated: 0,
        errors: [],
      });
      setOpenImportResult(true);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTagsChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }));
  };

  // ─── Pagination ───────────────────────────────────────────────────────────
  const paginatedData = vocabularies.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              bgcolor: "#B90000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookMarked size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a1a">
              Quản lý Từ vựng
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats ? `Tổng cộng ${stats.total} từ vựng` : "JLPT N1 – N5"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Tooltip title="Làm mới dữ liệu">
            <IconButton onClick={fetchVocabularies} sx={{ border: "1px solid #eee" }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>

          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          <Button
            variant="outlined"
            startIcon={
              importLoading ? (
                <CircularProgress size={16} />
              ) : (
                <Upload size={16} />
              )
            }
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            sx={{
              borderColor: "#B90000",
              color: "#B90000",
              "&:hover": { bgcolor: "#fff5f5", borderColor: "#B90000" },
            }}
          >
            Import Excel
          </Button>

          {/* Export */}
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={handleExport}
            sx={{
              borderColor: "#2e7d32",
              color: "#2e7d32",
              "&:hover": { bgcolor: "#f0fff0", borderColor: "#2e7d32" },
            }}
          >
            Export Excel
          </Button>

          {/* Add new */}
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
            sx={{
              bgcolor: "#B90000",
              "&:hover": { bgcolor: "#990000" },
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            Thêm từ vựng
          </Button>
        </Box>
      </Box>

      {/* Stats chips */}
      {stats && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
          {stats.byLevel.map((item) => (
            <Chip
              key={item._id}
              label={`${item._id}: ${item.count} từ`}
              size="small"
              sx={{
                bgcolor: LEVEL_COLORS[item._id] + "18",
                color: LEVEL_COLORS[item._id],
                fontWeight: 600,
                border: `1px solid ${LEVEL_COLORS[item._id]}40`,
              }}
            />
          ))}
        </Box>
      )}

      {/* Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          placeholder="Tìm kiếm từ vựng..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 240, flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color="#999" />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchInput("");
                    setPage(0);
                  }}
                >
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Cấp độ</InputLabel>
          <Select
            label="Cấp độ"
            value={filter.level || ""}
            onChange={(e) => {
              setFilter((prev) => ({
                ...prev,
                level: e.target.value || undefined,
                topic: undefined,
              }));
              setPage(0);
            }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {LEVELS.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Chủ đề</InputLabel>
          <Select
            label="Chủ đề"
            value={filter.topic || ""}
            onChange={(e) => {
              setFilter((prev) => ({
                ...prev,
                topic: e.target.value || undefined,
              }));
              setPage(0);
            }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {topics.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(filter.level || filter.topic || filter.search) && (
          <Button
            size="small"
            startIcon={<X size={14} />}
            onClick={() => {
              setFilter({});
              setSearchInput("");
              setPage(0);
            }}
            sx={{ color: "#B90000" }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </Box>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", overflow: "hidden" }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress sx={{ color: "#B90000" }} />
          </Box>
        ) : vocabularies.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <BookMarked size={48} color="#ccc" style={{ marginBottom: 12 }} />
            <Typography color="text.secondary">
              Chưa có từ vựng nào. Hãy thêm mới hoặc import từ Excel.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Từ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Cách đọc</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Nghĩa</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Cấp độ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Chủ đề</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }}>Câu ví dụ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#555" }} align="center">
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((vocab) => (
                    <TableRow
                      key={vocab._id}
                      hover
                      sx={{ "&:last-child td": { border: 0 } }}
                    >
                      <TableCell>
                        <Typography fontWeight={700} fontSize={16} color="#222">
                          {vocab.word}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13} color="#666">
                          {vocab.reading}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13}>{vocab.meaning}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vocab.level}
                          size="small"
                          sx={{
                            bgcolor: LEVEL_COLORS[vocab.level] + "18",
                            color: LEVEL_COLORS[vocab.level],
                            fontWeight: 700,
                            border: `1px solid ${LEVEL_COLORS[vocab.level]}40`,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={12} color="#888">
                          {vocab.topic}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography
                          fontSize={12}
                          color="#666"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {vocab.example || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(vocab)}
                              sx={{ color: "#1565C0", "&:hover": { bgcolor: "#e3f2fd" } }}
                            >
                              <Pencil size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(vocab)}
                              sx={{ color: "#B90000", "&:hover": { bgcolor: "#fff5f5" } }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={vocabularies.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 15, 25, 50]}
              labelRowsPerPage="Hàng/trang:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} / ${count}`
              }
            />
          </>
        )}
      </Paper>

      {/* ─── FORM DIALOG ─────────────────────────────────────────────────────── */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingId ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {formError && (
            <Alert severity="error" icon={<AlertCircle size={18} />}>
              {formError}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Từ tiếng Nhật *"
              value={formData.word}
              onChange={(e) =>
                setFormData((p) => ({ ...p, word: e.target.value }))
              }
              fullWidth
              size="small"
              inputProps={{ style: { fontSize: 18, fontWeight: 700 } }}
            />
            <TextField
              label="Cách đọc *"
              value={formData.reading}
              onChange={(e) =>
                setFormData((p) => ({ ...p, reading: e.target.value }))
              }
              fullWidth
              size="small"
            />
          </Box>

          <TextField
            label="Nghĩa tiếng Việt *"
            value={formData.meaning}
            onChange={(e) =>
              setFormData((p) => ({ ...p, meaning: e.target.value }))
            }
            fullWidth
            size="small"
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Cấp độ *</InputLabel>
              <Select
                label="Cấp độ *"
                value={formData.level}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    level: e.target.value as IVocabulary["level"],
                  }))
                }
              >
                {LEVELS.map((l) => (
                  <MenuItem key={l} value={l}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: LEVEL_COLORS[l],
                        }}
                      />
                      {l}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Chủ đề *"
              value={formData.topic}
              onChange={(e) =>
                setFormData((p) => ({ ...p, topic: e.target.value }))
              }
              fullWidth
              size="small"
              placeholder="VD: Gia đình, Công việc..."
              InputProps={{
                endAdornment: topics.length > 0 && (
                  <InputAdornment position="end">
                    <Select
                      variant="standard"
                      disableUnderline
                      value=""
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          topic: e.target.value as string,
                        }))
                      }
                      displayEmpty
                      sx={{ fontSize: 12, color: "#B90000", minWidth: 20 }}
                    >
                      <MenuItem value="" disabled>
                        <Typography variant="caption">Chọn</Typography>
                      </MenuItem>
                      {topics.map((t) => (
                        <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TextField
            label="Câu ví dụ (tiếng Nhật)"
            value={formData.example}
            onChange={(e) =>
              setFormData((p) => ({ ...p, example: e.target.value }))
            }
            fullWidth
            size="small"
            multiline
            rows={2}
          />

          <TextField
            label="Nghĩa câu ví dụ"
            value={formData.exampleMeaning}
            onChange={(e) =>
              setFormData((p) => ({ ...p, exampleMeaning: e.target.value }))
            }
            fullWidth
            size="small"
          />

          <TextField
            label="Tags (ngăn cách bởi dấu phẩy)"
            value={(formData.tags || []).join(", ")}
            onChange={(e) => handleTagsChange(e.target.value)}
            fullWidth
            size="small"
            placeholder="VD: danh từ, hành động"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: "#888" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, minWidth: 100 }}
          >
            {editingId ? "Lưu" : "Thêm mới"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── DELETE CONFIRM ──────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa từ{" "}
            <strong>"{deleteTarget?.word}"</strong>?
            Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: "#888" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleteLoading}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" } }}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── IMPORT RESULT ───────────────────────────────────────────────────── */}
      <Dialog
        open={openImportResult}
        onClose={() => setOpenImportResult(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Kết quả Import</DialogTitle>
        <DialogContent>
          {importResult && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Alert
                severity={
                  importResult.errors.length === 0 ? "success" : "warning"
                }
                icon={
                  importResult.errors.length === 0 ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )
                }
              >
                {importResult.message}
              </Alert>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    bgcolor: "#e8f5e9",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="#2e7d32">
                    {importResult.created}
                  </Typography>
                  <Typography variant="caption" color="#2e7d32">
                    Từ mới thêm
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    bgcolor: "#e3f2fd",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="#1565C0">
                    {importResult.updated}
                  </Typography>
                  <Typography variant="caption" color="#1565C0">
                    Từ cập nhật
                  </Typography>
                </Box>
              </Box>
              {importResult.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="#B90000" mb={0.5}>
                    Lỗi ({importResult.errors.length}):
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 150,
                      overflowY: "auto",
                      bgcolor: "#fff5f5",
                      border: "1px solid #ffcccc",
                      borderRadius: "8px",
                      p: 1,
                    }}
                  >
                    {importResult.errors.map((e, i) => (
                      <Typography key={i} variant="caption" display="block" color="#B90000">
                        {e}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setOpenImportResult(false)}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" } }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VocabularyManagement;
