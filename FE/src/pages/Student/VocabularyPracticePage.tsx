import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
  TextField,
  InputAdornment,
  Paper,
  Zoom,
  Fade,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  BookMarked,
  CheckCircle,
  Eye,
  EyeOff,
  Brain,
  Trophy,
  Target,
  Volume2,
  Sparkles,
  Search,
} from "lucide-react";
import { vocabularyService } from "../../services/vocabulary.service";
import type { IVocabulary } from "../../services/vocabulary.service";

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const LEVEL_COLORS: Record<string, { bg: string; text: string; badge: string; shadow: string }> = {
  N1: {
    bg: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    text: "#fff",
    badge: "#a855f7",
    shadow: "rgba(168, 85, 247, 0.35)",
  },
  N2: {
    bg: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
    text: "#fff",
    badge: "#0284c7",
    shadow: "rgba(6, 182, 212, 0.35)",
  },
  N3: {
    bg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    text: "#fff",
    badge: "#059669",
    shadow: "rgba(16, 185, 129, 0.35)",
  },
  N4: {
    bg: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
    text: "#fff",
    badge: "#ea580c",
    shadow: "rgba(249, 115, 22, 0.35)",
  },
  N5: {
    bg: "linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)",
    text: "#fff",
    badge: "#dc2626",
    shadow: "rgba(244, 63, 94, 0.35)",
  },
};

const OPTION_LABELS = ["A", "B", "C", "D"];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── Quiz Types ───────────────────────────────────────────────────────────────
interface QuizQuestion {
  card: IVocabulary;
  options: string[];
  correctIndex: number;
}

interface WrongAnswer {
  question: QuizQuestion;
  selectedIndex: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
const VocabularyPracticePage: React.FC = () => {
  // ─── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"flashcard" | "quiz">("flashcard");

  // ─── Filter & Search State ────────────────────────────────────────────────
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // ─── Deck State ───────────────────────────────────────────────────────────
  const [cards, setCards] = useState<IVocabulary[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Flashcard State ──────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showReading, setShowReading] = useState(true);

  // ─── Quiz State ───────────────────────────────────────────────────────────
  const [quizDirection, setQuizDirection] = useState<"jp-to-vn" | "vn-to-jp">("jp-to-vn");
  const [quizCount, setQuizCount] = useState<number>(10);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [showWrongReview, setShowWrongReview] = useState(false);

  // ─── Text-to-Speech (TTS) Voice ───────────────────────────────────────────
  const speakWord = (e: React.MouseEvent, word: string) => {
    e.stopPropagation(); // Prevent card flipping on speak click
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "ja-JP";
      window.speechSynthesis.speak(utterance);
    }
  };

  // ─── Fetch topics on level change ─────────────────────────────────────────
  useEffect(() => {
    setLoadingTopics(true);
    setSelectedTopic("");
    vocabularyService
      .getTopics(selectedLevel || undefined)
      .then((data) => {
        // Clean out topics that are empty or invalid typos (like single character "d")
        const clean = data.filter((t) => t && t.trim().length > 1);
        setTopics(clean);
      })
      .finally(() => setLoadingTopics(false));
  }, [selectedLevel]);

