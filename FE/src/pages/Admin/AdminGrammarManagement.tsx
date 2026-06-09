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

  // Phase 5: tổng số kết quả sau filter (để hiển thị count)
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Phase 5: dropdown chọn document cho RAG (admin có thể scope về 1 tài liệu)
  const [ragDocumentId, setRagDocumentId] = useState<string>("");

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

  // RAG draft assistant states
  const [ragTopic, setRagTopic] = useState("");
  const [ragLevel, setRagLevel] = useState<JLPTLevel>("N5");
  const [ragCenter, setRagCenter] = useState("MIRAI_CENTER");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragDrafts, setRagDrafts] = useState<Omit<IGrammarCard, "_id" | "createdBy">[]>([]);
  const [ragError, setRagError] = useState("");

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
    } else if (tab === 1 || tab === 2) {
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

  // ─── RAG Generation Handlers ──────────────────────────────────────────────
  const handleGenerateDrafts = async () => {
    if (!ragTopic.trim()) {
      setRagError("Vui lòng nhập chủ đề ngữ pháp cần soạn.");
      return;
    }
    setRagLoading(true);
    setRagError("");
    setRagDrafts([]);

    try {
      const res = await grammarService.generateDraftCards(
        ragCenter,
        ragLevel,
        ragTopic,
        ragDocumentId || undefined
      );
      if (res.success) {
        setRagDrafts(res.draftCards);
        if (res.contextChunksFound === 0) {
          setRagError("Không tìm thấy context liên quan trong tài liệu đã chọn. Hãy thử tài liệu khác hoặc bỏ chọn để dùng toàn bộ tài liệu cùng level.");
        } else if (res.draftCards.length === 0) {
          setRagError("AI không sinh được thẻ phù hợp. Hãy thử đổi chủ đề.");
        }
      }
    } catch (err: unknown) {
      setRagError(getAxiosErrorMessage(err, "Lỗi AI sinh bản thảo. Đảm bảo bạn đã upload tài liệu gốc phù hợp."));
    } finally {
      setRagLoading(false);
    }
  };

  const handleApproveDraft = async (draft: Omit<IGrammarCard, "_id" | "createdBy">, index: number) => {
    try {
      const res = await grammarService.createGrammarCard({
        ...draft,
        centerId: ragCenter,
        level: ragLevel
      });
      if (res.success) {
        // Loại bỏ thẻ đã duyệt khỏi danh sách draft
        setRagDrafts(prev => prev.filter((_, idx) => idx !== index));
        fetchCards();
      }
    } catch (err: unknown) {
      alert(getAxiosErrorMessage(err, "Lỗi lưu thẻ ngữ pháp được duyệt."));
    }
  };

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
              Quản lý tài liệu PDF, phân mảnh RAG, tạo câu hỏi AI và thẻ ngữ pháp JLPT N5 - N1
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
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
          <Tab label="AI Trợ lý Soạn thảo (RAG)" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* Filter and search bar (Visible in Tab 0 and 1) */}
      {tab !== 2 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `1px solid ${brandColors.border}`,
            borderRadius: "12px",
            bgcolor: "#ffffff",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            {tab === 0 && (
              <TextField
                placeholder="Tìm kiếm ngữ pháp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ width: 220 }}
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8, color: "#999" }} />,
                }}
              />
            )}

            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Cấp độ JLPT</InputLabel>
              <Select
                label="Cấp độ JLPT"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as JLPTLevel | "")}
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
                  sx={{ fontWeight: 600 }}
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
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Mẫu ngữ pháp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cấu trúc</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ý nghĩa tiếng Việt</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cấp độ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ví dụ mẫu</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card._id} hover>
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
                          <IconButton size="small" onClick={() => handleOpenEditCard(card)} sx={{ color: "#1565C0" }}><Pencil size={15} /></IconButton>
                          <IconButton size="small" onClick={() => setDeleteCardTarget(card)} sx={{ color: "#B90000" }}><Trash2 size={15} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
                {trackDocId && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Tiến độ xử lý tài liệu: {uploadProgress}%
                  </Alert>
                )}

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

      {/* ─── TAB 2: AI DRAFT CARDS (RAG ASSISTANT) ────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BrainCircuit size={20} color="#B90000" />
                RAG Smart Draft Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nhập chủ đề bạn muốn dạy học sinh. AI sẽ tự động truy vấn ngữ nghĩa (vector embeddings) từ tài liệu PDF bạn đã upload bên trên để tìm ngữ cảnh chính xác của trung tâm, sau đó dùng Gemini soạn thảo thẻ ngữ pháp nháp.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {ragError && <Alert severity="error" sx={{ mb: 2 }}>{ragError}</Alert>}

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Chủ đề ngữ pháp hoặc Mẫu câu cần soạn"
                    fullWidth
                    size="small"
                    value={ragTopic}
                    onChange={(e) => setRagTopic(e.target.value)}
                    placeholder="Ví dụ: Cấu trúc khuyên nhủ, V-たら tốt hơn, Mẫu câu てみる"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Cấp độ JLPT</InputLabel>
                    <Select value={ragLevel} onChange={(e) => setRagLevel(e.target.value as JLPTLevel)} label="Cấp độ JLPT">
                      {LEVELS.map(l => (
                        <MenuItem key={l} value={l}>{l}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Mã trung tâm"
                    size="small"
                    fullWidth
                    value={ragCenter}
                    onChange={(e) => setRagCenter(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Nguồn tài liệu</InputLabel>
                    <Select
                      label="Nguồn tài liệu"
                      value={ragDocumentId}
                      onChange={(e) => setRagDocumentId(e.target.value as string)}
                    >
                      <MenuItem value="">Tất cả tài liệu cùng level</MenuItem>
                      {documents
                        .filter(d => d.status === "completed" && d.level === ragLevel)
                        .map(d => (
                          <MenuItem key={d._id} value={d._id}>
                            {d.title} {d.scope === "shared" ? "(shared)" : ""}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleGenerateDrafts}
                    disabled={ragLoading}
                    sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, py: 1 }}
                  >
                    {ragLoading ? <CircularProgress size={20} color="inherit" /> : "Bắt đầu sinh thẻ"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* AI Output preview drafts */}
          {ragDrafts.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Bản thảo đề xuất từ AI ({ragDrafts.length})</Typography>
              <Grid container spacing={3}>
                {ragDrafts.map((draft, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined" sx={{ borderRadius: "8px", position: "relative" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                          <Typography variant="h6" fontWeight={700} color="#B90000">{draft.title}</Typography>
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<Check size={14} />}
                            onClick={() => handleApproveDraft(draft, index)}
                          >
                            Phê duyệt & Lưu
                          </Button>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600}>Cấu trúc kết hợp:</Typography>
                            <Typography variant="body2" sx={{ fontFamily: "monospace", p: 1, bgcolor: "#f9f9f9", borderRadius: "4px" }}>
                              {draft.structure}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600}>Nghĩa tiếng Việt:</Typography>
                            <Typography variant="body2" sx={{ p: 1, bgcolor: "#f9f9f9", borderRadius: "4px", fontWeight: 600 }}>
                              {draft.meaningVi}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight={600}>Giải thích & Lưu ý sử dụng:</Typography>
                            <Typography variant="body2" sx={{ p: 1, bgcolor: "#f9f9f9", borderRadius: "4px" }}>
                              {draft.explanation}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight={600}>Các câu ví dụ tiêu biểu:</Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                              {draft.examples.map((ex, exIdx) => (
                                <Box key={exIdx} sx={{ pl: 2, borderLeft: "2px solid #ccc" }}>
                                  <Typography variant="body2" fontWeight={700}>{ex.japanese}</Typography>
                                  <Typography variant="caption" color="text.secondary">Phiên âm: {ex.furigana}</Typography>
                                  <Typography variant="body2" color="text.secondary">Dịch: {ex.vietnamese}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

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
    </Box>
  );
};

export default AdminGrammarManagement;
