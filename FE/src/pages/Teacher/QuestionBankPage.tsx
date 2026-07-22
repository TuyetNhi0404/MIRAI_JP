// src/pages/Teacher/QuestionBankPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  IconButton,
  Alert,
  Snackbar,
  CardContent,
  CardActions,
  Slide,
  AlertTitle,
  Tabs,
  Tab,
  Chip,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Checkbox,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add as Plus,
  Edit,
  Delete as Trash2,
  MenuBook as BookOpen,
  ArrowForward as ArrowRight,
  CheckCircle,
  Error as ErrorIcon,
  AutoAwesome as Sparkles,
  HelpOutline,
  Search,
  ExpandMore as ExpandMoreIcon,
  FolderOpen as FolderIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../redux/store";
import {
  fetchChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  clearError,
} from "../../redux/slices/questionSlice";
import ChapterModal from "../../components/question/ChapterModal";
import type { IChapter } from "../../types/question.types";
import { grammarService } from "../../services/grammar.service";
import { courseService } from "../../services/courseService";
import axiosInstance from "../../api/axiosInstance";

const JLPT_LEVELS = ["ALL", "N5", "N4", "N3", "N2", "N1"];

const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { chapters, loading, error } = useSelector((state: RootState) => state.question);

  const [activeTab, setActiveTab] = useState(0);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<IChapter | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Grammar Questions state & filters
  const [grammarQuestions, setGrammarQuestions] = useState<any[]>([]);
  const [loadingGrammarQs, setLoadingGrammarQs] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Create Quiz Modal State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(15);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const fetchGrammarQuestions = async (level = selectedLevel, search = searchQuery) => {
    setLoadingGrammarQs(true);
    try {
      const res = await grammarService.getGrammarQuestionsBank({
        level: level !== "ALL" ? level : undefined,
        search: search.trim() || undefined,
      });
      if (res.success) {
        setGrammarQuestions(res.questions);
      }
    } catch (err) {
      console.error("Lỗi lấy ngân hàng câu hỏi ngữ pháp:", err);
    } finally {
      setLoadingGrammarQs(false);
    }
  };

  useEffect(() => {
    dispatch(fetchChapters());
    fetchGrammarQuestions("ALL", "");
  }, [dispatch]);

  useEffect(() => {
    fetchGrammarQuestions(selectedLevel, searchQuery);
  }, [selectedLevel]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrammarQuestions(selectedLevel, searchQuery);
  };

  // Group questions by Grammar Card ID
  const groupedGrammarQuestions = React.useMemo(() => {
    const groups: Record<string, { card: any; questions: any[] }> = {};
    grammarQuestions.forEach((q) => {
      const card = q.grammarCardId;
      const key = card?._id || "unassigned";
      if (!groups[key]) {
        groups[key] = {
          card: card || { title: "Chưa phân loại", level: "KHÁC", meaningVi: "" },
          questions: [],
        };
      }
      groups[key].questions.push(q);
    });
    return Object.values(groups);
  }, [grammarQuestions]);

  const handleToggleSelectQuestion = (id: string) => {
    setSelectedQIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectGroupQuestions = (groupQs: any[]) => {
    const groupQIds = groupQs.map((q) => q._id);
    const allGroupSelected = groupQIds.every((id) => selectedQIds.includes(id));

    if (allGroupSelected) {
      setSelectedQIds((prev) => prev.filter((id) => !groupQIds.includes(id)));
    } else {
      setSelectedQIds((prev) => [...new Set([...prev, ...groupQIds])]);
    }
  };

  const handleSelectAll = () => {
    if (selectedQIds.length === grammarQuestions.length) {
      setSelectedQIds([]);
    } else {
      setSelectedQIds(grammarQuestions.map((q) => q._id));
    }
  };

  const handleOpenQuizModal = async () => {
    if (selectedQIds.length === 0) return;
    try {
      const courses = await courseService.getTeacherCourses();
      setTeacherCourses(courses);
      if (courses.length > 0) {
        setSelectedCourseId(courses[0]._id || courses[0].id || "");
      }
      setQuizTitle(`Bài kiểm tra Ngữ pháp - ${new Date().toLocaleDateString()}`);
      setQuizDuration(15);
      setQuizModalOpen(true);
    } catch (err) {
      console.error("Lỗi lấy danh sách khóa học:", err);
    }
  };

  const handlePublishQuizDirect = async () => {
    if (!selectedCourseId) {
      alert("Vui lòng chọn lớp học.");
      return;
    }
    if (!quizTitle.trim()) {
      alert("Vui lòng nhập tiêu đề bài kiểm tra.");
      return;
    }

    const selectedQuestions = grammarQuestions.filter((q) => selectedQIds.includes(q._id));
    if (selectedQuestions.length === 0) return;

    setSubmittingQuiz(true);
    try {
      const res = await grammarService.createQuiz({
        courseId: selectedCourseId,
        title: quizTitle,
        durationMinutes: quizDuration,
        questions: selectedQuestions,
      });

      if (res.success) {
        setQuizModalOpen(false);
        setSuccessMsg("Tạo bài kiểm tra thành công!");
        setSelectedQIds([]);
        navigate("/dashboard/teacher/quizzes");
      }
    } catch (err: any) {
      alert(err.message || "Lỗi xuất bản bài kiểm tra.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleChapterSubmit = async (data: { name: string; description?: string }) => {
    try {
      if (editingChapter) {
        await dispatch(updateChapter({ id: editingChapter._id, payload: data })).unwrap();
        setSuccessMsg("Cập nhật chương thành công");
      } else {
        await dispatch(createChapter(data)).unwrap();
        setSuccessMsg("Tạo chương thành công");
      }
      setEditingChapter(null);
    } catch (err) {
      const error = err as Error;
      console.error(error);
    }
  };

  const handleDeleteChapter = async (chapter: IChapter) => {
    if (
      window.confirm(
        `Xóa chương "${chapter.name}"? Tất cả câu hỏi trong chương này cũng sẽ bị xóa.`
      )
    ) {
      try {
        await dispatch(deleteChapter(chapter._id)).unwrap();
        setSuccessMsg("Xóa chương thành công");
      } catch (err) {
        const error = err as Error;
        console.error(error);
      }
    }
  };

  const handleDeleteGrammarQuestion = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa câu hỏi ngữ pháp này khỏi Ngân hàng?")) {
      try {
        await axiosInstance.delete(`/questions/${id}`);
        setSuccessMsg("Xóa câu hỏi thành công");
        setGrammarQuestions((prev) => prev.filter((q) => q._id !== id));
        setSelectedQIds((prev) => prev.filter((item) => item !== id));
      } catch (err) {
        console.error("Lỗi xóa câu hỏi:", err);
      }
    }
  };

  const handleBatchDeleteQuestions = async () => {
    if (selectedQIds.length === 0) return;
    if (window.confirm(`Xóa ${selectedQIds.length} câu hỏi đã chọn khỏi Ngân hàng?`)) {
      try {
        await Promise.all(selectedQIds.map((id) => axiosInstance.delete(`/questions/${id}`)));
        setSuccessMsg(`Đã xóa ${selectedQIds.length} câu hỏi thành công`);
        setGrammarQuestions((prev) => prev.filter((q) => !selectedQIds.includes(q._id)));
        setSelectedQIds([]);
      } catch (err) {
        console.error("Lỗi xóa hàng loạt câu hỏi:", err);
      }
    }
  };

  const handleViewQuestions = (chapterId: string) => {
    navigate(`/dashboard/teacher/questions/${chapterId}`);
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#B90000">
            Ngân hàng câu hỏi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý tất cả câu hỏi theo Chương và câu hỏi Ngữ pháp đã lưu trong hệ thống
          </Typography>
        </Box>
        {activeTab === 0 && (
          <Button
            variant="contained"
            startIcon={<Plus fontSize="small" />}
            onClick={() => {
              setEditingChapter(null);
              setChapterModalOpen(true);
            }}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
          >
            Chương mới
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: "divider", mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              fontWeight: 700,
              fontSize: "1rem",
              textTransform: "none",
            },
          }}
        >
          <Tab icon={<BookOpen sx={{ mr: 1 }} />} iconPosition="start" label="Câu hỏi theo Chương" />
          <Tab
            icon={<Sparkles sx={{ mr: 1, color: "#B90000" }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
                <span>Ngân hàng Câu hỏi Ngữ pháp</span>
                <Chip
                  label={`${grammarQuestions.length} câu`}
                  size="small"
                  sx={{
                    bgcolor: activeTab === 1 ? "#B90000" : "#e2e8f0",
                    color: activeTab === 1 ? "#ffffff" : "#475569",
                    fontWeight: 700,
                    height: 22,
                    fontSize: "0.75rem",
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={handleClearError} 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(211, 47, 47, 0.15)",
            "& .MuiAlert-icon": { fontSize: 28 }
          }}
          icon={<ErrorIcon fontSize="inherit" />}
        >
          <AlertTitle sx={{ fontWeight: 600, fontSize: "1rem" }}>Lỗi</AlertTitle>
          {error}
        </Alert>
      )}

      {/* TAB 0: CHAPTER QUESTIONS */}
      {activeTab === 0 && (
        <>
          {loading && chapters.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography color="text.secondary">Đang tải danh sách chương...</Typography>
            </Box>
          ) : chapters.length === 0 ? (
            <Card sx={{ p: 5, textAlign: "center" }}>
              <BookOpen sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Chưa có chương nào
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Tạo chương đầu tiên để bắt đầu thêm câu hỏi
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus fontSize="small" />}
                onClick={() => setChapterModalOpen(true)}
                sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
              >
                Tạo chương
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {chapters.map((chapter) => (
                <Grid item xs={12} sm={6} md={4} key={chapter._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        boxShadow: 6,
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "start", gap: 2, mb: 2 }}>
                        <Box
                          sx={{
                            bgcolor: "#FFF5E6",
                            p: 1.5,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <BookOpen sx={{ fontSize: 24, color: "#B90000" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={600} gutterBottom>
                            {chapter.name}
                          </Typography>
                          {chapter.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {chapter.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingChapter(chapter);
                            setChapterModalOpen(true);
                          }}
                          sx={{
                            "&:hover": {
                              bgcolor: "#FFF5E6",
                              color: "#B90000",
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteChapter(chapter)}
                          sx={{
                            "&:hover": {
                              bgcolor: "#ffebee",
                              color: "#d32f2f",
                            },
                          }}
                        >
                          <Trash2 fontSize="small" />
                        </IconButton>
                      </Box>

                      <Button
                        variant="contained"
                        size="small"
                        endIcon={<ArrowRight fontSize="small" />}
                        onClick={() => handleViewQuestions(chapter._id)}
                        sx={{
                          bgcolor: "#B90000",
                          "&:hover": { bgcolor: "#d66609" },
                        }}
                      >
                        Xem câu hỏi
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* TAB 1: GRAMMAR BANK QUESTIONS (ACCORDION FOLDERS VIEW) */}
      {activeTab === 1 && (
        <Box sx={{ mt: 1 }}>
          {/* Controls Bar: Level Chips & Search */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: "14px", mb: 2.5, bgcolor: "#ffffff" }}>
            <Grid container spacing={2} alignItems="center">
              {/* Level Filter Chips */}
              <Grid item xs={12} md={7}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ alignSelf: "center", mr: 1 }}>
                    Trình độ:
                  </Typography>
                  {JLPT_LEVELS.map((lvl) => (
                    <Chip
                      key={lvl}
                      label={lvl === "ALL" ? "Tất cả" : lvl}
                      onClick={() => setSelectedLevel(lvl)}
                      color={selectedLevel === lvl ? "error" : "default"}
                      variant={selectedLevel === lvl ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 700,
                        bgcolor: selectedLevel === lvl ? "#B90000" : "transparent",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Stack>
              </Grid>

              {/* Search Box */}
              <Grid item xs={12} md={5}>
                <Box component="form" onSubmit={handleSearchSubmit}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm câu hỏi hoặc tên ngữ pháp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Global Select All Bar */}
            {grammarQuestions.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px border-dashed #e2e8f0" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Checkbox
                    checked={selectedQIds.length === grammarQuestions.length && grammarQuestions.length > 0}
                    indeterminate={selectedQIds.length > 0 && selectedQIds.length < grammarQuestions.length}
                    onChange={handleSelectAll}
                    size="small"
                  />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {selectedQIds.length > 0
                      ? `Đã chọn ${selectedQIds.length} / ${grammarQuestions.length} câu hỏi`
                      : `Chọn tất cả (${grammarQuestions.length} câu hỏi từ ${groupedGrammarQuestions.length} ngữ pháp)`}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Grouped Accordions by Grammar Card */}
          {loadingGrammarQs ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress color="error" />
              <Typography color="text.secondary" mt={2}>
                Đang lọc Ngân hàng câu hỏi Ngữ pháp...
              </Typography>
            </Box>
          ) : groupedGrammarQuestions.length === 0 ? (
            <Card sx={{ p: 5, textAlign: "center", borderRadius: "16px" }}>
              <HelpOutline sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Không tìm thấy câu hỏi ngữ pháp phù hợp
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Các câu hỏi ngữ pháp sau khi sinh bằng AI hoặc tạo tay trong bài Quiz sẽ tự động lưu và gom nhóm tại đây.
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2}>
              {groupedGrammarQuestions.map((group, gIdx) => {
                const card = group.card;
                const groupQIds = group.questions.map((q) => q._id);
                const isAllGroupSelected = groupQIds.length > 0 && groupQIds.every((id) => selectedQIds.includes(id));
                const isSomeGroupSelected = groupQIds.some((id) => selectedQIds.includes(id));

                return (
                  <Accordion
                    key={card?._id || gIdx}
                    defaultExpanded={gIdx === 0}
                    elevation={0}
                    sx={{
                      border: isSomeGroupSelected ? "1.5px solid #B90000" : "1px solid #e2e8f0",
                      borderRadius: "14px !important",
                      overflow: "hidden",
                      bgcolor: "#ffffff",
                      "&:before": { display: "none" },
                    }}
                  >
                    {/* Accordion Summary Header */}
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: "#B90000" }} />}
                      sx={{
                        bgcolor: isSomeGroupSelected ? "#fff5f5" : "#f8fafc",
                        px: 2.5,
                        py: 1,
                        "& .MuiAccordionSummary-content": { my: 1 },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", flexWrap: "wrap" }}>
                        <Checkbox
                          checked={isAllGroupSelected}
                          indeterminate={isSomeGroupSelected && !isAllGroupSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectGroupQuestions(group.questions);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />

                        <FolderIcon sx={{ color: "#B90000", fontSize: 22 }} />

                        {card?.level && (
                          <Chip
                            label={card.level}
                            size="small"
                            sx={{ bgcolor: "#B90000", color: "#fff", fontWeight: 700, height: 24 }}
                          />
                        )}

                        <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ fontSize: "1.05rem" }}>
                          Ngữ pháp: {card?.title || "Chưa phân loại"}
                        </Typography>

                        {card?.meaningVi && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            ({card.meaningVi})
                          </Typography>
                        )}

                        <Chip
                          label={`${group.questions.length} câu hỏi`}
                          size="small"
                          variant="outlined"
                          sx={{
                            ml: "auto",
                            mr: 1,
                            fontWeight: 700,
                            bgcolor: "#ffffff",
                            borderColor: "#cbd5e1",
                            color: "#475569",
                          }}
                        />
                      </Box>
                    </AccordionSummary>

                    {/* Accordion Details - Questions List */}
                    <AccordionDetails sx={{ p: 2.5, bgcolor: "#ffffff" }}>
                      <Grid container spacing={2}>
                        {group.questions.map((q, idx) => {
                          const isSelected = selectedQIds.includes(q._id);
                          return (
                            <Grid item xs={12} key={q._id || idx}>
                              <Card
                                elevation={0}
                                onClick={() => handleToggleSelectQuestion(q._id)}
                                sx={{
                                  border: isSelected ? "2px solid #B90000" : "1px solid #f1f5f9",
                                  bgcolor: isSelected ? "#fff5f5" : "#f8fafc",
                                  borderRadius: "12px",
                                  p: 2,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  "&:hover": { borderColor: "#B90000", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
                                }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectQuestion(q._id)}
                                      onClick={(e) => e.stopPropagation()}
                                      size="small"
                                      sx={{ p: 0 }}
                                    />
                                    <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                                      Câu {idx + 1}: {q.questionText}
                                    </Typography>
                                  </Box>

                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteGrammarQuestion(q._id);
                                    }}
                                    sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                                  >
                                    <Trash2 fontSize="small" />
                                  </IconButton>
                                </Box>

                                <Grid container spacing={1} sx={{ my: 1, pl: 3.5 }}>
                                  {[q.answer1, q.answer2, q.answer3, q.answer4].map((ans, optIdx) => {
                                    const isCorrect = q.correctAnswer === optIdx + 1;
                                    return (
                                      <Grid item xs={12} sm={6} key={optIdx}>
                                        <Box
                                          sx={{
                                            p: 1,
                                            borderRadius: "6px",
                                            border: isCorrect ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
                                            bgcolor: isCorrect ? "#f0fdf4" : "#ffffff",
                                            color: isCorrect ? "#15803d" : "#334155",
                                            fontWeight: isCorrect ? 700 : 500,
                                            fontSize: "0.875rem",
                                          }}
                                        >
                                          {optIdx + 1}. {ans} {isCorrect && " ✓ (Đáp án đúng)"}
                                        </Box>
                                      </Grid>
                                    );
                                  })}
                                </Grid>

                                {q.explanation && (
                                  <Box sx={{ ml: 3.5, mt: 1, p: 1.2, bgcolor: "#fff7ed", borderRadius: "6px", borderLeft: "3px solid #f97316" }}>
                                    <Typography variant="caption" color="#c2410c" fontWeight={700} display="block">
                                      Nghĩa / Giải thích:
                                    </Typography>
                                    <Typography variant="body2" color="#7c2d12" fontSize="0.85rem">
                                      {q.explanation}
                                    </Typography>
                                  </Box>
                                )}
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}

          {/* Sticky Bottom Action Bar when selecting questions */}
          {selectedQIds.length > 0 && (
            <Paper
              elevation={6}
              sx={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1300,
                px: 3,
                py: 1.5,
                borderRadius: "30px",
                bgcolor: "#1e293b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: 2,
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
            >
              <Typography variant="body2" fontWeight={700}>
                Đã chọn {selectedQIds.length} câu hỏi
              </Typography>

              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Trash2 fontSize="small" />}
                onClick={handleBatchDeleteQuestions}
                sx={{ borderRadius: "20px", color: "#fca5a5", borderColor: "#ef4444" }}
              >
                Xóa
              </Button>

              <Button
                size="small"
                variant="contained"
                onClick={handleOpenQuizModal}
                sx={{ bgcolor: "#B90000", borderRadius: "20px", fontWeight: 700, px: 2, "&:hover": { bgcolor: "#d66609" } }}
              >
                TẠO QUIZ NGAY ({selectedQIds.length})
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {/* Chapter Modal */}
      <ChapterModal
        open={chapterModalOpen}
        onClose={() => {
          setChapterModalOpen(false);
          setEditingChapter(null);
        }}
        onSubmit={handleChapterSubmit}
        chapter={editingChapter}
      />

      {/* Direct Create Quiz Modal from Selected Questions */}
      <Dialog
        open={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#B90000" }}>
          Tạo bài kiểm tra từ {selectedQIds.length} câu hỏi đã chọn
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Chọn Lớp học / Khóa học *</InputLabel>
              <Select
                value={selectedCourseId}
                label="Chọn Lớp học / Khóa học *"
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {teacherCourses.map((c) => (
                  <MenuItem key={c._id || c.id} value={c._id || c.id}>
                    {c.name} ({c.level || "N5"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Tiêu đề bài kiểm tra *"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              label="Thời lượng làm bài (phút) *"
              value={quizDuration}
              onChange={(e) => setQuizDuration(parseInt(e.target.value, 10) || 15)}
              inputProps={{ min: 1, max: 180 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuizModalOpen(false)} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handlePublishQuizDirect}
            variant="contained"
            disabled={submittingQuiz}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
          >
            {submittingQuiz ? <CircularProgress size={20} color="inherit" /> : "Xuất bản bài Quiz"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSuccessMsg("")}
          severity="success"
          variant="filled"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{
            minWidth: 300,
            boxShadow: "0 8px 24px rgba(46, 125, 50, 0.25)",
            borderRadius: 2,
            "& .MuiAlert-icon": { fontSize: 28 }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>Thành công</AlertTitle>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuestionBankPage;