  // ─── Load vocabulary deck ─────────────────────────────────────────────────
  const loadDeck = useCallback(async (shuffled = false) => {
    setLoading(true);
    setSessionStarted(false);
    setFinished(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setQuizStarted(false);
    try {
      const result = await vocabularyService.getAll({
        level: selectedLevel || undefined,
        topic: selectedTopic || undefined,
      });
      const deck = shuffled ? shuffle(result.data) : result.data;
      setCards(deck);
      if (deck.length > 0) setSessionStarted(true);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, selectedTopic]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // ─── Filter local deck by search query ───────────────────────────────────
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.reading.toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  // ─── Flashcard handlers ───────────────────────────────────────────────────
  const flip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped((p) => !p);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goNext = () => {
    if (isAnimating) return;
    if (currentIndex >= filteredCards.length - 1) {
      setFinished(true);
      return;
    }
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((p) => p + 1);
      setIsAnimating(false);
    }, 300);
  };

  const goPrev = () => {
    if (isAnimating || currentIndex === 0) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((p) => p - 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFinished(false);
  };
  const handleShuffle = () => {
    setCards((prev) => shuffle(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
    setFinished(false);
  };

  // Keyboard navigation support
  useEffect(() => {
    if (mode !== "flashcard") return;
    const handler = (e: KeyboardEvent) => {
      if (!sessionStarted || finished || filteredCards.length === 0) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionStarted, finished, currentIndex, isAnimating, isFlipped, filteredCards]);

  // ─── Quiz handlers ────────────────────────────────────────────────────────
  const generateQuiz = useCallback(() => {
    if (filteredCards.length < 4) return;
    const count = quizCount === -1 ? filteredCards.length : Math.min(quizCount, filteredCards.length);
    const questionCards = shuffle(filteredCards).slice(0, count);

    const questions: QuizQuestion[] = questionCards.map((card) => {
      const others = filteredCards.filter((c) => c._id !== card._id);
      const distractorCards = shuffle(others).slice(0, 3);

      const correctOpt = quizDirection === "jp-to-vn" ? card.meaning : card.word;
      const distractorOpts = distractorCards.map((d) =>
        quizDirection === "jp-to-vn" ? d.meaning : d.word
      );

      const allOptions = shuffle([correctOpt, ...distractorOpts]);
      const correctIndex = allOptions.indexOf(correctOpt);
      return { card, options: allOptions, correctIndex };
    });

    setQuizQuestions(questions);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizScore(0);
    setQuizFinished(false);
    setWrongAnswers([]);
    setShowWrongReview(false);
    setQuizStarted(true);
  }, [filteredCards, quizDirection, quizCount]);

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    const currentQ = quizQuestions[quizIndex];
    if (!currentQ) return;
    if (index === currentQ.correctIndex) {
      setQuizScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [...prev, { question: currentQ, selectedIndex: index }]);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
    } else {
      setQuizIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizFinished(false);
    setShowWrongReview(false);
    setQuizQuestions([]);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizScore(0);
    setWrongAnswers([]);
  };

  // ─── Computed values ──────────────────────────────────────────────────────
  const currentCard = filteredCards[currentIndex];
  const progress = filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0;
  const levelColor = currentCard ? LEVEL_COLORS[currentCard.level] : LEVEL_COLORS["N5"];

  const currentQuestion = quizQuestions[quizIndex];
  const quizProgress =
    quizQuestions.length > 0 ? ((quizIndex + 1) / quizQuestions.length) * 100 : 0;
  const quizScorePercent =
    quizQuestions.length > 0 ? Math.round((quizScore / quizQuestions.length) * 100) : 0;

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return {
        bgcolor: "#fff",
        borderColor: "#e2e8f0",
        color: "#334155",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        "&:hover": {
          bgcolor: "#f8fafc",
          borderColor: "#B90000",
          transform: "translateY(-2px)",
          boxShadow: "0 6px 12px rgba(185, 0, 0, 0.08)",
        },
      };
    }
    if (index === currentQuestion?.correctIndex) {
      return {
        bgcolor: "#f0fdf4",
        borderColor: "#22c55e",
        color: "#166534",
        fontWeight: 700,
        boxShadow: "0 4px 10px rgba(34, 197, 94, 0.15)",
      };
    }
    if (index === selectedAnswer) {
      return {
        bgcolor: "#fef2f2",
        borderColor: "#ef4444",
        color: "#991b1b",
        boxShadow: "0 4px 10px rgba(239, 68, 68, 0.15)",
      };
    }
    return {
      bgcolor: "#f8fafc",
      borderColor: "#e2e8f0",
      color: "#94a3b8",
      opacity: 0.6,
    };
  };

  const getScoreMessage = (pct: number) => {
    if (pct === 100) return { msg: "Hoàn hảo! Bạn thật xuất sắc! 🏆", color: "#22c55e" };
    if (pct >= 80) return { msg: "Rất tốt! Tiếp tục phát huy nhé! 🌟", color: "#3b82f6" };
    if (pct >= 60) return { msg: "Khá tốt! Ôn thêm chút nữa nhé! 💪", color: "#f97316" };
    if (pct >= 40) return { msg: "Cần cố gắng hơn! Đừng nản lòng! 📚", color: "#ef4444" };
    return { msg: "Hãy ôn lại flashcard trước khi làm quiz nhé! 🔄", color: "#dc2626" };
  };

  return (
    <Box
      sx={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 3,
        pb: 8,
        px: { xs: 2, md: 4 },
        bgcolor: "#f8fafc",
      }}
    >
      {/* ── Header Card ────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 860,
          p: 3,
          borderRadius: "24px",
          bgcolor: "#fff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 16px rgba(185, 0, 0, 0.25)",
              }}
            >
              <BookMarked size={26} color="#fff" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ letterSpacing: "-0.5px" }}>
                Ôn luyện Từ vựng
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Trình học thông minh tiếng Nhật JLPT N1 – N5
              </Typography>
            </Box>
          </Box>

          {/* Controls helper */}
          {mode === "flashcard" && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Tooltip title={showReading ? "Ẩn cách đọc" : "Hiện cách đọc"}>
                <IconButton
                  onClick={() => setShowReading((p) => !p)}
                  sx={{
                    border: "1.5px solid #e2e8f0",
                    color: showReading ? "#B90000" : "#64748b",
                    bgcolor: showReading ? "#fff5f5" : "transparent",
                    transition: "all 0.2s",
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  {showReading ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Trộn bài">
                <IconButton
                  onClick={handleShuffle}
                  disabled={filteredCards.length === 0}
                  sx={{
                    border: "1.5px solid #e2e8f0",
                    color: "#64748b",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#B90000", color: "#B90000" },
                  }}
                >
                  <Shuffle size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Làm lại từ đầu">
                <IconButton
                  onClick={handleRestart}
                  disabled={filteredCards.length === 0}
                  sx={{
                    border: "1.5px solid #e2e8f0",
                    color: "#64748b",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#B90000", color: "#B90000" },
                  }}
                >
                  <RotateCcw size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Mode Selection Slider (Tabs) ─────────────────────────────────────── */}
      <Box sx={{ width: "100%", maxWidth: 860, mb: 3.5 }}>
        <Box
          sx={{
            display: "flex",
            bgcolor: "#e2e8f0",
            borderRadius: "18px",
            p: "5px",
            gap: "5px",
          }}
        >
          {[
            { key: "flashcard", label: "🃏 Học Flashcard" },
            { key: "quiz", label: "📝 Làm Trắc nghiệm" },
          ].map((tab) => {
            const isActive = mode === tab.key;
            return (
              <Button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key as "flashcard" | "quiz");
                  resetQuiz();
                }}
                sx={{
                  flex: 1,
                  borderRadius: "14px",
                  py: 1.4,
                  fontWeight: 700,
                  fontSize: 14,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  bgcolor: isActive ? "#fff" : "transparent",
                  color: isActive ? "#B90000" : "#475569",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                  transform: isActive ? "scale(1.01)" : "none",
                  "&:hover": {
                    bgcolor: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* ── Filters & Search ───────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 860,
          p: 2.5,
          borderRadius: "20px",
          bgcolor: "#fff",
          border: "1px solid #e2e8f0",
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "140px 180px 1fr" },
            gap: 2,
            alignItems: "center",
          }}
        >
          {/* Level Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontWeight: 600 }}>Cấp độ</InputLabel>
            <Select
              label="Cấp độ"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              sx={{ borderRadius: "10px", fontWeight: 600 }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 280,
                  },
                },
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {LEVELS.map((l) => (
                <MenuItem key={l} value={l} sx={{ fontWeight: 600 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: LEVEL_COLORS[l].bg,
                        boxShadow: `0 0 6px ${LEVEL_COLORS[l].shadow}`,
                      }}
                    />
                    {l}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Topic Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontWeight: 600 }}>Chủ đề</InputLabel>
            <Select
              label="Chủ đề"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={loadingTopics}
              sx={{ borderRadius: "10px" }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 280,
                  },
                },
              }}
            >
              <MenuItem value="">Tất cả chủ đề</MenuItem>
              {topics.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Local Search Input */}
          <TextField
            size="small"
            placeholder="Tìm kiếm từ vựng, cách đọc, ý nghĩa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              sx: { borderRadius: "10px" },
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#94a3b8" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Info row */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mt: 2 }}>
          {filteredCards.length > 0 && (
            <Chip
              label={`${filteredCards.length} từ vựng phù hợp`}
              size="small"
              sx={{
                bgcolor: "#fff5f5",
                color: "#B90000",
                border: "1px solid #ffcccc",
                fontWeight: 700,
              }}
            />
          )}
          {mode === "flashcard" && (
            <Box sx={{ display: "flex", gap: 1, ml: "auto", flexWrap: "wrap" }}>
              <Chip label="← → Di chuyển" size="small" variant="outlined" sx={{ borderRadius: "6px" }} />
              <Chip label="Space Lật thẻ" size="small" variant="outlined" sx={{ borderRadius: "6px" }} />
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 10, gap: 2 }}>
          <CircularProgress sx={{ color: "#B90000" }} size={45} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Đang tải dữ liệu bài học...
          </Typography>
        </Box>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && filteredCards.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 4,
            maxWidth: 460,
            bgcolor: "#fff",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
            mt: 2,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "#fff5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <BookMarked size={36} color="#B90000" />
          </Box>
          <Typography variant="h6" fontWeight={700} color="#1e293b" mb={1}>
            Không tìm thấy từ vựng nào
          </Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.5}>
            Chưa có từ vựng phù hợp với bộ lọc hoặc từ khóa tìm kiếm của bạn. Hãy thử thay đổi bộ lọc
            hoặc từ khóa khác.
          </Typography>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── FLASHCARD MODE ─────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!loading && mode === "flashcard" && filteredCards.length > 0 && (
        <>
          {/* Progress bar */}
          {!finished && (
            <Box sx={{ width: "100%", maxWidth: 680, mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TIẾN ĐỘ HỌC
                </Typography>
                <Typography variant="caption" color="#B90000" fontWeight={700}>
                  {currentIndex + 1} / {filteredCards.length} từ
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#e2e8f0",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}

          {/* Flashcard 3D Card */}
          {currentCard && !finished && (
            <>
              <Box
                onClick={flip}
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  height: { xs: 340, sm: 400 },
                  perspective: "1500px",
                  cursor: "pointer",
                  mb: 4,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front Side */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      borderRadius: "28px",
                      background: levelColor.bg,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      boxShadow: `0 20px 40px ${levelColor.shadow}`,
                      border: "1px solid rgba(255,255,255,0.2)",
                      px: 4,
                      userSelect: "none",
                    }}
                  >
                    {/* Speaker (TTS) & Badge */}
                    <Box sx={{ position: "absolute", top: 20, right: 20 }}>
                      <IconButton
                        onClick={(e) => speakWord(e, currentCard.word)}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.25)",
                          color: "#fff",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.4)" },
                        }}
                      >
                        <Volume2 size={22} />
                      </IconButton>
                    </Box>

                    <Chip
                      label={currentCard.level}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 24,
                        left: 24,
                        bgcolor: "rgba(255,255,255,0.25)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: 1,
                      }}
                    />

                    {/* Word display */}
                    <Typography
                      sx={{
                        fontSize: { xs: 48, sm: 64 },
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.1,
                        textShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        textAlign: "center",
                      }}
                    >
                      {currentCard.word}
                    </Typography>

                    {showReading && (
                      <Typography
                        sx={{
                          fontSize: 24,
                          color: "rgba(255,255,255,0.9)",
                          fontWeight: 500,
                          bgcolor: "rgba(255,255,255,0.15)",
                          py: 0.5,
                          px: 2,
                          borderRadius: "10px",
                        }}
                      >
                        {currentCard.reading}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 24,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <Sparkles size={14} />
                      <Typography variant="caption" fontWeight={600}>
                        Bấm vào thẻ để xem ý nghĩa
                      </Typography>
                    </Box>
                  </Box>

                  {/* Back Side */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderRadius: "28px",
                      bgcolor: "#fff",
                      border: `3px solid ${levelColor.badge}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2.5,
                      boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
                      px: 4,
                      py: 4,
                      userSelect: "none",
                    }}
                  >
                    {/* TTS Button on back */}
                    <Box sx={{ position: "absolute", top: 20, right: 20 }}>
                      <IconButton
                        onClick={(e) => speakWord(e, currentCard.word)}
                        sx={{
                          bgcolor: "#f1f5f9",
                          color: levelColor.badge,
                          "&:hover": { bgcolor: "#e2e8f0" },
                        }}
                      >
                        <Volume2 size={22} />
                      </IconButton>
                    </Box>

                    {/* Metadata Badges */}
                    <Box sx={{ position: "absolute", top: 24, left: 24, display: "flex", gap: 1 }}>
                      <Chip
                        label={currentCard.level}
                        size="small"
                        sx={{
                          bgcolor: levelColor.badge + "12",
                          color: levelColor.badge,
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      />
                      <Chip
                        label={currentCard.topic}
                        size="small"
                        sx={{ bgcolor: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600 }}
                      />
                    </Box>

                    {/* Word again */}
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                      {currentCard.word}
                    </Typography>

                    {/* Meaning */}
                    <Box
                      sx={{
                        textAlign: "center",
                        borderTop: "1.5px dashed #e2e8f0",
                        borderBottom: "1.5px dashed #e2e8f0",
                        py: 2,
                        px: 3,
                        width: "100%",
                      }}
                    >
                      <Typography variant="h4" fontWeight={800} color={levelColor.badge}>
                        {currentCard.meaning}
                      </Typography>
                    </Box>

                    {/* Example block */}
                    {currentCard.example && (
                      <Box
                        sx={{
                          textAlign: "center",
                          maxWidth: "95%",
                          bgcolor: "#f8fafc",
                          p: 2,
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="#334155"
                          fontWeight={600}
                          sx={{ fontStyle: "italic", mb: 0.5 }}
                        >
                          {currentCard.example}
                        </Typography>
                        {currentCard.exampleMeaning && (
                          <Typography variant="caption" color="#64748b" fontWeight={500}>
                            → {currentCard.exampleMeaning}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Tags */}
                    {(currentCard.tags || []).length > 0 && (
                      <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", justifyContent: "center" }}>
                        {currentCard.tags!.map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            sx={{ bgcolor: "#f1f5f9", color: "#64748b", fontSize: 10, height: 20 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Navigation buttons */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<ChevronLeft size={20} />}
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  sx={{
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    borderRadius: "14px",
                    py: 1.3,
                    px: 3.5,
                    fontWeight: 700,
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#B90000", color: "#B90000", bgcolor: "#fff5f5" },
                  }}
                >
                  Trước
                </Button>

                <Button
                  variant="contained"
                  onClick={flip}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "14px",
                    py: 1.4,
                    px: 5,
                    fontWeight: 700,
                    fontSize: 15,
                    boxShadow: "0 8px 20px rgba(185,0,0,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                      transform: "scale(1.02)",
                    },
                  }}
                >
                  Lật thẻ
                </Button>

                <Button
                  variant="outlined"
                  endIcon={<ChevronRight size={20} />}
                  onClick={goNext}
                  sx={{
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    borderRadius: "14px",
                    py: 1.3,
                    px: 3.5,
                    fontWeight: 700,
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#B90000", color: "#B90000", bgcolor: "#fff5f5" },
                  }}
                >
                  {currentIndex >= filteredCards.length - 1 ? "Xong" : "Tiếp theo"}
                </Button>
              </Box>
            </>
          )}

          {/* Flashcard finished card */}
          {finished && (
            <Zoom in={finished}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                  px: 4,
                  maxWidth: 500,
                  bgcolor: "#fff",
                  borderRadius: "28px",
                  border: "2px solid #ffcccc",
                  boxShadow: "0 20px 45px rgba(185, 0, 0, 0.08)",
                }}
              >
                <Box
                  sx={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                    boxShadow: "0 10px 25px rgba(185,0,0,0.3)",
                  }}
                >
                  <CheckCircle size={45} color="#fff" />
                </Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a" mb={1.5}>
                  🎉 Hoàn thành ôn tập!
                </Typography>
                <Typography variant="body1" color="#475569" mb={4} lineHeight={1.6}>
                  Chúc mừng bạn đã hoàn thành ôn tập toàn bộ{" "}
                  <strong style={{ color: "#B90000", fontSize: "1.1rem" }}>{filteredCards.length}</strong> từ vựng
                  {selectedLevel && (
                    <>
                      {" "}
                      cấp độ <strong style={{ color: "#B90000" }}>{selectedLevel}</strong>
                    </>
                  )}
                  {selectedTopic && (
                    <>
                      {" "}
                      chủ đề <strong style={{ color: "#B90000" }}>"{selectedTopic}"</strong>
                    </>
                  )}
                  . Hãy làm Quiz trắc nghiệm để kiểm tra khả năng nhớ từ nhé!
                </Typography>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    startIcon={<RotateCcw size={16} />}
                    onClick={handleRestart}
                    sx={{
                      borderColor: "#B90000",
                      color: "#B90000",
                      borderRadius: "12px",
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#fff5f5", borderColor: "#990000" },
                    }}
                  >
                    Ôn lại từ đầu
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Shuffle size={16} />}
                    onClick={() => {
                      handleShuffle();
                      setFinished(false);
                    }}
                    sx={{
                      background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                      borderRadius: "12px",
                      fontWeight: 700,
                      boxShadow: "0 4px 14px rgba(185,0,0,0.25)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                      },
                    }}
                  >
                    Trộn & ôn lại
                  </Button>
                </Box>
              </Box>
            </Zoom>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── QUIZ MODE ──────────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!loading && mode === "quiz" && (
        <>
          {/* Quiz Configuration Panel */}
          {!quizStarted && filteredCards.length >= 4 && (
            <Fade in={!quizStarted}>
              <Box sx={{ width: "100%", maxWidth: 680 }}>
                {/* Direction Selector */}
                <Typography variant="subtitle1" fontWeight={800} color="#1e293b" mb={2}>
                  Chọn hướng câu hỏi:
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
                  {[
                    {
                      key: "jp-to-vn",
                      emoji: "🇯🇵 → 🇻🇳",
                      title: "Tiếng Nhật sang Tiếng Việt",
                      sub: "Nhìn từ vựng tiếng Nhật, chọn ý nghĩa dịch đúng",
                    },
                    {
                      key: "vn-to-jp",
                      emoji: "🇻🇳 → 🇯🇵",
                      title: "Tiếng Việt sang Tiếng Nhật",
                      sub: "Nhìn ý nghĩa dịch nghĩa tiếng Việt, chọn từ tiếng Nhật",
                    },
                  ].map((opt) => {
                    const isSelected = quizDirection === opt.key;
                    return (
                      <Box
                        key={opt.key}
                        onClick={() => setQuizDirection(opt.key as "jp-to-vn" | "vn-to-jp")}
                        sx={{
                          flex: 1,
                          minWidth: 240,
                          p: 2.5,
                          borderRadius: "18px",
                          cursor: "pointer",
                          border: "2px solid",
                          borderColor: isSelected ? "#B90000" : "#e2e8f0",
                          bgcolor: isSelected ? "#fff5f5" : "#fff",
                          transition: "all 0.25s",
                          boxShadow: isSelected ? "0 8px 24px rgba(185, 0, 0, 0.08)" : "none",
                          "&:hover": {
                            borderColor: "#B90000",
                            bgcolor: "#fff5f5",
                            transform: "translateY(-2px)",
                          },
                        }}
                      >
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          color={isSelected ? "#B90000" : "#0f172a"}
                          mb={1}
                        >
                          {opt.emoji}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color={isSelected ? "#B90000" : "#334155"} mb={0.5}>
                          {opt.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {opt.sub}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* Length Selector */}
                <Typography variant="subtitle1" fontWeight={800} color="#1e293b" mb={2}>
                  Số lượng câu hỏi trắc nghiệm:
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, mb: 4, flexWrap: "wrap" }}>
                  {[
                    { label: "10 câu", value: 10 },
                    { label: "20 câu", value: 20 },
                    { label: `Tất cả (${filteredCards.length})`, value: -1 },
                  ].map((opt) => {
                    const tooFew = opt.value > 0 && opt.value > filteredCards.length;
                    const isSelected = quizCount === opt.value;
                    return (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        onClick={() => !tooFew && setQuizCount(opt.value)}
                        sx={{
                          cursor: tooFew ? "not-allowed" : "pointer",
                          fontWeight: 700,
                          bgcolor: isSelected ? "#B90000" : tooFew ? "#f1f5f9" : "#fff",
                          color: isSelected ? "#fff" : tooFew ? "#cbd5e1" : "#475569",
                          border: "1.5px solid",
                          borderColor: isSelected ? "#B90000" : tooFew ? "#e2e8f0" : "#cbd5e1",
                          px: 1,
                          height: 36,
                          "& .MuiChip-label": { fontSize: 13 },
                          "&:hover": !tooFew ? { opacity: 0.85 } : {},
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Start Action */}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={generateQuiz}
                  startIcon={<Brain size={22} />}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "16px",
                    py: 1.8,
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: "0 8px 24px rgba(185,0,0,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Bắt đầu làm Quiz
                </Button>
              </Box>
            </Fade>
          )}

          {/* Warning for not enough vocabulary */}
          {!quizStarted && filteredCards.length > 0 && filteredCards.length < 4 && (
            <Box
              sx={{
                bgcolor: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "16px",
                p: 3,
                maxWidth: 500,
                textAlign: "center",
              }}
            >
              <Typography variant="body1" color="#b45309" fontWeight={700} mb={1}>
                ⚠️ Cần thêm từ vựng để kích hoạt Quiz
              </Typography>
              <Typography variant="body2" color="#b45309" lineHeight={1.5}>
                Chế độ trắc nghiệm yêu cầu tối thiểu **4 từ vựng** trong danh sách học để thiết kế các câu trả lời
                nhiễu. Hiện tại chỉ có <strong>{filteredCards.length}</strong> từ. Bạn hãy thay đổi bộ lọc để ôn tập nhóm lớn hơn.
              </Typography>
            </Box>
          )}

          {/* ── Quiz Interactive Interface ───────────────────────────────── */}
          {quizStarted && !quizFinished && currentQuestion && (
            <Box sx={{ width: "100%", maxWidth: 680 }}>
              {/* Header stats bar */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={700}>
                  Câu hỏi {quizIndex + 1} / {quizQuestions.length}
                </Typography>
                <Box sx={{ display: "flex", gap: 1.2 }}>
                  <Box
                    sx={{
                      px: 1.8,
                      py: 0.5,
                      borderRadius: "20px",
                      bgcolor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <Typography variant="caption" fontWeight={800} color="#166534">
                      Đúng: {quizScore}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.8,
                      py: 0.5,
                      borderRadius: "20px",
                      bgcolor: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <Typography variant="caption" fontWeight={800} color="#991b1b">
                      Sai: {wrongAnswers.length}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Progress Tracker */}
              <LinearProgress
                variant="determinate"
                value={quizProgress}
                sx={{
                  mb: 3,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#e2e8f0",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: 4,
                  },
                }}
              />

              {/* Question Screen */}
              <Box
                sx={{
                  background:
                    LEVEL_COLORS[currentQuestion.card.level]?.bg || LEVEL_COLORS.N5.bg,
                  borderRadius: "24px",
                  p: { xs: 4, sm: 5 },
                  mb: 3,
                  textAlign: "center",
                  boxShadow: `0 12px 30px ${LEVEL_COLORS[currentQuestion.card.level]?.shadow || LEVEL_COLORS.N5.shadow
                    }`,
                  position: "relative",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1.2, mb: 2.5 }}>
                  <Chip
                    label={currentQuestion.card.level}
                    size="small"
                    sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 800 }}
                  />
                  <Chip
                    label={currentQuestion.card.topic}
                    size="small"
                    sx={{
                      bgcolor: "rgba(255,255,255,0.18)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {quizDirection === "jp-to-vn" ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: { xs: 46, sm: 58 },
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.1,
                        mb: 1,
                        textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {currentQuestion.card.word}
                    </Typography>
                    <Typography sx={{ fontSize: 20, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                      {currentQuestion.card.reading}
                    </Typography>
                  </>
                ) : (
                  <Typography
                    sx={{
                      fontSize: { xs: 24, sm: 32 },
                      fontWeight: 800,
                      color: "#fff",
                      lineHeight: 1.4,
                      textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    {currentQuestion.card.meaning}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.65)", mt: 3, display: "block", fontWeight: 600 }}
                >
                  {quizDirection === "jp-to-vn"
                    ? "Chọn bản dịch ý nghĩa chính xác nhất:"
                    : "Chọn từ vựng tiếng Nhật chuẩn xác:"}
                </Typography>
              </Box>

              {/* 2x2 Answer Grid */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 3 }}>
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={isAnswered}
                    sx={{
                      border: "2px solid",
                      borderRadius: "16px",
                      py: 2,
                      px: 2.5,
                      textAlign: "left",
                      justifyContent: "flex-start",
                      textTransform: "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: isAnswered ? "default" : "pointer",
                      ...getOptionStyle(index),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      {/* Round option circle indicator */}
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          transition: "all 0.2s",
                          bgcolor: isAnswered
                            ? index === currentQuestion.correctIndex
                              ? "#22c55e"
                              : index === selectedAnswer
                                ? "#ef4444"
                                : "#e2e8f0"
                            : "#f1f5f9",
                          color: isAnswered
                            ? index === currentQuestion.correctIndex || index === selectedAnswer
                              ? "#fff"
                              : "#94a3b8"
                            : "#475569",
                        }}
                      >
                        {isAnswered && index === currentQuestion.correctIndex
                          ? "✓"
                          : isAnswered && index === selectedAnswer
                            ? "✗"
                            : OPTION_LABELS[index]}
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ lineHeight: 1.4, wordBreak: "break-word" }}
                      >
                        {option}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>

              {/* Correct / Incorrect Feedback Alert & Action Button */}
              {isAnswered && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "16px",
                      bgcolor:
                        selectedAnswer === currentQuestion.correctIndex
                          ? "#f0fdf4"
                          : "#fef2f2",
                      border: "1.5px solid",
                      borderColor:
                        selectedAnswer === currentQuestion.correctIndex
                          ? "#bbf7d0"
                          : "#fecaca",
                    }}
                  >
                    {selectedAnswer === currentQuestion.correctIndex ? (
                      <Typography variant="body2" fontWeight={700} color="#166534">
                        ✅ Chính xác! Bạn trả lời xuất sắc.
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#991b1b" mb={0.5}>
                          ❌ Rất tiếc, câu trả lời chưa đúng!
                        </Typography>
                        <Typography variant="body2" color="#334155" fontWeight={500}>
                          Đáp án đúng là:{" "}
                          <strong style={{ color: "#22c55e" }}>
                            {currentQuestion.options[currentQuestion.correctIndex]}
                          </strong>
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Button
                    variant="contained"
                    onClick={handleNextQuestion}
                    endIcon={
                      quizIndex >= quizQuestions.length - 1 ? (
                        <Trophy size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )
                    }
                    sx={{
                      background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                      borderRadius: "14px",
                      py: 1.6,
                      fontWeight: 700,
                      boxShadow: "0 6px 18px rgba(185,0,0,0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                      },
                    }}
                  >
                    {quizIndex >= quizQuestions.length - 1 ? "Xem kết quả trắc nghiệm" : "Tiếp tục câu sau"}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* ── Quiz Summary Result Dashboard ──────────────────────────────── */}
          {quizFinished && !showWrongReview && (
            <Zoom in={quizFinished}>
              <Box sx={{ width: "100%", maxWidth: 600 }}>
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 4,
                    bgcolor: "#fff",
                    borderRadius: "28px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 20px 45px rgba(0,0,0,0.04)",
                    mb: 3,
                  }}
                >
                  {/* Circular progress with indicator score */}
                  <Box sx={{ position: "relative", display: "inline-flex", mb: 3 }}>
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={130}
                      thickness={4.5}
                      sx={{ color: "#f1f5f9", position: "absolute" }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={quizScorePercent}
                      size={130}
                      thickness={4.5}
                      sx={{
                        color:
                          quizScorePercent >= 80
                            ? "#22c55e"
                            : quizScorePercent >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}
                    >
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        color={
                          quizScorePercent >= 80
                            ? "#166534"
                            : quizScorePercent >= 60
                              ? "#b45309"
                              : "#991b1b"
                        }
                      >
                        {quizScorePercent}%
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="h5" fontWeight={800} color="#0f172a" mb={1}>
                    Đạt {quizScore} / {quizQuestions.length} câu chính xác
                  </Typography>

                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color={getScoreMessage(quizScorePercent).color}
                    mb={4}
                  >
                    {getScoreMessage(quizScorePercent).msg}
                  </Typography>

                  {/* Summary grid score */}
                  <Box
                    sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 4, flexWrap: "wrap" }}
                  >
                    {[
                      { label: "Đúng", value: quizScore, bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
                      {
                        label: "Sai",
                        value: wrongAnswers.length,
                        bg: "#fef2f2",
                        border: "#fecaca",
                        color: "#991b1b",
                      },
                      {
                        label: "Tổng số câu",
                        value: quizQuestions.length,
                        bg: "#f8fafc",
                        border: "#e2e8f0",
                        color: "#334155",
                      },
                    ].map((s) => (
                      <Box
                        key={s.label}
                        sx={{
                          px: 3,
                          py: 1.8,
                          borderRadius: "16px",
                          bgcolor: s.bg,
                          border: `1.5px solid ${s.border}`,
                          textAlign: "center",
                          minWidth: 90,
                        }}
                      >
                        <Typography variant="h5" fontWeight={900} color={s.color}>
                          {s.value}
                        </Typography>
                        <Typography variant="caption" color="#64748b" fontWeight={700}>
                          {s.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Actions buttons */}
                  <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                    {wrongAnswers.length > 0 && (
                      <Button
                        variant="outlined"
                        onClick={() => setShowWrongReview(true)}
                        sx={{
                          borderColor: "#ef4444",
                          color: "#ef4444",
                          borderRadius: "12px",
                          fontWeight: 700,
                          "&:hover": { bgcolor: "#fef2f2", borderColor: "#dc2626" },
                        }}
                      >
                        Xem {wrongAnswers.length} câu sai
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<RotateCcw size={16} />}
                      onClick={generateQuiz}
                      sx={{
                        borderColor: "#B90000",
                        color: "#B90000",
                        borderRadius: "12px",
                        fontWeight: 700,
                        "&:hover": { bgcolor: "#fff5f5", borderColor: "#990000" },
                      }}
                    >
                      Làm lại
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Target size={16} />}
                      onClick={resetQuiz}
                      sx={{
                        background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                        borderRadius: "12px",
                        fontWeight: 700,
                        boxShadow: "0 4px 14px rgba(185,0,0,0.25)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                        },
                      }}
                    >
                      Quiz mới
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Zoom>
          )}

          {/* ── Wrong Answer Reviews Sheet ───────────────────────────────── */}
          {quizFinished && showWrongReview && (
            <Box sx={{ width: "100%", maxWidth: 680 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Typography variant="h6" fontWeight={800} color="#b91c1c">
                  ❌ Xem lại các câu trả lời sai ({wrongAnswers.length})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowWrongReview(false)}
                  sx={{
                    borderColor: "#B90000",
                    color: "#B90000",
                    borderRadius: "10px",
                    fontWeight: 700,
                    px: 2,
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  ← Về bảng điểm
                </Button>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {wrongAnswers.map(({ question, selectedIndex }, i) => {
                  const cardLevelColor = LEVEL_COLORS[question.card.level] || LEVEL_COLORS.N5;
                  return (
                    <Box
                      key={i}
                      sx={{
                        borderRadius: "20px",
                        border: "1px solid #fee2e2",
                        overflow: "hidden",
                        bgcolor: "#fff",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                      }}
                    >
                      {/* Top banner */}
                      <Box
                        sx={{
                          p: 2,
                          background: cardLevelColor.bg,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Chip
                          label={question.card.level}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255,255,255,0.25)",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        />
                        <Typography fontWeight={800} color="#fff" fontSize={16}>
                          {quizDirection === "jp-to-vn"
                            ? `${question.card.word}（${question.card.reading}）`
                            : question.card.meaning}
                        </Typography>
                      </Box>

                      {/* Choices analysis */}
                      <Box sx={{ p: 2.5 }}>
                        {/* Wrong choice */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                          <Typography color="#ef4444" sx={{ mt: 0.2, fontWeight: 900 }}>
                            ✕
                          </Typography>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                              BẠN ĐÃ CHỌN:
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="#b91c1c">
                              {question.options[selectedIndex]}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Correct choice */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                          <Typography color="#22c55e" sx={{ mt: 0.2, fontWeight: 900 }}>
                            ✓
                          </Typography>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                              ĐÁP ÁN ĐÚNG LÀ:
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="#15803d">
                              {question.options[question.correctIndex]}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Example sentence */}
                        {question.card.example && (
                          <Box
                            sx={{
                              mt: 2,
                              pt: 2,
                              borderTop: "1px dashed #e2e8f0",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="#475569"
                              display="block"
                              sx={{ fontStyle: "italic", mb: 0.5, fontWeight: 500 }}
                            >
                              {question.card.example}
                            </Typography>
                            {question.card.exampleMeaning && (
                              <Typography variant="caption" color="#64748b" fontWeight={600}>
                                → {question.card.exampleMeaning}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<RotateCcw size={16} />}
                  onClick={generateQuiz}
                  sx={{
                    borderColor: "#B90000",
                    color: "#B90000",
                    borderRadius: "12px",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  Làm lại quiz này
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Target size={16} />}
                  onClick={resetQuiz}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "12px",
                    fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(185,0,0,0.25)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                    },
                  }}
                >
                  Làm quiz mới
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default VocabularyPracticePage;
