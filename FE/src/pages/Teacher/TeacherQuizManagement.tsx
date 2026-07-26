import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Pagination,
} from "@mui/material";
import {
  Brain,
  Sparkles,
  Save,
  Trash2,
  BookOpen,
} from "lucide-react";
import { grammarService } from "../../services/grammar.service";
import type { IGrammarCard, IGeneratedQuestion, JLPTLevel } from "../../services/grammar.service";
import DateRangeFilter from "../../components/grammar/DateRangeFilter";
import type { DateRangeValue } from "../../components/grammar/DateRangeFilter";
import { getAxiosErrorMessage } from "../../utils/axiosError";
import courseService from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { brandColors } from "../../theme/theme";

const TeacherQuizManagement: React.FC = () => {
  // General States
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourseLevel, setSelectedCourseLevel] = useState<JLPTLevel>("N5");
  const [grammarCards, setGrammarCards] = useState<IGrammarCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardDateFilter, setCardDateFilter] = useState<DateRangeValue>({ sortBy: "createdAt", order: "desc" });
  const [cardTotalCount, setCardTotalCount] = useState<number | null>(null);
  const [cardSearchQuery, setCardSearchQuery] = useState("");

  // Pagination for grammar cards
  const [cardPage, setCardPage] = useState(0);
  const cardsPerPage = 5;

  // Reset page when filters change
  useEffect(() => {
    setCardPage(0);
  }, [selectedCourseLevel, cardDateFilter, cardSearchQuery]);

  // AI Quiz Generation States
  const [numQuestions, setNumQuestions] = useState<number | "">(5);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<IGeneratedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(15);
  const [quizDueDate, setQuizDueDate] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  // Dialog for editing question
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingAnswer1, setEditingAnswer1] = useState("");
  const [editingAnswer2, setEditingAnswer2] = useState("");
  const [editingAnswer3, setEditingAnswer3] = useState("");
  const [editingAnswer4, setEditingAnswer4] = useState("");
  const [editingCorrect, setEditingCorrect] = useState(1);

  // Load teacher courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await courseService.getTeacherCourses();
        setCourses(res);
        if (res.length > 0) {
          setSelectedCourseId(res[0]._id || res[0].id || "");
          setSelectedCourseLevel((res[0].level as JLPTLevel) || "N5");
        }
      } catch (err) {
        console.error("Lỗi lấy khóa học giáo viên:", err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch grammar cards when selected course level changes
  useEffect(() => {
    if (!selectedCourseLevel) return;
    const fetchCards = async () => {
      setLoadingCards(true);
      try {
        const res = await grammarService.getGrammarCards({
          level: selectedCourseLevel,
          search: cardSearchQuery || undefined,
          dateFrom: cardDateFilter.dateFrom,
          dateTo: cardDateFilter.dateTo,
          sortBy: cardDateFilter.sortBy,
          order: cardDateFilter.order,
        });
        if (res.success) {
          setGrammarCards(res.cards);
          if (typeof res.count === "number") setCardTotalCount(res.count);
          setSelectedCardIds([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCards(false);
      }
    };
    fetchCards();
  }, [selectedCourseLevel, cardDateFilter, cardSearchQuery]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const matched = courses.find((c) => (c._id || c.id) === courseId);
    if (matched) {
      setSelectedCourseLevel((matched?.level as JLPTLevel) || "N5");
    }
  };

  const handleToggleCardSelection = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleFetchExistingQuestions = async () => {
    if (selectedCardIds.length === 0) {
      setAiError("Vui lòng chọn ít nhất một mẫu ngữ pháp để lấy câu hỏi.");
      return;
    }
    setGeneratingQuestions(true);
    setAiError("");
    setAiSuccess("");
    setGeneratedQuestions([]);

    try {
      const res = await grammarService.fetchExistingQuestions(selectedCardIds);
      if (res.success && res.questions.length > 0) {
        setGeneratedQuestions(res.questions);
        setQuizTitle(`Bài kiểm tra Ngữ pháp ${selectedCourseLevel} - ${new Date().toLocaleDateString()}`);
        setAiSuccess(`Đã lấy thành công ${res.questions.length} câu hỏi sẵn có từ Ngân hàng!`);
      } else {
        setAiError("Chưa có câu hỏi nào trong Ngân hàng cho các mẫu ngữ pháp đã chọn. Bạn có thể bấm 'Tạo mới bằng AI' để sinh câu hỏi.");
      }
    } catch (err: unknown) {
      setAiError(getAxiosErrorMessage(err, "Lỗi khi lấy câu hỏi từ Ngân hàng."));
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (selectedCardIds.length === 0) {
      setAiError("Vui lòng chọn ít nhất một mẫu ngữ pháp để tạo câu hỏi.");
      return;
    }
    if (numQuestions === "" || numQuestions < 1 || numQuestions > 20) {
      setAiError("Vui lòng nhập số câu hỏi từ 1 đến 20.");
      return;
    }
    setGeneratingQuestions(true);
    setAiError("");
    setAiSuccess("");
    setGeneratedQuestions([]);

    try {
      const res = await grammarService.generateQuizQuestions(selectedCardIds, numQuestions);
      if (res.success) {
        setGeneratedQuestions(res.questions);
        setQuizTitle(`Bài kiểm tra Ngữ pháp ${selectedCourseLevel} - ${new Date().toLocaleDateString()}`);
      }
    } catch (err: unknown) {
      setAiError(getAxiosErrorMessage(err, "Lỗi AI sinh câu hỏi."));
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleOpenEditQuestion = (index: number) => {
    const q = generatedQuestions[index];
    setEditingQuestionIdx(index);
    setEditingQuestionText(q.questionText);
    setEditingAnswer1(q.answer1);
    setEditingAnswer2(q.answer2);
    setEditingAnswer3(q.answer3);
    setEditingAnswer4(q.answer4);
    setEditingCorrect(q.correctAnswer);
  };

  const handleSaveEditedQuestion = () => {
    if (editingQuestionIdx === null) return;
    const updated = [...generatedQuestions];
    updated[editingQuestionIdx] = {
      ...updated[editingQuestionIdx],
      questionText: editingQuestionText,
      answer1: editingAnswer1,
      answer2: editingAnswer2,
      answer3: editingAnswer3,
      answer4: editingAnswer4,
      correctAnswer: editingCorrect,
    };
    setGeneratedQuestions(updated);
    setEditingQuestionIdx(null);
  };

  const handleDeleteQuestion = (index: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublishQuiz = async () => {
    if (!quizTitle.trim()) {
      setAiError("Vui lòng nhập tiêu đề bài Quiz.");
      return;
    }
    if (!quizDueDate) {
      setAiError("Vui lòng chọn Hạn nộp (Due Date) cho bài Quiz.");
      return;
    }
    if (generatedQuestions.length === 0) {
      setAiError("Danh sách câu hỏi trống.");
      return;
    }

    try {
      const res = await grammarService.createQuiz({
        courseId: selectedCourseId,
        title: quizTitle,
        durationMinutes: quizDuration,
        dueDate: quizDueDate,
        questions: generatedQuestions,
      });

      if (res.success) {
        setAiSuccess("Đã xuất bản bài Quiz thành công lên lớp học!");
        setGeneratedQuestions([]);
        setSelectedCardIds([]);
        setQuizTitle("");
        setQuizDueDate("");
      }
    } catch (err: unknown) {
      setAiError(getAxiosErrorMessage(err, "Lỗi xuất bản Quiz."));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} className="mira-fade-in-up">
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: brandColors.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color={brandColors.ink} sx={{ letterSpacing: '-0.3px' }}>
              Quản lý Quiz Ngữ pháp Giáo viên
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Tạo bài kiểm tra tự động bằng AI từ kho ngữ pháp
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Select Course globally */}
      <Card elevation={0} sx={{ border: `1px solid ${brandColors.border}`, borderRadius: "16px", mb: 3, bgcolor: '#ffffff' }}>
        <CardContent sx={{ py: 2.5 }}>
          <Grid container spacing={2.5} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ '&.Mui-focused': { color: brandColors.red } }}>Chọn Lớp học phụ trách</InputLabel>
                <Select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  label="Chọn Lớp học phụ trách"
                  sx={{
                    borderRadius: '8px',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: brandColors.red
                    }
                  }}
                >
                  {courses.map((c) => (
                    <MenuItem key={c._id || c.id} value={c._id || c.id}>
                      {c.name} (JLPT {c.level || "N5"})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Lớp đang chọn: <strong style={{ color: brandColors.ink }}>{courses.find((c) => (c._id || c.id) === selectedCourseId)?.name || "Chưa chọn"}</strong>
                &nbsp;|&nbsp;Trình độ JLPT: <strong style={{ color: brandColors.red }}>{selectedCourseLevel}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Card: Create Quiz with AI */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${brandColors.border}`,
          borderRadius: "16px",
          bgcolor: "#ffffff",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          height: { xs: "auto", md: "72vh" },
          minHeight: { xs: "auto", md: 550 },
          overflow: "hidden",
        }}
      >
        {/* Left Panel: Select Cards */}
        <Box
          sx={{
            width: { xs: "100%", md: 420 },
            borderRight: { xs: "none", md: `1px solid ${brandColors.borderLight}` },
            borderBottom: { xs: `1px solid ${brandColors.borderLight}`, md: "none" },
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", md: "100%" },
          }}
        >
          <Box sx={{ overflowY: { xs: "visible", md: "auto" }, flex: 1, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} color={brandColors.ink} gutterBottom>
              Chọn Ngữ pháp kiểm tra
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, fontWeight: 500 }}>
              Danh sách ngữ pháp ở cấp độ {selectedCourseLevel} của trung tâm
            </Typography>
            <TextField
              placeholder="Tìm kiếm ngữ pháp..."
              value={cardSearchQuery}
              onChange={(e) => setCardSearchQuery(e.target.value)}
              size="small"
              fullWidth
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '13px',
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: brandColors.red
                  }
                }
              }}
            />
            <Box sx={{ mb: 2 }}>
              <DateRangeFilter value={cardDateFilter} onChange={setCardDateFilter} showSort={false} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
                {cardTotalCount !== null && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Tổng: {cardTotalCount} thẻ
                  </Typography>
                )}
                {grammarCards.length > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedCardIds.length === grammarCards.length}
                        indeterminate={selectedCardIds.length > 0 && selectedCardIds.length < grammarCards.length}
                        onChange={() => {
                          if (selectedCardIds.length === grammarCards.length) {
                            setSelectedCardIds([]);
                          } else {
                            setSelectedCardIds(grammarCards.map((c) => c._id));
                          }
                        }}
                        sx={{ color: brandColors.border, "&.Mui-checked": { color: brandColors.red }, "&.MuiCheckbox-indeterminate": { color: brandColors.red } }}
                      />
                    }
                    label={
                      <Typography fontSize={12} fontWeight={700} color={brandColors.ink}>
                        Chọn tất cả ({selectedCardIds.length}/{grammarCards.length})
                      </Typography>
                    }
                    sx={{ mr: 0 }}
                  />
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {loadingCards ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} sx={{ color: brandColors.red }} /></Box>
            ) : grammarCards.length === 0 ? (
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Chưa có cấu trúc ngữ pháp {selectedCourseLevel} được cấu hình.
              </Typography>
            ) : (
              <>
                <FormGroup sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {grammarCards.slice(cardPage * cardsPerPage, cardPage * cardsPerPage + cardsPerPage).map((card) => {
                    const isSelected = selectedCardIds.includes(card._id);
                    return (
                      <Box
                        key={card._id}
                        onClick={() => handleToggleCardSelection(card._id)}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          p: 1.5,
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: isSelected ? brandColors.red : brandColors.borderLight,
                          bgcolor: isSelected ? `${brandColors.red}0a` : "transparent",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: isSelected ? `${brandColors.red}12` : brandColors.bg,
                            borderColor: isSelected ? brandColors.red : brandColors.border,
                          },
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          sx={{
                            p: 0,
                            mr: 1.5,
                            mt: 0.25,
                            color: brandColors.border,
                            "&.Mui-checked": { color: brandColors.red }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggleCardSelection(card._id)}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontSize={13} fontWeight={700} color={brandColors.ink}>
                            {card.title}
                          </Typography>
                          <Typography fontSize={11} color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                            {card.meaningVi}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </FormGroup>

                {grammarCards.length > cardsPerPage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 2, pt: 1 }}>
                    <Pagination
                      count={Math.ceil(grammarCards.length / cardsPerPage)}
                      page={cardPage + 1}
                      onChange={(_, p) => setCardPage(p - 1)}
                      size="small"
                      sx={{
                        "& .MuiPaginationItem-root": {
                          fontWeight: 700,
                          "&.Mui-selected": {
                            bgcolor: brandColors.red,
                            color: "#fff",
                            "&:hover": {
                              bgcolor: `${brandColors.red}dd`,
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
          <Box sx={{ p: 3, borderTop: `1px solid ${brandColors.borderLight}`, bgcolor: "#ffffff" }}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
              <TextField
                label="Số câu hỏi"
                type="number"
                size="small"
                inputProps={{ min: 1, max: 20 }}
                value={numQuestions}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setNumQuestions("");
                  } else {
                    const num = parseInt(val, 10);
                    setNumQuestions(isNaN(num) ? "" : num);
                  }
                }}
                sx={{
                  width: 100,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    '&.Mui-focused fieldset': {
                      borderColor: brandColors.red
                    }
                  }
                }}
              />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>câu</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                className="mira-button-hover"
                startIcon={<BookOpen size={16} />}
                onClick={handleFetchExistingQuestions}
                disabled={generatingQuestions || selectedCardIds.length === 0}
                sx={{
                  borderColor: "#1E293B",
                  color: "#1E293B",
                  borderRadius: '8px',
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  "&:hover": { bgcolor: "#f1f5f9" }
                }}
              >
                Lấy từ Ngân hàng
              </Button>

              <Button
                variant="contained"
                fullWidth
                className="mira-button-hover"
                startIcon={<Sparkles size={16} />}
                onClick={handleGenerateQuestions}
                disabled={generatingQuestions || selectedCardIds.length === 0}
                sx={{
                  bgcolor: brandColors.red,
                  borderRadius: '8px',
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  "&:hover": { bgcolor: brandColors.redDark }
                }}
              >
                {generatingQuestions ? <CircularProgress size={20} color="inherit" /> : " Tạo mới bằng AI"}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Right Panel: Workspace */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", md: "100%" },
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ overflowY: { xs: "visible", md: "auto" }, flex: 1, p: 3 }}>
            {aiError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{aiError}</Alert>}
            {aiSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{aiSuccess}</Alert>}

            {generatedQuestions.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  py: { xs: 6, md: 0 },
                }}
              >
                <Sparkles size={48} color={brandColors.border} style={{ marginBottom: 12 }} />
                <Typography color="text.secondary" fontWeight={500} sx={{ maxWidth: 400 }}>
                  Chọn mẫu ngữ pháp ở cột bên trái và bấm <strong>Tạo bằng AI</strong> để soạn đề thi trắc nghiệm ngay lập tức.
                </Typography>
              </Box>
            ) : (
              <Box className="mira-stagger" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Quiz settings */}
                <Card elevation={0} sx={{ border: `1px solid ${brandColors.border}`, borderRadius: "16px", bgcolor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={800} color={brandColors.ink} gutterBottom>Cấu hình bài Quiz</Typography>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          label="Tiêu đề bài kiểm tra *"
                          fullWidth
                          size="small"
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          label="Thời lượng (phút) *"
                          type="number"
                          fullWidth
                          size="small"
                          value={quizDuration}
                          onChange={(e) => setQuizDuration(parseInt(e.target.value) || 15)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Hạn nộp (Due Date) *"
                          type="datetime-local"
                          fullWidth
                          size="small"
                          value={quizDueDate}
                          onChange={(e) => setQuizDueDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ min: new Date().toISOString().slice(0, 16) }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Question List Review */}
                <Typography variant="subtitle1" fontWeight={800} color={brandColors.ink}>
                  Xem trước câu hỏi đề xuất ({generatedQuestions.length})
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {generatedQuestions.map((q, idx) => (
                    <Card variant="outlined" key={idx} sx={{ borderRadius: "12px", borderColor: brandColors.border, bgcolor: '#ffffff' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box sx={{ flex: 1, pr: 2 }}>
                            <Typography fontWeight={700} color={brandColors.ink}>Câu {idx + 1}: {q.questionText}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenEditQuestion(idx)}
                              sx={{
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: brandColors.textPrimary,
                                borderColor: brandColors.border,
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { borderColor: brandColors.red, color: brandColors.red }
                              }}
                            >
                              Sửa
                            </Button>
                            <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(idx)} sx={{ border: `1px solid ${brandColors.borderLight}`, borderRadius: '6px', p: 0.5 }}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Box>
                        </Box>

                        <Grid container spacing={1.5} sx={{ pl: 1, mt: 1 }}>
                          <Grid item xs={12} sm={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 1 ? "success.main" : brandColors.textSecondary} sx={{ fontWeight: q.correctAnswer === 1 ? 700 : 500 }}>
                              1. {q.answer1} {q.correctAnswer === 1 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 2 ? "success.main" : brandColors.textSecondary} sx={{ fontWeight: q.correctAnswer === 2 ? 700 : 500 }}>
                              2. {q.answer2} {q.correctAnswer === 2 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 3 ? "success.main" : brandColors.textSecondary} sx={{ fontWeight: q.correctAnswer === 3 ? 700 : 500 }}>
                              3. {q.answer3} {q.correctAnswer === 3 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 4 ? "success.main" : brandColors.textSecondary} sx={{ fontWeight: q.correctAnswer === 4 ? 700 : 500 }}>
                              4. {q.answer4} {q.correctAnswer === 4 && "✓"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Bottom publish actions bar */}
          {generatedQuestions.length > 0 && (
            <Box sx={{ p: 3, borderTop: `1px solid ${brandColors.borderLight}`, bgcolor: "#ffffff" }}>
              <Button
                variant="contained"
                size="large"
                className="mira-button-hover"
                startIcon={<Save size={18} />}
                onClick={handlePublishQuiz}
                fullWidth
                sx={{
                  bgcolor: brandColors.red,
                  borderRadius: '10px',
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  "&:hover": { bgcolor: brandColors.redDark }
                }}
              >
                Lưu & Xuất bản bài Quiz
              </Button>
            </Box>
          )}
        </Box>
      </Card>

      {/* Dialog Edit Question */}
      <Dialog open={editingQuestionIdx !== null} onClose={() => setEditingQuestionIdx(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800, color: brandColors.ink }}>Chỉnh sửa câu hỏi trắc nghiệm</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2.5 }}>
          <TextField
            label="Nội dung câu hỏi *"
            fullWidth
            size="small"
            multiline
            rows={2}
            value={editingQuestionText}
            onChange={(e) => setEditingQuestionText(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }}
          />
          <TextField label="Lựa chọn 1 *" fullWidth size="small" value={editingAnswer1} onChange={(e) => setEditingAnswer1(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }} />
          <TextField label="Lựa chọn 2 *" fullWidth size="small" value={editingAnswer2} onChange={(e) => setEditingAnswer2(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }} />
          <TextField label="Lựa chọn 3 *" fullWidth size="small" value={editingAnswer3} onChange={(e) => setEditingAnswer3(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }} />
          <TextField label="Lựa chọn 4 *" fullWidth size="small" value={editingAnswer4} onChange={(e) => setEditingAnswer4(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '&.Mui-focused fieldset': { borderColor: brandColors.red } } }} />

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ '&.Mui-focused': { color: brandColors.red } }}>Đáp án chính xác</InputLabel>
            <Select
              value={editingCorrect}
              onChange={(e) => setEditingCorrect(e.target.value as number)}
              label="Đáp án chính xác"
              sx={{
                borderRadius: '8px',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.red
                }
              }}
            >
              <MenuItem value={1}>Lựa chọn 1</MenuItem>
              <MenuItem value={2}>Lựa chọn 2</MenuItem>
              <MenuItem value={3}>Lựa chọn 3</MenuItem>
              <MenuItem value={4}>Lựa chọn 4</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditingQuestionIdx(null)} sx={{ color: brandColors.textSecondary, fontWeight: 600, textTransform: 'none' }}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEditedQuestion} sx={{ bgcolor: brandColors.red, borderRadius: '8px', fontWeight: 700, textTransform: 'none', "&:hover": { bgcolor: brandColors.redDark } }}>Lưu thay đổi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherQuizManagement;
