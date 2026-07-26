import React, { useState, useEffect, useCallback } from "react";
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
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Checkbox,
  TablePagination,
} from "@mui/material";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  X,
  BookOpen,
  RefreshCw,
  FileText,
  BrainCircuit,
  PlusCircle,
  Check,
} from "lucide-react";
import { grammarService } from "../../services/grammar.service";
import type { JLPTLevel, IGrammarDocument, IGrammarCard } from "../../services/grammar.service";
import DateRangeFilter from "../../components/grammar/DateRangeFilter";
import type { DateRangeValue } from "../../components/grammar/DateRangeFilter";
import { getAxiosErrorMessage } from "../../utils/axiosError";
import { useGrammarDocumentProgress } from "../../hooks/useGrammarDocumentProgress";
import { brandColors } from "../../theme/theme";


const LEVELS: JLPTLevel[] = ["N5", "N4", "N3", "N2", "N1"];

const LEVEL_COLORS: Record<string, string> = {
  N1: "#7B1FA2",
  N2: "#1565C0",
  N3: "#2E7D32",
  N4: "#F57F17",
  N5: "#B90000",
};

const emptyCardForm: Omit<IGrammarCard, "_id" | "createdBy"> = {
  centerId: "MIRAI_CENTER",
  level: "N5",
  title: "",
  structure: "",
  meaningVi: "",
  explanation: "",
  examples: [],
};

