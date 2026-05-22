import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { vocabularyService } from "../../services/vocabulary.service";
import type { IVocabulary } from "../../services/vocabulary.service";

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const LEVEL_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  N1: { bg: "linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)", text: "#fff", badge: "#7B1FA2" },
  N2: { bg: "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)", text: "#fff", badge: "#1565C0" },
  N3: { bg: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)", text: "#fff", badge: "#2E7D32" },
  N4: { bg: "linear-gradient(135deg, #E65100 0%, #FFA726 100%)", text: "#fff", badge: "#E65100" },
  N5: { bg: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)", text: "#fff", badge: "#B90000" },
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

  // ─── Filter State ─────────────────────────────────────────────────────────
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
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

  // ─── Fetch topics on level change ─────────────────────────────────────────
  useEffect(() => {
    setLoadingTopics(true);
    setSelectedTopic("");
    vocabularyService
      .getTopics(selectedLevel || undefined)
      .then(setTopics)
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

  // ─── Flashcard handlers ───────────────────────────────────────────────────
  const flip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped((p) => !p);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goNext = () => {
    if (isAnimating) return;
    if (currentIndex >= cards.length - 1) { setFinished(true); return; }
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => { setCurrentIndex((p) => p + 1); setIsAnimating(false); }, 300);
  };

  const goPrev = () => {
    if (isAnimating || currentIndex === 0) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => { setCurrentIndex((p) => p - 1); setIsAnimating(false); }, 300);
  };

  const handleRestart = () => { setCurrentIndex(0); setIsFlipped(false); setFinished(false); };
  const handleShuffle = () => {
    setCards((prev) => shuffle(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
    setFinished(false);
  };

  // Keyboard nav
  useEffect(() => {
    if (mode !== "flashcard") return;
    const handler = (e: KeyboardEvent) => {
      if (!sessionStarted || finished) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionStarted, finished, currentIndex, isAnimating, isFlipped]);

  // ─── Quiz handlers ────────────────────────────────────────────────────────
  const generateQuiz = useCallback(() => {
    if (cards.length < 4) return;
    const count = quizCount === -1 ? cards.length : Math.min(quizCount, cards.length);
    const questionCards = shuffle(cards).slice(0, count);

    const questions: QuizQuestion[] = questionCards.map((card) => {
      const others = cards.filter((c) => c._id !== card._id);
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
  }, [cards, quizDirection, quizCount]);

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
  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
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
        borderColor: "#e0e0e0",
        color: "#333",
        "&:hover": { bgcolor: "#fff5f5", borderColor: "#B90000" },
      };
    }
    if (index === currentQuestion?.correctIndex) {
      return { bgcolor: "#e8f5e9", borderColor: "#4CAF50", color: "#2E7D32", fontWeight: 700 };
    }
    if (index === selectedAnswer) {
      return { bgcolor: "#ffebee", borderColor: "#F44336", color: "#C62828" };
    }
    return { bgcolor: "#fafafa", borderColor: "#e0e0e0", color: "#aaa" };
  };

  const getScoreMessage = (pct: number) => {
    if (pct === 100) return { msg: "Hoàn hảo! Bạn xuất sắc! 🏆", color: "#2E7D32" };
    if (pct >= 80) return { msg: "Rất tốt! Tiếp tục phát huy! 🌟", color: "#1565C0" };
    if (pct >= 60) return { msg: "Khá tốt! Ôn thêm một chút nữa nhé! 💪", color: "#E65100" };
    if (pct >= 40) return { msg: "Cần cố gắng hơn! Đừng nản lòng! 📚", color: "#F44336" };
    return { msg: "Hãy ôn lại flashcard trước khi làm quiz nhé! 🔄", color: "#B90000" };
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 2,
        pb: 6,
        px: 2,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 860,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(185,0,0,0.3)",
            }}
          >
            <BookMarked size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a1a">
              Ôn luyện Từ vựng
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Flashcard JLPT N1 – N5
            </Typography>
          </Box>
        </Box>

        {/* Flashcard toolbar */}
        {mode === "flashcard" && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title={showReading ? "Ẩn cách đọc" : "Hiện cách đọc"}>
              <IconButton
                onClick={() => setShowReading((p) => !p)}
                size="small"
                sx={{ border: "1px solid #eee" }}
              >
                {showReading ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Trộn bài">
              <IconButton
                onClick={handleShuffle}
                size="small"
                disabled={cards.length === 0}
                sx={{ border: "1px solid #eee" }}
              >
                <Shuffle size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Làm lại từ đầu">
              <IconButton
                onClick={handleRestart}
                size="small"
                disabled={cards.length === 0}
                sx={{ border: "1px solid #eee" }}
              >
                <RotateCcw size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* ── Mode Tabs ──────────────────────────────────────────────────────── */}
      <Box sx={{ width: "100%", maxWidth: 860, mb: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            bgcolor: "#f5f5f5",
            borderRadius: "14px",
            p: "4px",
            gap: "4px",
          }}
        >
          {[
            { key: "flashcard", label: "🃏 Flashcard" },
            { key: "quiz", label: "📝 Quiz" },
          ].map((tab) => (
            <Button
              key={tab.key}
              onClick={() => {
                setMode(tab.key as "flashcard" | "quiz");
                resetQuiz();
              }}
              sx={{
                flex: 1,
                borderRadius: "10px",
                py: 1,
                fontWeight: 700,
                fontSize: 14,
                transition: "all 0.2s",
                bgcolor: mode === tab.key ? "#fff" : "transparent",
                color: mode === tab.key ? "#B90000" : "#888",
                boxShadow: mode === tab.key ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                "&:hover": {
                  bgcolor: mode === tab.key ? "#fff" : "rgba(255,255,255,0.6)",
                },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 860,
          display: "flex",
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Cấp độ</InputLabel>
          <Select
            label="Cấp độ"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {LEVELS.map((l) => (
              <MenuItem key={l} value={l}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: LEVEL_COLORS[l].badge }}
                  />
                  {l}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Chủ đề</InputLabel>
          <Select
            label="Chủ đề"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            disabled={loadingTopics}
          >
            <MenuItem value="">Tất cả chủ đề</MenuItem>
            {topics.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {cards.length > 0 && (
          <Chip
            label={`${cards.length} thẻ`}
            size="small"
            sx={{
              bgcolor: "#fff5f5",
              color: "#B90000",
              border: "1px solid #ffcccc",
              fontWeight: 600,
            }}
          />
        )}

        {mode === "flashcard" && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            Phím tắt: ← → di chuyển | Space lật thẻ
          </Typography>
        )}
      </Box>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#B90000" }} />
        </Box>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && cards.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8, px: 3, maxWidth: 400 }}>
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
              mb: 2,
            }}
          >
            <BookMarked size={36} color="#B90000" />
          </Box>
          <Typography variant="h6" fontWeight={600} color="#333" mb={1}>
            Chưa có từ vựng nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bộ từ vựng đang được cập nhật. Hãy chọn cấp độ/chủ đề khác hoặc liên hệ admin để thêm
            từ.
          </Typography>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── FLASHCARD MODE ─────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!loading && mode === "flashcard" && (
        <>
          {/* Progress bar */}
          {cards.length > 0 && !finished && (
            <Box sx={{ width: "100%", maxWidth: 860, mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Tiến độ
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {currentIndex + 1} / {cards.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "#f0f0f0",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          )}

          {/* Flashcard */}
          {currentCard && !finished && (
            <>
              <Box
                onClick={flip}
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  height: { xs: 320, sm: 380 },
                  perspective: "1200px",
                  cursor: "pointer",
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      borderRadius: "24px",
                      background: levelColor.bg,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                      px: 4,
                      userSelect: "none",
                    }}
                  >
                    <Chip
                      label={currentCard.level}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.25)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: 1,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: { xs: 52, sm: 68 },
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1,
                        textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        textAlign: "center",
                      }}
                    >
                      {currentCard.word}
                    </Typography>
                    {showReading && (
                      <Typography sx={{ fontSize: 22, color: "rgba(255,255,255,0.85)", fontWeight: 400 }}>
                        {currentCard.reading}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 20,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      <Typography variant="caption">Nhấn để lật thẻ</Typography>
                    </Box>
                  </Box>

                  {/* Back */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderRadius: "24px",
                      bgcolor: "#fff",
                      border: "3px solid",
                      borderColor: levelColor.badge,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                      px: 4,
                      py: 3,
                      userSelect: "none",
                    }}
                  >
                    <Box sx={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 1 }}>
                      <Chip
                        label={currentCard.level}
                        size="small"
                        sx={{
                          bgcolor: levelColor.badge + "18",
                          color: levelColor.badge,
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      />
                      <Chip
                        label={currentCard.topic}
                        size="small"
                        sx={{ bgcolor: "#f5f5f5", color: "#666", fontSize: 11 }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>
                      {currentCard.word}
                    </Typography>
                    <Box
                      sx={{
                        textAlign: "center",
                        borderTop: "1px solid #f0f0f0",
                        borderBottom: "1px solid #f0f0f0",
                        py: 1.5,
                        px: 2,
                        width: "100%",
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} color={levelColor.badge} mb={0.5}>
                        {currentCard.meaning}
                      </Typography>
                    </Box>
                    {currentCard.example && (
                      <Box sx={{ textAlign: "center", maxWidth: "90%" }}>
                        <Typography variant="body2" color="#555" mb={0.5} sx={{ fontStyle: "italic" }}>
                          {currentCard.example}
                        </Typography>
                        {currentCard.exampleMeaning && (
                          <Typography variant="caption" color="#888">
                            → {currentCard.exampleMeaning}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Nav buttons */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ChevronLeft size={18} />}
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  sx={{
                    borderColor: "#ddd",
                    color: "#555",
                    borderRadius: "12px",
                    px: 3,
                    "&:hover": { borderColor: "#B90000", color: "#B90000" },
                    "&.Mui-disabled": { borderColor: "#f0f0f0", color: "#ccc" },
                  }}
                >
                  Trước
                </Button>
                <Button
                  variant="contained"
                  onClick={flip}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "12px",
                    px: 4,
                    fontWeight: 600,
                    boxShadow: "0 4px 16px rgba(185,0,0,0.35)",
                    "&:hover": { background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)" },
                  }}
                >
                  Lật thẻ
                </Button>
                <Button
                  variant="outlined"
                  endIcon={<ChevronRight size={18} />}
                  onClick={goNext}
                  sx={{
                    borderColor: "#ddd",
                    color: "#555",
                    borderRadius: "12px",
                    px: 3,
                    "&:hover": { borderColor: "#B90000", color: "#B90000" },
                  }}
                >
                  {currentIndex >= cards.length - 1 ? "Xong" : "Tiếp"}
                </Button>
              </Box>

              {/* Tags */}
              {(currentCard.tags || []).length > 0 && (
                <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                  {currentCard.tags!.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{ bgcolor: "#f5f5f5", color: "#888", fontSize: 11 }}
                    />
                  ))}
                </Box>
              )}
            </>
          )}

          {/* Flashcard finished */}
          {finished && (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                px: 4,
                maxWidth: 480,
                background: "linear-gradient(135deg, #fff5f5 0%, #fff 100%)",
                borderRadius: "24px",
                border: "2px solid #ffcccc",
                boxShadow: "0 12px 40px rgba(185,0,0,0.12)",
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                  boxShadow: "0 8px 24px rgba(185,0,0,0.3)",
                }}
              >
                <CheckCircle size={40} color="#fff" />
              </Box>
              <Typography variant="h5" fontWeight={700} color="#1a1a1a" mb={1}>
                🎉 Hoàn thành!
              </Typography>
              <Typography variant="body1" color="#555" mb={3}>
                Bạn đã ôn xong{" "}
                <strong style={{ color: "#B90000" }}>{cards.length}</strong> từ vựng
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
                .
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
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  Ôn lại từ đầu
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Shuffle size={16} />}
                  onClick={() => { handleShuffle(); setFinished(false); }}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "12px",
                    fontWeight: 600,
                    boxShadow: "0 4px 16px rgba(185,0,0,0.3)",
                    "&:hover": { background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)" },
                  }}
                >
                  Trộn & ôn lại
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── QUIZ MODE ──────────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!loading && mode === "quiz" && (
        <>
          {/* ── Quiz Setup ──────────────────────────────────────────────── */}
          {!quizStarted && cards.length >= 4 && (
            <Box sx={{ width: "100%", maxWidth: 680 }}>
              {/* Direction */}
              <Typography variant="subtitle1" fontWeight={700} color="#333" mb={1.5}>
                Chọn hướng câu hỏi:
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
                {[
                  {
                    key: "jp-to-vn",
                    emoji: "🇯🇵 → 🇻🇳",
                    sub: "Xem từ tiếng Nhật, chọn nghĩa tiếng Việt",
                  },
                  {
                    key: "vn-to-jp",
                    emoji: "🇻🇳 → 🇯🇵",
                    sub: "Xem nghĩa tiếng Việt, chọn từ tiếng Nhật",
                  },
                ].map((opt) => {
                  const isSelected = quizDirection === opt.key;
                  return (
                    <Box
                      key={opt.key}
                      onClick={() => setQuizDirection(opt.key as "jp-to-vn" | "vn-to-jp")}
                      sx={{
                        flex: 1,
                        minWidth: 200,
                        p: 2,
                        borderRadius: "14px",
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor: isSelected ? "#B90000" : "#e0e0e0",
                        bgcolor: isSelected ? "#fff5f5" : "#fff",
                        transition: "all 0.2s",
                        "&:hover": { borderColor: "#B90000", bgcolor: "#fff5f5" },
                      }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color={isSelected ? "#B90000" : "#333"}
                        mb={0.3}
                      >
                        {opt.emoji}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.sub}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Question count */}
              <Typography variant="subtitle1" fontWeight={700} color="#333" mb={1.5}>
                Số câu hỏi:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 4, flexWrap: "wrap" }}>
                {[
                  { label: "10 câu", value: 10 },
                  { label: "20 câu", value: 20 },
                  { label: `Tất cả (${cards.length})`, value: -1 },
                ].map((opt) => {
                  const tooFew = opt.value > 0 && opt.value > cards.length;
                  const isSelected = quizCount === opt.value;
                  return (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      onClick={() => !tooFew && setQuizCount(opt.value)}
                      sx={{
                        cursor: tooFew ? "not-allowed" : "pointer",
                        fontWeight: isSelected ? 700 : 500,
                        bgcolor: isSelected ? "#B90000" : tooFew ? "#f5f5f5" : "#fff",
                        color: isSelected ? "#fff" : tooFew ? "#ccc" : "#333",
                        border: "1.5px solid",
                        borderColor: isSelected ? "#B90000" : tooFew ? "#e0e0e0" : "#ccc",
                        px: 0.5,
                        "& .MuiChip-label": { fontSize: 14, px: 1.5 },
                        "&:hover": !tooFew ? { opacity: 0.85 } : {},
                      }}
                    />
                  );
                })}
              </Box>

              {/* Start button */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={generateQuiz}
                startIcon={<Brain size={20} />}
                sx={{
                  background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                  borderRadius: "14px",
                  py: 1.6,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  boxShadow: "0 6px 20px rgba(185,0,0,0.35)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                    boxShadow: "0 8px 24px rgba(185,0,0,0.45)",
                  },
                }}
              >
                Bắt đầu Quiz
              </Button>
            </Box>
          )}

          {/* Not enough cards warning */}
          {!quizStarted && cards.length > 0 && cards.length < 4 && (
            <Box
              sx={{
                bgcolor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "12px",
                p: 3,
                maxWidth: 480,
                textAlign: "center",
              }}
            >
              <Typography variant="body1" color="#856404" fontWeight={600} mb={1}>
                ⚠️ Không đủ từ vựng
              </Typography>
              <Typography variant="body2" color="#856404">
                Cần ít nhất 4 từ để tạo câu hỏi trắc nghiệm. Hiện có{" "}
                <strong>{cards.length}</strong> từ. Hãy chọn cấp độ/chủ đề khác.
              </Typography>
            </Box>
          )}

          {/* ── Quiz In Progress ────────────────────────────────────────── */}
          {quizStarted && !quizFinished && currentQuestion && (
            <Box sx={{ width: "100%", maxWidth: 680 }}>
              {/* Header bar */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Câu {quizIndex + 1} / {quizQuestions.length}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "20px",
                      bgcolor: "#e8f5e9",
                      border: "1px solid #c8e6c9",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} color="#2E7D32">
                      ✓ {quizScore}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "20px",
                      bgcolor: "#ffebee",
                      border: "1px solid #ffcdd2",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} color="#C62828">
                      ✗ {wrongAnswers.length}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Progress */}
              <LinearProgress
                variant="determinate"
                value={quizProgress}
                sx={{
                  mb: 2.5,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "#f0f0f0",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: 3,
                  },
                }}
              />

              {/* Question card */}
              <Box
                sx={{
                  background:
                    LEVEL_COLORS[currentQuestion.card.level]?.bg || LEVEL_COLORS.N5.bg,
                  borderRadius: "20px",
                  p: { xs: 3, sm: 4 },
                  mb: 2.5,
                  textAlign: "center",
                  boxShadow: "0 10px 36px rgba(0,0,0,0.18)",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
                  <Chip
                    label={currentQuestion.card.level}
                    size="small"
                    sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700 }}
                  />
                  <Chip
                    label={currentQuestion.card.topic}
                    size="small"
                    sx={{
                      bgcolor: "rgba(255,255,255,0.18)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 11,
                    }}
                  />
                </Box>

                {quizDirection === "jp-to-vn" ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: { xs: 44, sm: 60 },
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.1,
                        mb: 1,
                        textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      }}
                    >
                      {currentQuestion.card.word}
                    </Typography>
                    <Typography sx={{ fontSize: 18, color: "rgba(255,255,255,0.8)" }}>
                      {currentQuestion.card.reading}
                    </Typography>
                  </>
                ) : (
                  <Typography
                    sx={{
                      fontSize: { xs: 22, sm: 30 },
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.4,
                      textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                  >
                    {currentQuestion.card.meaning}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)", mt: 2, display: "block" }}
                >
                  {quizDirection === "jp-to-vn"
                    ? "Nghĩa của từ này là gì?"
                    : "Từ tiếng Nhật nào có nghĩa này?"}
                </Typography>
              </Box>

              {/* Answer options 2×2 */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={isAnswered}
                    sx={{
                      border: "2px solid",
                      borderRadius: "12px",
                      py: 1.5,
                      px: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                      textTransform: "none",
                      transition: "all 0.2s",
                      cursor: isAnswered ? "default" : "pointer",
                      ...getOptionStyle(index),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, width: "100%" }}>
                      {/* Label circle */}
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          transition: "all 0.2s",
                          bgcolor: isAnswered
                            ? index === currentQuestion.correctIndex
                              ? "#4CAF50"
                              : index === selectedAnswer
                              ? "#F44336"
                              : "#e0e0e0"
                            : "#f0f0f0",
                          color: isAnswered
                            ? index === currentQuestion.correctIndex || index === selectedAnswer
                              ? "#fff"
                              : "#999"
                            : "#555",
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
                        fontWeight={500}
                        sx={{ lineHeight: 1.4, wordBreak: "break-word" }}
                      >
                        {option}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>

              {/* Answer feedback + Next button */}
              {isAnswered && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor:
                        selectedAnswer === currentQuestion.correctIndex
                          ? "#e8f5e9"
                          : "#ffebee",
                      border: "1px solid",
                      borderColor:
                        selectedAnswer === currentQuestion.correctIndex
                          ? "#a5d6a7"
                          : "#ffcdd2",
                    }}
                  >
                    {selectedAnswer === currentQuestion.correctIndex ? (
                      <Typography variant="body2" fontWeight={600} color="#2E7D32">
                        ✅ Chính xác! Rất tốt!
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#C62828" mb={0.3}>
                          ❌ Chưa đúng!
                        </Typography>
                        <Typography variant="body2" color="#555">
                          Đáp án đúng:{" "}
                          <strong>{currentQuestion.options[currentQuestion.correctIndex]}</strong>
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
                      borderRadius: "12px",
                      py: 1.3,
                      fontWeight: 600,
                      boxShadow: "0 4px 16px rgba(185,0,0,0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                      },
                    }}
                  >
                    {quizIndex >= quizQuestions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* ── Quiz Results ─────────────────────────────────────────────── */}
          {quizFinished && !showWrongReview && (
            <Box sx={{ width: "100%", maxWidth: 600 }}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 5,
                  px: 3,
                  background: "linear-gradient(135deg, #fff5f5 0%, #fff 100%)",
                  borderRadius: "24px",
                  border: "2px solid #ffcccc",
                  boxShadow: "0 12px 40px rgba(185,0,0,0.12)",
                  mb: 2,
                }}
              >
                {/* Score circle */}
                <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={128}
                    thickness={4}
                    sx={{ color: "#f0f0f0", position: "absolute" }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={quizScorePercent}
                    size={128}
                    thickness={4}
                    sx={{
                      color:
                        quizScorePercent >= 80
                          ? "#4CAF50"
                          : quizScorePercent >= 60
                          ? "#FF9800"
                          : "#F44336",
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
                      fontWeight={800}
                      color={
                        quizScorePercent >= 80
                          ? "#4CAF50"
                          : quizScorePercent >= 60
                          ? "#FF9800"
                          : "#F44336"
                      }
                    >
                      {quizScorePercent}%
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h5" fontWeight={700} color="#1a1a1a" mb={0.5}>
                  {quizScore} / {quizQuestions.length} câu đúng
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color={getScoreMessage(quizScorePercent).color}
                  mb={3}
                >
                  {getScoreMessage(quizScorePercent).msg}
                </Typography>

                {/* Stats row */}
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 3.5, flexWrap: "wrap" }}
                >
                  {[
                    { label: "Đúng", value: quizScore, bg: "#e8f5e9", border: "#c8e6c9", color: "#2E7D32" },
                    {
                      label: "Sai",
                      value: wrongAnswers.length,
                      bg: "#ffebee",
                      border: "#ffcdd2",
                      color: "#C62828",
                    },
                    {
                      label: "Tổng",
                      value: quizQuestions.length,
                      bg: "#f3f4f6",
                      border: "#e5e7eb",
                      color: "#333",
                    },
                  ].map((s) => (
                    <Box
                      key={s.label}
                      sx={{
                        px: 3,
                        py: 1.5,
                        borderRadius: "12px",
                        bgcolor: s.bg,
                        border: `1px solid ${s.border}`,
                        textAlign: "center",
                        minWidth: 70,
                      }}
                    >
                      <Typography variant="h6" fontWeight={800} color={s.color}>
                        {s.value}
                      </Typography>
                      <Typography variant="caption" color="#666">
                        {s.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
                  {wrongAnswers.length > 0 && (
                    <Button
                      variant="outlined"
                      onClick={() => setShowWrongReview(true)}
                      sx={{
                        borderColor: "#F44336",
                        color: "#F44336",
                        borderRadius: "12px",
                        fontWeight: 600,
                        "&:hover": { bgcolor: "#ffebee" },
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
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#fff5f5" },
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
                      fontWeight: 600,
                      boxShadow: "0 4px 16px rgba(185,0,0,0.3)",
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
          )}

          {/* ── Wrong Answer Review ──────────────────────────────────────── */}
          {quizFinished && showWrongReview && (
            <Box sx={{ width: "100%", maxWidth: 680 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2.5,
                }}
              >
                <Typography variant="h6" fontWeight={700} color="#C62828">
                  ❌ Các câu trả lời sai ({wrongAnswers.length})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowWrongReview(false)}
                  sx={{
                    borderColor: "#B90000",
                    color: "#B90000",
                    borderRadius: "10px",
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  ← Về kết quả
                </Button>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {wrongAnswers.map(({ question, selectedIndex }, i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: "16px",
                      border: "1px solid #ffcdd2",
                      overflow: "hidden",
                      bgcolor: "#fff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Card header */}
                    <Box
                      sx={{
                        p: 2,
                        background:
                          LEVEL_COLORS[question.card.level]?.bg || LEVEL_COLORS.N5.bg,
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
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      />
                      <Typography fontWeight={700} color="#fff" fontSize={15}>
                        {quizDirection === "jp-to-vn"
                          ? `${question.card.word}（${question.card.reading}）`
                          : question.card.meaning}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      {/* Wrong answer */}
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                        <Typography color="#F44336" sx={{ mt: 0.2, flexShrink: 0 }}>
                          ✗
                        </Typography>
                        <Box>
                          <Typography variant="caption" color="#aaa">
                            Bạn chọn:
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="#C62828">
                            {question.options[selectedIndex]}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Correct answer */}
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <Typography color="#4CAF50" sx={{ mt: 0.2, flexShrink: 0 }}>
                          ✓
                        </Typography>
                        <Box>
                          <Typography variant="caption" color="#aaa">
                            Đáp án đúng:
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="#2E7D32">
                            {question.options[question.correctIndex]}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Example sentence */}
                      {question.card.example && (
                        <Box
                          sx={{
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: "1px solid #f0f0f0",
                          }}
                        >
                          <Typography variant="caption" color="#555" display="block" sx={{ fontStyle: "italic" }}>
                            {question.card.example}
                          </Typography>
                          {question.card.exampleMeaning && (
                            <Typography variant="caption" color="#aaa">
                              → {question.card.exampleMeaning}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 3, display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<RotateCcw size={16} />}
                  onClick={generateQuiz}
                  sx={{
                    borderColor: "#B90000",
                    color: "#B90000",
                    borderRadius: "12px",
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#fff5f5" },
                  }}
                >
                  Làm lại quiz
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Target size={16} />}
                  onClick={resetQuiz}
                  sx={{
                    background: "linear-gradient(135deg, #B90000 0%, #EF5350 100%)",
                    borderRadius: "12px",
                    fontWeight: 600,
                    boxShadow: "0 4px 16px rgba(185,0,0,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #990000 0%, #D32F2F 100%)",
                    },
                  }}
                >
                  Quiz mới
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
