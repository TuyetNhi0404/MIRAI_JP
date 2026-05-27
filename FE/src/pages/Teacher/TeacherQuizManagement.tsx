import React, { useState, useEffect, useCallback } from "react";
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Brain,
  Award,
  Sparkles,
  ClipboardList,
  UserCheck,
  Clock,
  Save,
  Trash2,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { grammarService } from "../../services/grammar.service";
import type { IGrammarCard, IGeneratedQuestion, IQuizAttempt } from "../../services/grammar.service";
import courseService from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { quizService } from "../../services/quiz.service";

const TeacherQuizManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // General States
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourseLevel, setSelectedCourseLevel] = useState<any>("N5");
  const [grammarCards, setGrammarCards] = useState<IGrammarCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // AI Quiz Generation States
  const [numQuestions, setNumQuestions] = useState(5);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<IGeneratedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(15);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  // Quiz list and score tracking states
  const [teacherQuizzes, setTeacherQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [attempts, setAttempts] = useState<IQuizAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

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
          setSelectedCourseLevel((res[0] as any).level || "N5");
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
        });
        if (res.success) {
          setGrammarCards(res.cards);
          setSelectedCardIds([]); // Reset selection
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCards(false);
      }
    };
    fetchCards();
  }, [selectedCourseLevel]);

  // Fetch teacher's generated quizzes (to track scores)
  const fetchTeacherQuizzes = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoadingQuizzes(true);
    try {
      // Gọi API lấy quizzes của khóa học
      const res = await quizService.getQuizzesByCourse(selectedCourseId);
      setTeacherQuizzes(res || []);
      if (res && res.length > 0) {
        setSelectedQuizId(res[0]._id || "");
      } else {
        setSelectedQuizId("");
        setAttempts([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuizzes(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchTeacherQuizzes();
    }
  }, [activeTab, fetchTeacherQuizzes]);

  // Fetch attempts when selected quiz changes
  useEffect(() => {
    if (!selectedQuizId) return;
    const fetchAttempts = async () => {
      setLoadingAttempts(true);
      try {
        const res = await grammarService.getQuizAttempts(selectedQuizId);
        if (res.success) {
          setAttempts(res.attempts);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAttempts(false);
      }
    };
    fetchAttempts();
  }, [selectedQuizId]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const matched = courses.find((c) => (c._id || c.id) === courseId);
    if (matched) {
      setSelectedCourseLevel((matched as any).level || "N5");
    }
  };

  const handleToggleCardSelection = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleGenerateQuestions = async () => {
    if (selectedCardIds.length === 0) {
      setAiError("Vui lòng chọn ít nhất một mẫu ngữ pháp để tạo câu hỏi.");
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
    } catch (err: any) {
      setAiError(err.response?.data?.message || "Lỗi AI sinh câu hỏi.");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Open Edit Question Dialog
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
    if (generatedQuestions.length === 0) {
      setAiError("Danh sách câu hỏi trống.");
      return;
    }

    try {
      const res = await grammarService.createQuiz({
        courseId: selectedCourseId,
        title: quizTitle,
        durationMinutes: quizDuration,
        questions: generatedQuestions,
      });

      if (res.success) {
        setAiSuccess("Đã xuất bản bài Quiz thành công lên lớp học!");
        setGeneratedQuestions([]);
        setSelectedCardIds([]);
        setQuizTitle("");
      }
    } catch (err: any) {
      setAiError(err.response?.data?.message || "Lỗi xuất bản Quiz.");
    }
  };

  // Prepare Recharts Data for score distribution
  const getDistributionData = () => {
    const counts = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    attempts.forEach((att) => {
      const p = att.percentage;
      if (p <= 20) counts["0-20"]++;
      else if (p <= 40) counts["21-40"]++;
      else if (p <= 60) counts["41-60"]++;
      else if (p <= 80) counts["61-80"]++;
      else counts["81-100"]++;
    });

    return Object.entries(counts).map(([range, count]) => ({
      range,
      "Số học viên": count,
    }));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: "#B90000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a1a">
              Quản lý Quiz Ngữ pháp Giáo viên
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tạo bài kiểm tra tự động bằng AI từ kho ngữ pháp và theo dõi trực quan điểm số học sinh
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Select Course globally */}
      <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Chọn Lớp học phụ trách</InputLabel>
                <Select value={selectedCourseId} onChange={(e) => handleCourseChange(e.target.value)} label="Chọn Lớp học phụ trách">
                  {courses.map((c) => (
                    <MenuItem key={c._id || c.id} value={c._id || c.id}>
                      {c.name} (JLPT { (c as any).level || "N5" })
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Lớp đang chọn: <strong>{courses.find((c) => (c._id || c.id) === selectedCourseId)?.name || "Chưa chọn"}</strong>
                &nbsp;|&nbsp;Trình độ JLPT: <strong>{selectedCourseLevel}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="inherit" sx={{ "& .MuiTabs-indicator": { bgcolor: "#B90000" } }}>
          <Tab label="Tạo Quiz bằng AI" sx={{ fontWeight: 600 }} />
          <Tab label="Kết quả & Thống kê điểm" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* ─── TAB 0: CREATE QUIZ WITH AI ────────────────────────────────────── */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Select Cards */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", maxHeight: "65vh", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ overflowY: "auto", flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Chọn Ngữ pháp kiểm tra
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Danh sách ngữ pháp ở cấp độ {selectedCourseLevel} của trung tâm
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {loadingCards ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} color="inherit" /></Box>
                ) : grammarCards.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có cấu trúc ngữ pháp {selectedCourseLevel} được cấu hình.
                  </Typography>
                ) : (
                  <FormGroup>
                    {grammarCards.map((card) => (
                      <FormControlLabel
                        key={card._id}
                        control={
                          <Checkbox
                            checked={selectedCardIds.includes(card._id)}
                            onChange={() => handleToggleCardSelection(card._id)}
                            sx={{ color: "#B90000", "&.Mui-checked": { color: "#B90000" } }}
                          />
                        }
                        label={
                          <Box>
                            <Typography fontSize={13} fontWeight={700}>{card.title}</Typography>
                            <Typography fontSize={11} color="text.secondary">{card.meaningVi}</Typography>
                          </Box>
                        }
                        sx={{ mb: 1, alignItems: "flex-start" }}
                      />
                    ))}
                  </FormGroup>
                )}
              </CardContent>
              <Box sx={{ p: 2, borderTop: "1px solid #f0f0f0" }}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
                  <TextField
                    label="Số câu hỏi"
                    type="number"
                    size="small"
                    inputProps={{ min: 1, max: 20 }}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2" color="text.secondary">câu</Typography>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Sparkles size={16} />}
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions || selectedCardIds.length === 0}
                  sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" } }}
                >
                  {generatingQuestions ? <CircularProgress size={20} color="inherit" /> : "Tạo bằng AI"}
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* AI Questions Review & Publish */}
          <Grid item xs={12} md={8}>
            {aiError && <Alert severity="error" sx={{ mb: 2 }}>{aiError}</Alert>}
            {aiSuccess && <Alert severity="success" sx={{ mb: 2 }}>{aiSuccess}</Alert>}

            {generatedQuestions.length === 0 ? (
              <Paper elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed #ccc", borderRadius: "12px" }}>
                <Sparkles size={48} color="#ccc" style={{ marginBottom: 12 }} />
                <Typography color="text.secondary">
                  Chọn mẫu ngữ pháp ở cột bên trái và bấm <strong>Tạo bằng AI</strong> để soạn đề thi trắc nghiệm ngay lập tức.
                </Typography>
              </Paper>
            ) : (
              <Box>
                {/* Quiz settings */}
                <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Cấu hình bài Quiz</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <TextField
                          label="Tiêu đề bài kiểm tra *"
                          fullWidth
                          size="small"
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Thời lượng làm bài (phút) *"
                          type="number"
                          fullWidth
                          size="small"
                          value={quizDuration}
                          onChange={(e) => setQuizDuration(parseInt(e.target.value) || 15)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Question List Review */}
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Xem trước câu hỏi đề xuất ({generatedQuestions.length})</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
                  {generatedQuestions.map((q, idx) => (
                    <Card variant="outlined" key={idx} sx={{ borderRadius: "8px" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Typography fontWeight={700} color="#111">Câu {idx + 1}: {q.questionText}</Typography>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button size="small" variant="outlined" onClick={() => handleOpenEditQuestion(idx)}>Sửa</Button>
                            <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(idx)}><Trash2 size={16} /></IconButton>
                          </Box>
                        </Box>

                        <Grid container spacing={1} sx={{ pl: 2 }}>
                          <Grid item xs={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 1 ? "success.main" : "text.secondary"} sx={{ fontWeight: q.correctAnswer === 1 ? 700 : 400 }}>
                              1. {q.answer1} {q.correctAnswer === 1 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 2 ? "success.main" : "text.secondary"} sx={{ fontWeight: q.correctAnswer === 2 ? 700 : 400 }}>
                              2. {q.answer2} {q.correctAnswer === 2 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 3 ? "success.main" : "text.secondary"} sx={{ fontWeight: q.correctAnswer === 3 ? 700 : 400 }}>
                              3. {q.answer3} {q.correctAnswer === 3 && "✓"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography fontSize={13} color={q.correctAnswer === 4 ? "success.main" : "text.secondary"} sx={{ fontWeight: q.correctAnswer === 4 ? 700 : 400 }}>
                              4. {q.answer4} {q.correctAnswer === 4 && "✓"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save size={18} />}
                  onClick={handlePublishQuiz}
                  fullWidth
                  sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" }, py: 1.5, fontWeight: 700 }}
                >
                  Lưu & Xuất bản bài Quiz
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* ─── TAB 1: SCORES & STATISTICS ────────────────────────────────────── */}
      {activeTab === 1 && (
        <Box>
          {loadingQuizzes ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress color="inherit" /></Box>
          ) : teacherQuizzes.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed #ccc", borderRadius: "12px" }}>
              <ClipboardList size={48} color="#ccc" style={{ marginBottom: 12 }} />
              <Typography color="text.secondary">Lớp học này chưa có bài thi trắc nghiệm nào.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {/* Select Quiz */}
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Danh sách đề thi</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {teacherQuizzes.map((quiz) => (
                        <Paper
                          key={quiz._id || quiz.id}
                          elevation={0}
                          onClick={() => setSelectedQuizId(quiz._id || quiz.id)}
                          sx={{
                            p: 1.5,
                            border: "1px solid",
                            borderColor: selectedQuizId === (quiz._id || quiz.id) ? "#B90000" : "#eef0f2",
                            bgcolor: selectedQuizId === (quiz._id || quiz.id) ? "#fff5f5" : "#fff",
                            cursor: "pointer",
                            "&:hover": { bgcolor: selectedQuizId === (quiz._id || quiz.id) ? "#fff5f5" : "#fafafa" },
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box>
                            <Typography fontSize={13} fontWeight={700}>{quiz.title}</Typography>
                            <Typography fontSize={11} color="text.secondary">
                              Số câu: {quiz.totalQuestions} | Hạn: {quiz.durationMinutes} phút
                            </Typography>
                          </Box>
                          <ChevronRight size={16} color={selectedQuizId === (quiz._id || quiz.id) ? "#B90000" : "#ccc"} />
                        </Paper>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Stats and attempts table */}
              <Grid item xs={12} md={8}>
                {loadingAttempts ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress color="inherit" /></Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {/* Visual Analytics with Recharts */}
                    {attempts.length > 0 && (
                      <Card elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px" }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <BarChart2 size={18} color="#B90000" />
                            Phân bố điểm số của Học viên
                          </Typography>
                          <Divider sx={{ mb: 2 }} />
                          <Box sx={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer>
                              <BarChart data={getDistributionData()} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <RechartsTooltip />
                                <Bar dataKey="Số học viên" radius={[4, 4, 0, 0]}>
                                  {getDistributionData().map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 4 ? "#2e7d32" : "#B90000"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </CardContent>
                      </Card>
                    )}

                    {/* Table list attempts */}
                    <Paper elevation={0} sx={{ border: "1px solid #f0f0f0", borderRadius: "12px", overflow: "hidden" }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#FAFAFA" }}>
                              <TableCell sx={{ fontWeight: 700 }}><UserCheck size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Học sinh</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="center"><Award size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Điểm số</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="center">Phần trăm</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="center"><Clock size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Nộp bài</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {attempts.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                  <Typography color="text.secondary">Chưa có học sinh nào hoàn thành bài thi này.</Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              attempts.map((att) => (
                                <TableRow key={att._id} hover>
                                  <TableCell><Typography fontWeight={600}>{att.studentId?.name || "Học viên"}</Typography></TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">{att.studentId?.email || "—"}</Typography></TableCell>
                                  <TableCell align="center"><Typography fontWeight={700} color="#B90000">{att.score} điểm</Typography></TableCell>
                                  <TableCell align="center"><Typography fontWeight={600}>{att.percentage}%</Typography></TableCell>
                                  <TableCell align="center">
                                    {att.passed ? (
                                      <Chip label="Đạt" color="success" size="small" />
                                    ) : (
                                      <Chip label="Chưa đạt" color="error" size="small" />
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography fontSize={11} color="text.secondary">
                                      {new Date(att.completedAt).toLocaleDateString()}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ─── DIALOG EDIT QUESTION ───────────────────────────────────────────── */}
      <Dialog open={editingQuestionIdx !== null} onClose={() => setEditingQuestionIdx(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh sửa câu hỏi trắc nghiệm</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2.5 }}>
          <TextField
            label="Nội dung câu hỏi *"
            fullWidth
            size="small"
            multiline
            rows={2}
            value={editingQuestionText}
            onChange={(e) => setEditingQuestionText(e.target.value)}
          />
          <TextField label="Lựa chọn 1 *" fullWidth size="small" value={editingAnswer1} onChange={(e) => setEditingAnswer1(e.target.value)} />
          <TextField label="Lựa chọn 2 *" fullWidth size="small" value={editingAnswer2} onChange={(e) => setEditingAnswer2(e.target.value)} />
          <TextField label="Lựa chọn 3 *" fullWidth size="small" value={editingAnswer3} onChange={(e) => setEditingAnswer3(e.target.value)} />
          <TextField label="Lựa chọn 4 *" fullWidth size="small" value={editingAnswer4} onChange={(e) => setEditingAnswer4(e.target.value)} />

          <FormControl size="small" fullWidth>
            <InputLabel>Đáp án chính xác</InputLabel>
            <Select value={editingCorrect} onChange={(e) => setEditingCorrect(e.target.value as number)} label="Đáp án chính xác">
              <MenuItem value={1}>Lựa chọn 1</MenuItem>
              <MenuItem value={2}>Lựa chọn 2</MenuItem>
              <MenuItem value={3}>Lựa chọn 3</MenuItem>
              <MenuItem value={4}>Lựa chọn 4</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingQuestionIdx(null)} sx={{ color: "#888" }}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEditedQuestion} sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#990000" } }}>Lưu thay đổi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherQuizManagement;