const AdminGrammarManagement: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<IGrammarDocument[]>([]);
  const [cards, setCards] = useState<IGrammarCard[]>([]);

  // Filter states
  const [filterLevel, setFilterLevel] = useState<JLPTLevel | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  // Phase 6: date + sort filter dùng chung cho cards & documents
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({ sortBy: "createdAt", order: "desc" });

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterLevel, dateFilter, tab]);

  // Batch delete states
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [openDeleteBatchDialog, setOpenDeleteBatchDialog] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Reset selection on tab/cards change
  useEffect(() => {
    setSelectedCardIds([]);
  }, [tab, cards]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = cards.map((n) => n._id);
      setSelectedCardIds(newSelecteds);
    } else {
      setSelectedCardIds([]);
    }
  };

  const handleSelectCard = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteCardsBatch = async () => {
    if (selectedCardIds.length === 0) return;
    setBatchDeleting(true);
    try {
      await grammarService.deleteGrammarCardsBatch(selectedCardIds);
      setSelectedCardIds([]);
      setOpenDeleteBatchDialog(false);
      fetchCards();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa hàng loạt thẻ ngữ pháp.");
    } finally {
      setBatchDeleting(false);
    }
  };

  // Phase 5: tổng số kết quả sau filter (để hiển thị count)
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Upload States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadLevel, setUploadLevel] = useState<JLPTLevel>("N5");
  const [uploadCenter, setUploadCenter] = useState("MIRAI_CENTER");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [trackDocId, setTrackDocId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useGrammarDocumentProgress(trackDocId, (msg) => {
    setUploadProgress(msg.progress);
    if (msg.processingStage === "done" || msg.status === "completed") {
      setTrackDocId(null);
      fetchDocuments();
      fetchCards();
    }
    if (msg.status === "failed") {
      setTrackDocId(null);
      setUploadError("Xử lý tài liệu thất bại trên server.");
      fetchDocuments();
    }
  });

  // Manual Card Form Dialog
  const [openCardForm, setOpenCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardFormData, setCardFormData] = useState({ ...emptyCardForm });
  const [cardFormError, setCardFormError] = useState("");
  const [cardFormLoading, setCardFormLoading] = useState(false);

  // Examples Subform in Card Form
  const [exampleJa, setExampleJa] = useState("");
  const [exampleKana, setExampleKana] = useState("");
  const [exampleVi, setExampleVi] = useState("");

  // Delete confirmations
  const [deleteDocTarget, setDeleteDocTarget] = useState<IGrammarDocument | null>(null);
  const [deleteCardTarget, setDeleteCardTarget] = useState<IGrammarCard | null>(null);

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await grammarService.getDocuments({
        level: filterLevel || undefined,
        dateFrom: dateFilter.dateFrom,
        dateTo: dateFilter.dateTo,
        sortBy: dateFilter.sortBy,
        order: dateFilter.order,
      });
      if (res.success) {
        setDocuments(res.documents);
        if (typeof res.count === "number") setTotalCount(res.count);
      }
    } catch (err) {
      console.error(err);
    }
  }, [filterLevel, dateFilter]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await grammarService.getGrammarCards({
        level: filterLevel || undefined,
        search: searchQuery || undefined,
        dateFrom: dateFilter.dateFrom,
        dateTo: dateFilter.dateTo,
        sortBy: dateFilter.sortBy,
        order: dateFilter.order,
      });
      if (res.success) {
        setCards(res.cards);
        if (typeof res.count === "number") setTotalCount(res.count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, searchQuery, dateFilter]);

  useEffect(() => {
    if (tab === 0) {
      fetchCards();
    } else if (tab === 1) {
      fetchDocuments();
    }
  }, [tab, fetchCards, fetchDocuments]);

  // Tự động tải lại danh sách tài liệu mỗi 5 giây nếu có tài liệu đang xử lý OCR ("processing")
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const hasProcessing = documents.some(doc => doc.status === "processing");

    if (tab === 1 && hasProcessing) {
      interval = setInterval(() => {
        fetchDocuments();
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [tab, documents, fetchDocuments]);

  // Tự động tải lại danh sách thẻ ngữ pháp mỗi 10 giây khi đang có tài liệu processing
  // (để thẻ tự xuất hiện sau khi Gemini trích xuất xong mà không cần F5)
  useEffect(() => {
    let cardInterval: ReturnType<typeof setInterval> | null = null;
    const hasProcessing = documents.some(doc => doc.status === "processing");

    if (tab === 0 && hasProcessing) {
      cardInterval = setInterval(() => {
        fetchCards();
      }, 10000);
    }

    return () => {
      if (cardInterval) clearInterval(cardInterval);
    };
  }, [tab, documents, fetchCards]);

  // ─── Document Handlers ──────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Vui lòng chọn file PDF.");
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError("Vui lòng nhập tên tài liệu.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const res = await grammarService.uploadDocument(uploadFile, uploadTitle, uploadCenter, uploadLevel);
      setUploadSuccess("Tài liệu đã tải lên! Hệ thống đang OCR và phân mảnh nền.");
      if (res.document?._id) setTrackDocId(res.document._id);
      setUploadTitle("");
      setUploadFile(null);
      fetchDocuments();
    } catch (err: unknown) {
      setUploadError(getAxiosErrorMessage(err, "Lỗi khi tải lên tài liệu."));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocTarget) return;
    try {
      await grammarService.deleteDocument(deleteDocTarget._id);
      setDeleteDocTarget(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Grammar Card CRUD Handlers ──────────────────────────────────────────
  const handleOpenCreateCard = () => {
    setEditingCardId(null);
    setCardFormData({ ...emptyCardForm });
    setCardFormError("");
    setExampleJa("");
    setExampleKana("");
    setExampleVi("");
    setOpenCardForm(true);
  };

  const handleOpenEditCard = (card: IGrammarCard) => {
    setEditingCardId(card._id);
    setCardFormData({
      centerId: card.centerId,
      level: card.level,
      title: card.title,
      structure: card.structure,
      meaningVi: card.meaningVi,
      explanation: card.explanation,
      examples: card.examples || [],
    });
    setCardFormError("");
    setExampleJa("");
    setExampleKana("");
    setExampleVi("");
    setOpenCardForm(true);
  };

  const handleAddExample = () => {
    if (!exampleJa.trim() || !exampleKana.trim() || !exampleVi.trim()) {
      alert("Vui lòng điền đủ câu ví dụ, phiên âm và bản dịch.");
      return;
    }
    setCardFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { japanese: exampleJa.trim(), furigana: exampleKana.trim(), vietnamese: exampleVi.trim() }]
    }));
    setExampleJa("");
    setExampleKana("");
    setExampleVi("");
  };

  const handleRemoveExample = (index: number) => {
    setCardFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveCard = async () => {
    if (!cardFormData.title.trim() || !cardFormData.structure.trim() || !cardFormData.meaningVi.trim() || !cardFormData.explanation.trim()) {
      setCardFormError("Vui lòng điền tất cả các trường bắt buộc (*).");
      return;
    }
    setCardFormLoading(true);
    setCardFormError("");
    try {
      if (editingCardId) {
        await grammarService.updateGrammarCard(editingCardId, cardFormData);
      } else {
        await grammarService.createGrammarCard(cardFormData);
      }
      setOpenCardForm(false);
      fetchCards();
    } catch (err: unknown) {
      setCardFormError(getAxiosErrorMessage(err, "Lỗi lưu thẻ ngữ pháp."));
    } finally {
      setCardFormLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget) return;
    try {
      await grammarService.deleteGrammarCard(deleteCardTarget._id);
      setDeleteCardTarget(null);
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  // (RAG Generation Handlers removed)

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: "#B90000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a1a">
              Thiết kế Học Ngữ pháp
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quản lý tài liệu PDF và thẻ ngữ pháp JLPT N5 - N1 tự động
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          {tab === 0 && selectedCardIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={16} />}
              onClick={() => setOpenDeleteBatchDialog(true)}
              sx={{ borderRadius: "8px", fontWeight: 600 }}
            >
              Xóa {selectedCardIds.length} mục đã chọn
            </Button>
          )}
          <Tooltip title="Làm mới dữ liệu">
            <IconButton onClick={tab === 0 ? fetchCards : fetchDocuments} sx={{ border: "1px solid #eee" }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleOpenCreateCard}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, borderRadius: "8px", fontWeight: 600 }}
          >
            Thêm thẻ ngữ pháp
          </Button>
        </Box>
      </Box>

      {/* Tabs navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" sx={{ "& .MuiTabs-indicator": { bgcolor: "#B90000" } }}>
          <Tab label="Danh sách thẻ Ngữ pháp" sx={{ fontWeight: 600 }} />
          <Tab label="Quản lý Tài liệu PDF (OCR)" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* Filter and search bar (Visible in Tab 0 and 1) */}
      {tab !== 2 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: `1px solid ${brandColors.border}`,
            borderRadius: "16px",
            bgcolor: "#ffffff",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            {tab === 0 && (
              <TextField
                placeholder="Tìm kiếm ngữ pháp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ 
                  width: 240,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&.Mui-focused fieldset': { borderColor: brandColors.red }
                  }
                }}
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8, color: "#999" }} />,
                }}
              />
            )}

            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel sx={{ '&.Mui-focused': { color: brandColors.red } }}>Cấp độ JLPT</InputLabel>
              <Select
                label="Cấp độ JLPT"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as JLPTLevel | "")}
                sx={{
                  borderRadius: '8px',
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: brandColors.red
                  }
                }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                {LEVELS.map(l => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

            {totalCount !== null && (
              <Box sx={{ marginLeft: "auto" }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Tổng: ${totalCount} ${tab === 0 ? "thẻ" : "tài liệu"}`}
                  sx={{ 
                    fontWeight: 700,
                    borderColor: brandColors.redLight,
                    color: brandColors.red,
                    bgcolor: brandColors.redSoft,
                    borderRadius: '8px',
                    px: 1,
                    py: 1.8
                  }}
                />
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* ─── TAB 0: CARDS TABLE ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <Paper elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress color="inherit" /></Box>
          ) : cards.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <BookOpen size={48} color="#ccc" style={{ marginBottom: 12 }} />
              <Typography color="text.secondary">Chưa có thẻ ngữ pháp nào được tạo.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedCardIds.length > 0 && selectedCardIds.length < cards.length}
                        checked={cards.length > 0 && selectedCardIds.length === cards.length}
                        onChange={handleSelectAllClick}
                        sx={{
                          color: "#ccc",
                          "&.Mui-checked": { color: "#B90000" },
                          "&.MuiCheckbox-indeterminate": { color: "#B90000" },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mẫu ngữ pháp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cấu trúc</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ý nghĩa tiếng Việt</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cấp độ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ví dụ mẫu</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cards.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((card) => {
                    const isItemSelected = selectedCardIds.includes(card._id);
                    return (
                      <TableRow
                        key={card._id}
                        hover
                        selected={isItemSelected}
                        onClick={() => handleSelectCard(card._id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isItemSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleSelectCard(card._id)}
                            sx={{
                              color: "#ccc",
                              "&.Mui-checked": { color: "#B90000" },
                            }}
                          />
                        </TableCell>
                        <TableCell><Typography fontWeight={700}>{card.title}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{card.structure}</Typography></TableCell>
                        <TableCell><Typography fontSize={13}>{card.meaningVi}</Typography></TableCell>
                        <TableCell>
                          <Chip
                            label={card.level}
                            size="small"
                            sx={{ bgcolor: LEVEL_COLORS[card.level] + "18", color: LEVEL_COLORS[card.level], fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          {card.examples && card.examples.length > 0 ? (
                            <Typography fontSize={12} color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                              {card.examples[0].japanese}
                            </Typography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditCard(card);
                              }}
                              sx={{ color: "#1565C0" }}
                            >
                              <Pencil size={15} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteCardTarget(card);
                              }}
                              sx={{ color: "#B90000" }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={cards.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Số hàng mỗi trang:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  minHeight: "52px",
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  margin: 0,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiTablePagination-select": {
                  display: "inline-flex",
                  alignItems: "center",
                  paddingTop: 0,
                  paddingBottom: 0,
                },
                "& .MuiTablePagination-actions": {
                  display: "inline-flex",
                  alignItems: "center",
                  marginLeft: 1,
                  "& button": {
                    padding: "8px",
                  }
                }
              }}
            />
          </>
          )}
        </Paper>
      )}

      {/* ─── TAB 1: PDF OCR UPLOAD & LIST ────────────────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {/* Form Upload */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Tải lên tài liệu mới</Typography>
                <Divider sx={{ mb: 2 }} />
                
                {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
                {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}

                <Box component="form" onSubmit={handleUpload} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Tên tài liệu *"
                    size="small"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="VD: Giáo trình Minna no Nihongo N4"
                  />

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Cấp độ JLPT</InputLabel>
                      <Select value={uploadLevel} onChange={(e) => setUploadLevel(e.target.value as JLPTLevel)} label="Cấp độ JLPT">
                        {LEVELS.map(l => (
                          <MenuItem key={l} value={l}>{l}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Mã trung tâm"
                      size="small"
                      fullWidth
                      value={uploadCenter}
                      onChange={(e) => setUploadCenter(e.target.value)}
                    />
                  </Box>

                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<Upload size={16} />}
                    sx={{ py: 1.2, borderColor: "#ccc", color: "#666", "&:hover": { borderColor: "#999" } }}
                  >
                    {uploadFile ? uploadFile.name : "Chọn file PDF tài liệu"}
                    <input type="file" accept="application/pdf" hidden onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={uploading}
                    sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, py: 1.2 }}
                  >
                    {uploading ? <CircularProgress size={20} color="inherit" /> : "Gửi lên & Xử lý OCR"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* List documents */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", overflow: "hidden" }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Tên tài liệu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tên file</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Cấp độ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Số trang</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Chunks</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <FileText size={32} color="#ccc" style={{ marginBottom: 8 }} />
                          <Typography color="text.secondary">Chưa có tài liệu PDF nào.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents.map((doc) => (
                        <TableRow key={doc._id} hover>
                          <TableCell><Typography fontWeight={600}>{doc.title}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{doc.filePath}</Typography></TableCell>
                          <TableCell>
                            <Chip label={doc.level} size="small" sx={{ bgcolor: LEVEL_COLORS[doc.level] + "18", color: LEVEL_COLORS[doc.level], fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            {doc.status === "completed" && <Chip label="Đã nén vector" color="success" size="small" />}
                            {doc.status === "processing" && <Chip label="Đang dịch OCR..." color="warning" size="small" icon={<CircularProgress size={12} color="inherit" />} />}
                            {doc.status === "failed" && <Chip label="Thất bại" color="error" size="small" />}
                          </TableCell>
                          <TableCell>{doc.totalPages || "Đang đếm"}</TableCell>
                          <TableCell>{doc.chunkCount ?? "—"}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => setDeleteDocTarget(doc)} sx={{ color: "#B90000" }}><Trash2 size={15} /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* (TAB 2: AI DRAFT CARDS RAG ASSISTANT removed) */}

      {/* ─── MANUAL CARD DIALOG FORM ────────────────────────────────────────── */}
      <Dialog open={openCardForm} onClose={() => setOpenCardForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCardId ? "Chỉnh sửa thẻ ngữ pháp" : "Tạo thẻ ngữ pháp mới"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2.5 }}>
          {cardFormError && <Alert severity="error">{cardFormError}</Alert>}

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Tên mẫu ngữ pháp *"
              size="small"
              fullWidth
              value={cardFormData.title}
              onChange={(e) => setCardFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              label="Cấu trúc kết hợp *"
              size="small"
              fullWidth
              value={cardFormData.structure}
              onChange={(e) => setCardFormData(prev => ({ ...prev, structure: e.target.value }))}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Cấp độ JLPT *</InputLabel>
              <Select
                value={cardFormData.level}
                onChange={(e) => setCardFormData(prev => ({ ...prev, level: e.target.value as JLPTLevel }))}
                label="Cấp độ JLPT *"
              >
                {LEVELS.map(l => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Mã trung tâm"
              size="small"
              fullWidth
              value={cardFormData.centerId}
              onChange={(e) => setCardFormData(prev => ({ ...prev, centerId: e.target.value }))}
            />
          </Box>

          <TextField
            label="Ý nghĩa tiếng Việt *"
            size="small"
            fullWidth
            value={cardFormData.meaningVi}
            onChange={(e) => setCardFormData(prev => ({ ...prev, meaningVi: e.target.value }))}
          />

          <TextField
            label="Giải thích chi tiết *"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={cardFormData.explanation}
            onChange={(e) => setCardFormData(prev => ({ ...prev, explanation: e.target.value }))}
          />

          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>Danh sách Ví dụ mẫu ({cardFormData.examples.length})</Typography>

          <Box sx={{ p: 2, border: "1px dashed #ccc", borderRadius: "8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField label="Câu ví dụ (tiếng Nhật)" size="small" fullWidth value={exampleJa} onChange={(e) => setExampleJa(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Phiên âm (Furigana)" size="small" fullWidth value={exampleKana} onChange={(e) => setExampleKana(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Dịch tiếng Việt" size="small" fullWidth value={exampleVi} onChange={(e) => setExampleVi(e.target.value)} />
              </Grid>
            </Grid>
            <Button size="small" startIcon={<PlusCircle size={14} />} onClick={handleAddExample} sx={{ color: "#B90000", alignSelf: "flex-end" }}>Thêm vào danh sách</Button>
          </Box>

          {cardFormData.examples.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {cardFormData.examples.map((ex, idx) => (
                <Box key={idx} sx={{ p: 1.5, bgcolor: "#f9f9f9", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography fontSize={13} fontWeight={700}>{ex.japanese}</Typography>
                    <Typography fontSize={11} color="text.secondary">{ex.furigana}</Typography>
                    <Typography fontSize={12}>{ex.vietnamese}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleRemoveExample(idx)} sx={{ color: "#B90000" }}><X size={15} /></IconButton>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpenCardForm(false)} sx={{ color: "#888" }}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSaveCard}
            disabled={cardFormLoading}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, minWidth: 100 }}
          >
            {cardFormLoading ? <CircularProgress size={16} color="inherit" /> : "Lưu thẻ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DOC CONFIRM DIALOG */}
      <Dialog open={!!deleteDocTarget} onClose={() => setDeleteDocTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa tài liệu?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa tài liệu <strong>{deleteDocTarget?.title}</strong>? Thao tác này sẽ xóa vĩnh viễn tài liệu gốc cùng toàn bộ các mảnh văn bản vector (chunks) đã lưu trong Vector Database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDocTarget(null)} sx={{ color: "#888" }}>Hủy</Button>
          <Button onClick={handleDeleteDocument} sx={{ color: "#B90000" }}>Xóa vĩnh viễn</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CARD CONFIRM DIALOG */}
      <Dialog open={!!deleteCardTarget} onClose={() => setDeleteCardTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa thẻ ngữ pháp?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa thẻ ngữ pháp <strong>{deleteCardTarget?.title}</strong>? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCardTarget(null)} sx={{ color: "#888" }}>Hủy</Button>
          <Button onClick={handleDeleteCard} sx={{ color: "#B90000" }}>Xóa</Button>
        </DialogActions>
      </Dialog>

      {/* BATCH DELETE CARD CONFIRM DIALOG */}
      <Dialog open={openDeleteBatchDialog} onClose={() => setOpenDeleteBatchDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa loạt thẻ ngữ pháp?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa <strong>{selectedCardIds.length}</strong> thẻ ngữ pháp đã chọn? Thao tác này sẽ xóa vĩnh viễn các thẻ này và không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteBatchDialog(false)} sx={{ color: "#888" }} disabled={batchDeleting}>Hủy</Button>
          <Button onClick={handleDeleteCardsBatch} sx={{ color: "#B90000" }} disabled={batchDeleting}>
            {batchDeleting ? <CircularProgress size={16} color="inherit" /> : "Xóa tất cả đã chọn"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminGrammarManagement;
