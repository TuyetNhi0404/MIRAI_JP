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
  Upload,
  Trash2,
  BookOpen,
  RefreshCw,
  FileText,
  BrainCircuit,
  Check,
  Lock,
} from "lucide-react";
import { grammarService } from "../../services/grammar.service";
import type {
  JLPTLevel,
  IGrammarDocument,
  IGrammarCard,
} from "../../services/grammar.service";
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

// Phase 5/6: trang teacher — upload riêng, xem danh sách (read-only) + date filter,
// generate draft cards scope về 1 tài liệu cụ thể.
const TeacherGrammarMaterials: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<IGrammarDocument[]>([]);
  const [filterLevel, setFilterLevel] = useState<JLPTLevel | "">("");
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({ sortBy: "createdAt", order: "desc" });
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Upload states
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
    }
    if (msg.status === "failed") {
      setTrackDocId(null);
      setUploadError("Xử lý tài liệu thất bại.");
      fetchDocuments();
    }
  });

  // RAG states (teacher chỉ RAG trên 1 tài liệu)
  const [ragTopic, setRagTopic] = useState("");
  const [ragLevel, setRagLevel] = useState<JLPTLevel>("N5");
  const [ragCenter, setRagCenter] = useState("MIRAI_CENTER");
  const [ragDocumentId, setRagDocumentId] = useState<string>("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragDrafts, setRagDrafts] = useState<Omit<IGrammarCard, "_id" | "createdBy">[]>([]);
  const [ragError, setRagError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<IGrammarDocument | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [filterLevel, dateFilter]);

  useEffect(() => {
    if (tab === 0 || tab === 2) fetchDocuments();
  }, [tab, fetchDocuments]);

  // Auto refresh khi còn document đang processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // ─── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError("Vui lòng chọn file PDF."); return; }
    if (!uploadTitle.trim()) { setUploadError("Vui lòng nhập tên tài liệu."); return; }
    if (uploadFile.size > 20 * 1024 * 1024) {
      setUploadError("File vượt quá 20MB. Vui lòng chọn file nhỏ hơn."); return;
    }
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      // Phase 5: teacher upload mặc định scope = "private"
      const res = await grammarService.uploadDocument(uploadFile, uploadTitle, uploadCenter, uploadLevel, "private");
      setUploadSuccess("Tài liệu đã tải lên! Hệ thống đang OCR và phân mảnh vector nền.");
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

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await grammarService.deleteDocument(deleteTarget._id);
      setDeleteTarget(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── RAG ──────────────────────────────────────────────────────────────────
  const handleGenerateDrafts = async () => {
    if (!ragTopic.trim()) { setRagError("Vui lòng nhập chủ đề ngữ pháp cần soạn."); return; }
    if (!ragDocumentId) {
      setRagError("Vui lòng chọn 1 tài liệu làm nguồn RAG. Teacher chỉ được soạn từ tài liệu của mình hoặc tài liệu shared.");
      return;
    }
    setRagLoading(true);
    setRagError("");
    setRagDrafts([]);
    try {
      const res = await grammarService.generateDraftCards(ragCenter, ragLevel, ragTopic, ragDocumentId);
      if (res.success) {
        setRagDrafts(res.draftCards);
        if (res.contextChunksFound === 0) {
          setRagError("Không tìm thấy context liên quan trong tài liệu đã chọn. Hãy thử tài liệu khác hoặc đổi chủ đề.");
        } else if (res.draftCards.length === 0) {
          setRagError("AI không sinh được thẻ phù hợp. Hãy thử đổi chủ đề.");
        }
      }
    } catch (err: unknown) {
      setRagError(getAxiosErrorMessage(err, "Lỗi AI sinh bản thảo."));
    } finally {
      setRagLoading(false);
    }
  };

  const handleApproveDraft = async (draft: Omit<IGrammarCard, "_id" | "createdBy">) => {
    try {
      await grammarService.createGrammarCard({
        ...draft,
        centerId: ragCenter,
        level: ragLevel,
      });
      setRagDrafts(prev => prev.filter(d => d !== draft));
    } catch (err: unknown) {
      alert(getAxiosErrorMessage(err, "Lỗi lưu thẻ ngữ pháp."));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: "#B90000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={22} color="#fff" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a1a1a">
            Tài liệu Ngữ pháp của tôi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload giáo trình riêng, RAG và sinh thẻ ngữ pháp từ tài liệu bạn chọn
          </Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        icon={<Lock size={18} style={{ color: brandColors.red }} />}
        sx={{
          mb: 2,
          bgcolor: brandColors.redSoft,
          color: brandColors.ink,
          border: `1px solid ${brandColors.redLight}`,
          '& .MuiAlert-icon': {
            color: brandColors.red,
          }
        }}
      >
        Tài liệu bạn upload mặc định ở chế độ <strong>private</strong> (chỉ bạn thấy). Admin có thể
        đánh dấu <strong>shared</strong> để chia sẻ với các giáo viên khác cùng trung tâm.
      </Alert>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" sx={{ "& .MuiTabs-indicator": { bgcolor: "#B90000" } }}>
          <Tab label="Danh sách tài liệu" sx={{ fontWeight: 600 }} />
          <Tab label="Upload tài liệu mới" sx={{ fontWeight: 600 }} />
          <Tab label="AI Trợ lý Soạn thảo (RAG)" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* ─── TAB 0: LIST + DATE FILTER (READ-ONLY VIEW) ────────────────────── */}
      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${brandColors.border}`,
              borderRadius: "12px",
              bgcolor: "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
              {/* JLPT Level filter */}
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

              {/* DateRangeFilter */}
              <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

              {/* Reload Button */}
              <Tooltip title="Làm mới">
                <IconButton onClick={fetchDocuments} sx={{ border: "1px solid #eee", height: 38, width: 38, borderRadius: "8px" }}>
                  <RefreshCw size={16} />
                </IconButton>
              </Tooltip>

              {/* Total count - align to right */}
              {totalCount !== null && (
                <Box sx={{ marginLeft: "auto" }}>
                  <Chip size="small" variant="outlined" label={`Tổng: ${totalCount} tài liệu`} sx={{ fontWeight: 600 }} />
                </Box>
              )}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", overflow: "hidden" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress color="inherit" /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Tên tài liệu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Cấp độ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Số trang</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Chunks</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ngày upload</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <FileText size={32} color="#ccc" style={{ marginBottom: 8 }} />
                          <Typography color="text.secondary">Bạn chưa upload tài liệu nào. Vào tab "Upload tài liệu mới" để bắt đầu.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents.map(doc => (
                        <TableRow key={doc._id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{doc.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{doc.filePath}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.level}
                              size="small"
                              sx={{ bgcolor: LEVEL_COLORS[doc.level] + "18", color: LEVEL_COLORS[doc.level], fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            {doc.status === "completed" && <Chip label="Sẵn sàng" color="success" size="small" />}
                            {doc.status === "processing" && <Chip label="Đang xử lý..." color="warning" size="small" icon={<CircularProgress size={12} color="inherit" />} />}
                            {doc.status === "failed" && <Chip label="Thất bại" color="error" size="small" />}
                          </TableCell>
                          <TableCell>
                            {doc.scope === "shared"
                              ? <Chip label="Chia sẻ" size="small" color="info" variant="outlined" />
                              : <Chip label="Riêng tư" size="small" variant="outlined" />
                            }
                          </TableCell>
                          <TableCell>{doc.totalPages || "—"}</TableCell>
                          <TableCell>{doc.chunkCount ?? "—"}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("vi-VN") : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Xóa tài liệu">
                              <IconButton size="small" onClick={() => setDeleteTarget(doc)} sx={{ color: "#B90000" }}>
                                <Trash2 size={15} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* ─── TAB 1: UPLOAD ──────────────────────────────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Upload tài liệu mới</Typography>
                <Divider sx={{ mb: 2 }} />
                {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
                {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}
                {trackDocId && (
                  <Alert severity="info" sx={{ mb: 2 }}>Tiến độ xử lý: {uploadProgress}%</Alert>
                )}

                <Box component="form" onSubmit={handleUpload} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Tên tài liệu *"
                    size="small"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="VD: Giáo trình Genki N4 - Bài 5"
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
                    {uploadFile ? `${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(1)}MB)` : "Chọn file PDF (tối đa 20MB)"}
                    <input
                      type="file"
                      accept="application/pdf"
                      hidden
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={uploading}
                    sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, py: 1.2 }}
                  >
                    {uploading ? <CircularProgress size={20} color="inherit" /> : "Tải lên & Xử lý OCR"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", bgcolor: "#FAFAFA" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Hướng dẫn</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box component="ol" sx={{ pl: 2.5, color: "#555", fontSize: 14, lineHeight: 1.8 }}>
                  <li>Chọn file PDF giáo trình (tối đa 20MB).</li>
                  <li>Sau khi upload, hệ thống sẽ tự động OCR + chia nhỏ thành các đoạn vector (chunks).</li>
                  <li>Tài liệu của bạn mặc định ở chế độ <strong>private</strong> — chỉ bạn dùng để RAG.</li>
                  <li>Khi status = <strong>"Sẵn sàng"</strong>, sang tab <strong>AI Trợ lý</strong> để chọn tài liệu này và soạn thẻ ngữ pháp.</li>
                  <li>Admin có thể đổi tài liệu của bạn sang <strong>shared</strong> để chia sẻ với giáo viên khác cùng trung tâm.</li>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ─── TAB 2: RAG (TEACHER — bắt buộc chọn document) ────────────────── */}
      {tab === 2 && (
        <Box>
          <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BrainCircuit size={20} color="#B90000" />
                Soạn thẻ ngữ pháp từ tài liệu của tôi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Teacher chỉ được RAG trên 1 tài liệu cụ thể (của bạn hoặc shared). Điều này tránh trộn
                lẫn nhiều giáo trình khác nhau trong cùng level.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {ragError && <Alert severity={ragDrafts.length > 0 ? "warning" : "error"} sx={{ mb: 2 }}>{ragError}</Alert>}

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Chủ đề ngữ pháp cần soạn *"
                    fullWidth
                    size="small"
                    value={ragTopic}
                    onChange={(e) => setRagTopic(e.target.value)}
                    placeholder="Ví dụ: V-てしまう, Mẫu câu từ bài 5 Genki"
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
                  <FormControl size="small" fullWidth required>
                    <InputLabel>Tài liệu nguồn *</InputLabel>
                    <Select
                      label="Tài liệu nguồn *"
                      value={ragDocumentId}
                      onChange={(e) => setRagDocumentId(e.target.value as string)}
                    >
                      {documents
                        .filter(d => d.status === "completed")
                        .map(d => (
                          <MenuItem key={d._id} value={d._id}>
                            {d.title} ({d.level}) {d.scope === "shared" ? "• chia sẻ" : ""}
                          </MenuItem>
                        ))}
                      {documents.filter(d => d.status === "completed").length === 0 && (
                        <MenuItem value="" disabled>Chưa có tài liệu nào sẵn sàng</MenuItem>
                      )}
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

          {ragDrafts.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Bản thảo đề xuất từ AI ({ragDrafts.length})
              </Typography>
              <Grid container spacing={3}>
                {ragDrafts.map((draft, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined" sx={{ borderRadius: "8px" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                          <Typography variant="h6" fontWeight={700} color="#B90000">{draft.title}</Typography>
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<Check size={14} />}
                            onClick={() => handleApproveDraft(draft)}
                          >
                            Phê duyệt & Lưu
                          </Button>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600}>Cấu trúc:</Typography>
                            <Typography variant="body2" sx={{ fontFamily: "monospace", p: 1, bgcolor: "#f9f9f9", borderRadius: "4px" }}>
                              {draft.structure}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600}>Ý nghĩa:</Typography>
                            <Typography variant="body2" sx={{ p: 1, bgcolor: "#f9f9f9", borderRadius: "4px", fontWeight: 600 }}>
                              {draft.meaningVi}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight={600}>Giải thích:</Typography>
                            <Typography variant="body2" sx={{ p: 1, bgcolor: "#f9f9f9", borderRadius: "4px" }}>
                              {draft.explanation}
                            </Typography>
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

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa tài liệu?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Xóa <strong>{deleteTarget?.title}</strong> sẽ xóa luôn toàn bộ vector chunks liên quan. Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: "#888" }}>Hủy</Button>
          <Button onClick={handleDelete} sx={{ color: "#B90000" }}>Xóa vĩnh viễn</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherGrammarMaterials;
