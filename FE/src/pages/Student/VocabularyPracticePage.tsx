import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  BookMarked,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Brain,
  Volume2,
  Sparkles,
  Search,
  HelpCircle,
} from "lucide-react";
import { vocabularyService } from "../../services/vocabulary.service";
import type { IVocabulary } from "../../services/vocabulary.service";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";

const LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const LEVEL_COLORS: Record<string, { bg: string; text: string; badge: string; shadow: string; border: string; textBrand: string }> = {
  N1: {
    bg: "from-indigo-650 to-purple-600",
    text: "text-white",
    badge: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    shadow: "shadow-purple-500/20",
    border: "border-purple-500",
    textBrand: "text-purple-650",
  },
  N2: {
    bg: "from-sky-600 to-cyan-550",
    text: "text-white",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
    shadow: "shadow-cyan-550/20",
    border: "border-cyan-550",
    textBrand: "text-cyan-600",
  },
  N3: {
    bg: "from-emerald-600 to-teal-550",
    text: "text-white",
    badge: "bg-teal-500/20 text-teal-200 border-teal-400/30",
    shadow: "shadow-teal-550/20",
    border: "border-emerald-500",
    textBrand: "text-emerald-600",
  },
  N4: {
    bg: "from-orange-600 to-amber-500",
    text: "text-white",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    shadow: "shadow-amber-500/20",
    border: "border-orange-500",
    textBrand: "text-orange-600",
  },
  N5: {
    bg: "from-red-600 to-rose-500",
    text: "text-white",
    badge: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    shadow: "shadow-rose-500/20",
    border: "border-red-500",
    textBrand: "text-red-600",
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

interface QuizQuestion {
  card: IVocabulary;
  options: string[];
  correctIndex: number;
}

interface WrongAnswer {
  question: QuizQuestion;
  selectedIndex: number;
}

const VocabularyPracticePage: React.FC = () => {
  // Mode
  const [mode, setMode] = useState<"flashcard" | "quiz">("flashcard");

  // Filters & Search
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Deck data
  const [cards, setCards] = useState<IVocabulary[]>([]);
  const [loading, setLoading] = useState(false);

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showReading, setShowReading] = useState(true);

  // Quiz state
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

  // TTS Voice
  const speakWord = (e: React.MouseEvent, word: string) => {
    e.stopPropagation(); // Stop flipping when clicking TTS button
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "ja-JP";
      window.speechSynthesis.speak(utterance);
    }
  };

  // Fetch topics
  useEffect(() => {
    setLoadingTopics(true);
    setSelectedTopic("");
    void vocabularyService
      .getTopics(selectedLevel || undefined)
      .then((data) => {
        const clean = data.filter((t) => t && t.trim().length > 1);
        setTopics(clean);
      })
      .finally(() => setLoadingTopics(false));
  }, [selectedLevel]);

  // Load Deck
  const loadDeck = useCallback(
    async (shuffledDeck = false) => {
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
        const deck = shuffledDeck ? shuffle(result.data) : result.data;
        setCards(deck);
        if (deck.length > 0) setSessionStarted(true);
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    },
    [selectedLevel, selectedTopic]
  );

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  // Search filtered cards
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

  // Flashcard navigation
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

  // Keyboard controls for Flashcard
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

  // Quiz logic
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

  const handleSelectAnswer = (ansIdx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(ansIdx);
    setIsAnswered(true);
    const currentQ = quizQuestions[quizIndex];
    if (!currentQ) return;
    if (ansIdx === currentQ.correctIndex) {
      setQuizScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [...prev, { question: currentQ, selectedIndex: ansIdx }]);
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

  // UI calculations
  const currentCard = filteredCards[currentIndex];
  const progress = filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0;
  const levelStyle = currentCard ? LEVEL_COLORS[currentCard.level] : LEVEL_COLORS["N5"];

  const currentQuestion = quizQuestions[quizIndex];
  const quizProgress = quizQuestions.length > 0 ? ((quizIndex + 1) / quizQuestions.length) * 100 : 0;
  const quizScorePercent = quizQuestions.length > 0 ? Math.round((quizScore / quizQuestions.length) * 100) : 0;

  const getOptionClasses = (index: number) => {
    if (!isAnswered) {
      return "bg-[var(--color-surface-base)] border-[var(--color-border-color)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:border-[var(--color-primary-color)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer";
    }
    if (index === currentQuestion?.correctIndex) {
      return "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm";
    }
    if (index === selectedAnswer) {
      return "bg-red-50 border-red-500 text-red-800 font-extrabold shadow-sm";
    }
    return "bg-[var(--color-bg-base)] border-[var(--color-border-color)] text-[var(--color-text-secondary)]/50 opacity-60";
  };

  const getScoreMessage = (pct: number) => {
    if (pct === 100) return { msg: "Hoàn hảo! Bạn thật xuất sắc! 🏆", color: "text-emerald-600" };
    if (pct >= 80) return { msg: "Rất tốt! Tiếp tục phát huy nhé! 🌟", color: "text-blue-600" };
    if (pct >= 60) return { msg: "Khá tốt! Ôn thêm chút nữa nhé! 💪", color: "text-orange-600" };
    if (pct >= 40) return { msg: "Cần cố gắng hơn! Đừng nản lòng! 📚", color: "text-red-500" };
    return { msg: "Hãy ôn lại flashcard trước khi làm quiz nhé! 🔄", color: "text-red-650" };
  };

  return (
    <PageLayout title="">
      {/* Compact Top Bar: Mode Tabs + Filters */}
      <BaseCard className="!p-3 bg-[var(--color-surface-base)] border-[var(--color-border-color)] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Mode Tabs */}
          <div className="flex bg-[var(--color-bg-base)] rounded-xl p-1 border border-[var(--color-border-color)] shrink-0">
            <button
              onClick={() => {
                setMode("flashcard");
                resetQuiz();
              }}
              className={`px-4 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 rounded-lg ${
                mode === "flashcard"
                  ? "bg-[var(--color-primary-color)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              }`}
            >
              Học Flashcard
            </button>
            <button
              onClick={() => {
                setMode("quiz");
                resetQuiz();
              }}
              className={`px-4 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 rounded-lg ${
                mode === "quiz"
                  ? "bg-[var(--color-primary-color)] text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              }`}
            >
              Làm Trắc nghiệm
            </button>
          </div>

          {/* Inline Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-start lg:justify-end">
            {/* Level selector */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="border border-[var(--color-border-color)] rounded-xl px-3 py-1.5 bg-[var(--color-bg-base)] text-xs font-bold text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary-color)]"
            >
              <option value="">Tất cả cấp độ</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            {/* Topic selector */}
            <select
              value={selectedTopic}
              disabled={loadingTopics}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="border border-[var(--color-border-color)] rounded-xl px-3 py-1.5 bg-[var(--color-bg-base)] text-xs font-bold text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary-color)] disabled:opacity-50"
            >
              <option value="">Tất cả chủ đề</option>
              {topics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <input
                type="text"
                placeholder="Tìm từ vựng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-[var(--color-border-color)] rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] focus:outline-none focus:border-[var(--color-primary-color)]"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]/50" />
            </div>

            {filteredCards.length > 0 && (
              <span className="text-[11px] bg-[var(--color-accent-color)] text-[var(--color-primary-color)] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                {filteredCards.length} từ
              </span>
            )}
          </div>
        </div>
      </BaseCard>

      {/* Loading state indicator */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[220px] gap-2">
          <div className="w-7 h-7 border-3 border-[var(--color-primary-color)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">Đang chuẩn bị bộ thẻ học...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCards.length === 0 && (
        <BaseCard className="text-center py-8">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 bg-[var(--color-bg-base)] rounded-full flex items-center justify-center mx-auto border border-[var(--color-border-color)]">
              <BookMarked size={22} className="text-[var(--color-text-secondary)]/50" />
            </div>
            <h4 className="text-xs font-extrabold text-[var(--color-text-main)] m-0">Không tìm thấy từ vựng nào</h4>
            <p className="text-xs text-[var(--color-text-secondary)]/70 m-0 leading-relaxed">
              Vui lòng chuyển cấp độ, chủ đề hoặc thử lại từ khóa khác.
            </p>
          </div>
        </BaseCard>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 🃏 FLASHCARD PANEL RENDER                                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {!loading && mode === "flashcard" && filteredCards.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Progress bar & Flashcard controls */}
          {!finished && (
            <div className="w-full max-w-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)] font-extrabold uppercase tracking-wider">
                <span>TIẾN ĐỘ HỌC TẬP</span>

                <div className="flex items-center gap-3">
                  {/* Action buttons inside Flashcard area */}
                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={() => setShowReading((p) => !p)}
                      title={showReading ? "Ẩn cách đọc" : "Hiện cách đọc"}
                      className={`p-1.5 border rounded-full transition active:scale-95 cursor-pointer ${
                        showReading
                          ? "bg-[var(--color-accent-color)] border-[var(--color-primary-color)]/20 text-[var(--color-primary-color)]"
                          : "bg-[var(--color-surface-base)] border-[var(--color-border-color)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-color)]"
                      }`}
                    >
                      {showReading ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>

                    <button
                      onClick={handleShuffle}
                      title="Trộn từ vựng"
                      className="p-1.5 border border-[var(--color-border-color)] rounded-full bg-[var(--color-surface-base)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-color)] hover:border-[var(--color-primary-color)]/20 transition active:scale-95 cursor-pointer"
                    >
                      <Shuffle size={15} />
                    </button>

                    <button
                      onClick={handleRestart}
                      title="Làm lại từ đầu"
                      className="p-1.5 border border-[var(--color-border-color)] rounded-full bg-[var(--color-surface-base)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-color)] hover:border-[var(--color-primary-color)]/20 transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>

                  <span className="text-[var(--color-primary-color)] font-extrabold text-xs">
                    {currentIndex + 1} / {filteredCards.length} TỪ
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary-color)] rounded-full transition-all duration-350"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* The Flashcard itself (Compact height) */}
          {currentCard && !finished && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div
                onClick={flip}
                className="relative w-full max-w-2xl h-60 sm:h-72 [perspective:1500px] cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div
                  className="relative w-full h-full duration-550 [transform-style:preserve-3d] transition-transform"
                  style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  {/* Card Front Side */}
                  <div
                    className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl bg-gradient-to-br ${levelStyle.bg} flex flex-col items-center justify-center gap-4 p-8 shadow-xl border border-white/10`}
                  >
                    {/* TTS Button */}
                    <button
                      onClick={(e) => speakWord(e, currentCard.word)}
                      className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/35 rounded-xl text-white transition active:scale-90"
                    >
                      <Volume2 size={18} />
                    </button>

                    {/* Level Badge */}
                    <span className="absolute top-5 left-5 text-[10px] font-black tracking-widest text-white/90 bg-white/20 border border-white/20 px-3 py-1 rounded-lg">
                      {currentCard.level}
                    </span>

                    {/* Main Japanese Word */}
                    <h2 className="text-4xl sm:text-5xl font-black text-white text-center m-0 leading-none select-all tracking-wide drop-shadow-md">
                      {currentCard.word}
                    </h2>

                    {showReading && (
                      <span className="text-sm font-extrabold text-white/90 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
                        {currentCard.reading}
                      </span>
                    )}

                    <div className="absolute bottom-5 flex items-center gap-1.5 text-white/60 text-[10px] font-extrabold tracking-wide uppercase">
                      <Sparkles size={12} />
                      <span>Nhấn để xem nghĩa của từ</span>
                    </div>
                  </div>

                  {/* Card Back Side */}
                  <div
                    className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl bg-[var(--color-surface-base)] border-3 ${levelStyle.border} flex flex-col items-center justify-center gap-4 p-8 shadow-xl`}
                  >
                    {/* TTS Button */}
                    <button
                      onClick={(e) => speakWord(e, currentCard.word)}
                      className="absolute top-5 right-5 p-2 bg-[var(--color-bg-base)] hover:bg-slate-200 rounded-xl text-[var(--color-text-secondary)] transition active:scale-90"
                    >
                      <Volume2 size={18} />
                    </button>

                    {/* Metadata Badges */}
                    <div className="absolute top-5 left-5 flex gap-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border ${levelStyle.badge}`}>
                        {currentCard.level}
                      </span>
                      {currentCard.topic && (
                        <span className="text-[10px] font-extrabold text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] px-2.5 py-0.5 rounded-lg">
                          {currentCard.topic}
                        </span>
                      )}
                    </div>

                    {/* Japanese Word */}
                    <span className="text-lg font-black text-[var(--color-text-secondary)]/50 select-all">{currentCard.word}</span>

                    {/* Divider meaning line */}
                    <div className="w-full text-center border-y border-[var(--color-border-color)] border-dashed py-3 my-1">
                      <span className={`text-2xl sm:text-3xl font-black ${levelStyle.textBrand}`}>
                        {currentCard.meaning}
                      </span>
                    </div>

                    {/* Example block */}
                    {currentCard.example && (
                      <div className="bg-[var(--color-bg-base)] border border-[var(--color-border-color)] rounded-2xl p-4 text-center max-w-[95%]">
                        <p className="text-xs text-[var(--color-text-main)] font-bold italic m-0 select-all">
                          {currentCard.example}
                        </p>
                        {currentCard.exampleMeaning && (
                          <p className="text-[10px] text-[var(--color-text-secondary)]/70 m-0 mt-1">
                            → {currentCard.exampleMeaning}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom buttons Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border-color)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-color)] hover:border-[var(--color-primary-color)]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition active:scale-95 bg-[var(--color-surface-base)] shadow-xs"
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>

                <button
                  onClick={flip}
                  className="px-6 py-2 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] active:scale-95 transition text-white text-xs font-extrabold rounded-xl shadow-xs shadow-red-900/10"
                >
                  Lật thẻ
                </button>

                <button
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border-color)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-color)] hover:border-[var(--color-primary-color)]/20 rounded-xl text-xs font-bold transition active:scale-95 bg-[var(--color-surface-base)] shadow-xs"
                >
                  {currentIndex >= filteredCards.length - 1 ? "Hoàn thành" : "Tiếp theo"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Finished review card */}
          {finished && (
            <div className="w-full max-w-lg animate-scaleUp">
              <BaseCard className="text-center p-8 border border-[var(--color-primary-color)]/20 space-y-6">
                <div className="w-16 h-16 bg-gradient-to-tr from-[var(--color-primary-color)] to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-900/10">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[var(--color-text-main)] m-0">🎉 Hoàn thành ôn tập!</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] m-0 leading-relaxed font-semibold">
                    Chúc mừng bạn đã học hết toàn bộ{" "}
                    <strong className="text-[var(--color-primary-color)]">{filteredCards.length}</strong> từ vựng. Hãy bắt đầu một bài trắc
                    nghiệm để tự kiểm chứng khả năng ghi nhớ nhé!
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border-color)] hover:bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] rounded-xl text-xs font-bold transition active:scale-95 bg-[var(--color-surface-base)]"
                  >
                    <RotateCcw size={14} />
                    Học lại từ đầu
                  </button>

                  <button
                    onClick={() => {
                      handleShuffle();
                      setFinished(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-sm"
                  >
                    <Shuffle size={14} />
                    Trộn và học tiếp
                  </button>
                </div>
              </BaseCard>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 📝 QUIZ INTERACTIVE MODE                                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {!loading && mode === "quiz" && (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          {/* Quiz setup panel */}
          {!quizStarted && filteredCards.length >= 4 && (
            <div className="w-full space-y-6 animate-fadeIn">
              {/* Question direction selector card */}
              <BaseCard className="space-y-4">
                <h4 className="text-xs font-black text-[var(--color-text-secondary)]/60 uppercase tracking-wider">Chọn hướng dịch câu hỏi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setQuizDirection("jp-to-vn")}
                    className={`flex flex-col items-start gap-2 p-5 border-2 rounded-2xl text-left transition ${
                      quizDirection === "jp-to-vn"
                        ? "border-[var(--color-primary-color)] bg-[var(--color-accent-color)]/25"
                        : "border-[var(--color-border-color)] hover:bg-[var(--color-bg-base)]"
                    }`}
                  >
                    <span className="text-2xl font-black">🇯🇵 → 🇻🇳</span>
                    <span className="text-xs font-extrabold text-[var(--color-text-main)]">Tiếng Nhật sang Tiếng Việt</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]/75 font-semibold leading-relaxed">
                      Đề bài hiển thị chữ Kanji/Katakana. Tìm nghĩa dịch chính xác.
                    </span>
                  </button>

                  <button
                    onClick={() => setQuizDirection("vn-to-jp")}
                    className={`flex flex-col items-start gap-2 p-5 border-2 rounded-2xl text-left transition ${
                      quizDirection === "vn-to-jp"
                        ? "border-[var(--color-primary-color)] bg-[var(--color-accent-color)]/25"
                        : "border-[var(--color-border-color)] hover:bg-[var(--color-bg-base)]"
                    }`}
                  >
                    <span className="text-2xl font-black">🇻🇳 → 🇯🇵</span>
                    <span className="text-xs font-extrabold text-[var(--color-text-main)]">Tiếng Việt sang Tiếng Nhật</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]/75 font-semibold leading-relaxed">
                      Đề bài hiển thị ý nghĩa tiếng Việt. Chọn từ tiếng Nhật đúng nhất.
                    </span>
                  </button>
                </div>
              </BaseCard>

              {/* Number of questions card */}
              <BaseCard className="space-y-4">
                <h4 className="text-xs font-black text-[var(--color-text-secondary)]/60 uppercase tracking-wider">Số lượng câu hỏi trắc nghiệm</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "10 câu", value: 10 },
                    { label: "20 câu", value: 20 },
                    { label: `Tất cả (${filteredCards.length})`, value: -1 },
                  ].map((opt) => {
                    const disabledOption = opt.value > 0 && opt.value > filteredCards.length;
                    const activeOption = quizCount === opt.value;
                    return (
                      <button
                        key={opt.value}
                        disabled={disabledOption}
                        onClick={() => setQuizCount(opt.value)}
                        className={`px-4 py-2 border rounded-xl text-xs font-bold transition active:scale-95 ${
                          activeOption
                            ? "bg-[var(--color-primary-color)] border-[var(--color-primary-color)] text-white shadow-sm"
                            : disabledOption
                              ? "bg-[var(--color-bg-base)] border-[var(--color-border-color)] text-[var(--color-text-secondary)]/30 cursor-not-allowed"
                              : "bg-[var(--color-surface-base)] border-[var(--color-border-color)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </BaseCard>

              {/* Action play button */}
              <button
                onClick={generateQuiz}
                className="w-full py-4 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white text-xs font-black rounded-2xl active:scale-95 transition flex items-center justify-center gap-2 shadow-md shadow-red-900/10"
              >
                <Brain size={16} />
                Bắt đầu làm Trắc nghiệm
              </button>
            </div>
          )}

          {/* Insufficient vocabulary fallback alert */}
          {!quizStarted && filteredCards.length > 0 && filteredCards.length < 4 && (
            <BaseCard className="bg-amber-50 border border-amber-200 text-amber-800">
              <div className="flex gap-2 items-start">
                <HelpCircle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider m-0">Không đủ điều kiện để tạo Quiz</h4>
                  <p className="text-xs m-0 leading-relaxed font-semibold">
                    Đề trắc nghiệm yêu cầu tối thiểu <strong>4 từ vựng</strong> trong danh sách lọc để trộn đáp án.
                    Hiện chỉ có {filteredCards.length} từ. Vui lòng mở rộng bộ lọc tìm kiếm.
                  </p>
                </div>
              </div>
            </BaseCard>
          )}

          {/* Quiz Active Gameplay UI */}
          {quizStarted && !quizFinished && currentQuestion && (
            <div className="w-full space-y-6 animate-fadeIn">
              {/* Question progress stats bar */}
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-[var(--color-text-secondary)]">
                  Câu hỏi: {quizIndex + 1} / {quizQuestions.length}
                </span>

                <div className="flex gap-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    Đúng: {quizScore}
                  </span>
                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    Sai: {wrongAnswers.length}
                  </span>
                </div>
              </div>

              {/* Progress bar tracker */}
              <div className="w-full h-2 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary-color)] rounded-full transition-all duration-300"
                  style={{ width: `${quizProgress}%` }}
                ></div>
              </div>

              {/* Question Box Card */}
              <div
                className={`bg-gradient-to-br ${
                  LEVEL_COLORS[currentQuestion.card.level]?.bg || LEVEL_COLORS.N5.bg
                } rounded-3xl p-8 text-center text-white space-y-4 shadow-lg ${
                  LEVEL_COLORS[currentQuestion.card.level]?.shadow || LEVEL_COLORS.N5.shadow
                }`}
              >
                <div className="flex justify-center gap-2">
                  <span className="bg-white/20 text-white font-black text-[9px] px-2 py-0.5 rounded">
                    {currentQuestion.card.level}
                  </span>
                  {currentQuestion.card.topic && (
                    <span className="bg-white/10 text-white font-bold text-[9px] px-2 py-0.5 rounded">
                      {currentQuestion.card.topic}
                    </span>
                  )}
                </div>

                {quizDirection === "jp-to-vn" ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl sm:text-5xl font-black tracking-wide m-0 drop-shadow-sm select-all">
                      {currentQuestion.card.word}
                    </h2>
                    <p className="text-sm text-white/95 font-semibold m-0">{currentQuestion.card.reading}</p>
                  </div>
                ) : (
                  <h3 className="text-xl sm:text-2xl font-black leading-relaxed m-0 select-all">
                    {currentQuestion.card.meaning}
                  </h3>
                )}

                <p className="text-[10px] text-white/60 font-black tracking-wider uppercase m-0 pt-2">
                  {quizDirection === "jp-to-vn" ? "Chọn ý nghĩa chính xác:" : "Chọn từ vựng chính xác:"}
                </p>
              </div>

              {/* Answer options cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const labelIcon =
                    isAnswered && index === currentQuestion.correctIndex ? (
                      <span className="text-[10px] font-black">✓</span>
                    ) : isAnswered && index === selectedAnswer ? (
                      <span className="text-[10px] font-black">✗</span>
                    ) : (
                      <span>{OPTION_LABELS[index]}</span>
                    );

                  return (
                    <button
                      key={index}
                      disabled={isAnswered}
                      onClick={() => handleSelectAnswer(index)}
                      className={`flex items-center gap-3 border px-4 py-3.5 rounded-2xl text-left text-xs font-bold transition active:scale-[0.99] select-none ${getOptionClasses(
                        index
                      )}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black transition ${
                          isAnswered
                            ? index === currentQuestion.correctIndex
                              ? "bg-emerald-600 text-white"
                              : index === selectedAnswer
                                ? "bg-red-650 text-white"
                                : "bg-slate-200 text-slate-400"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {labelIcon}
                      </span>
                      <span className="leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Correct / Incorrect alert display box */}
              {isAnswered && (
                <div className="space-y-4 animate-scaleUp">
                  <div
                    className={`border rounded-2xl p-4 text-xs font-semibold leading-relaxed ${
                      selectedAnswer === currentQuestion.correctIndex
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {selectedAnswer === currentQuestion.correctIndex ? (
                      <span>Chúc mừng! Câu trả lời của bạn hoàn toàn chính xác.</span>
                    ) : (
                      <div>
                        <p className="font-extrabold m-0 text-red-800">Sai mất rồi!</p>
                        <p className="m-0 mt-1">
                          Đáp án đúng là:{" "}
                          <strong className="text-emerald-700 font-extrabold">
                            {currentQuestion.options[currentQuestion.correctIndex]}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white text-xs font-black rounded-xl active:scale-95 transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{quizIndex >= quizQuestions.length - 1 ? "Xem kết quả trắc nghiệm" : "Câu tiếp theo"}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quiz score summary results */}
          {quizFinished && !showWrongReview && (
            <div className="w-full max-w-md animate-scaleUp">
              <BaseCard className="text-center p-8 space-y-6">
                {/* Circular Score Gauge */}
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" strokeWidth="8" stroke="#F1F5F9" fill="transparent" />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      strokeWidth="8"
                      stroke={
                        quizScorePercent >= 80 ? "#10B981" : quizScorePercent >= 60 ? "#F59E0B" : "#EF4444"
                      }
                      fill="transparent"
                      strokeDasharray={301.6}
                      strokeDashoffset={301.6 - (301.6 * quizScorePercent) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-800">{quizScorePercent}%</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[var(--color-text-main)] m-0">
                    Đạt {quizScore} / {quizQuestions.length} câu đúng
                  </h3>
                  <p className={`text-xs font-bold ${getScoreMessage(quizScorePercent).color} m-0`}>
                    {getScoreMessage(quizScorePercent).msg}
                  </p>
                </div>

                {/* Score breakdown stats grid */}
                <div className="grid grid-cols-3 gap-2 border-y border-[var(--color-border-color)] py-4">
                  <div className="text-center">
                    <span className="text-[10px] text-[var(--color-text-secondary)]/60 font-extrabold uppercase block mb-0.5">Đúng</span>
                    <span className="text-base font-black text-emerald-600">{quizScore}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-[var(--color-text-secondary)]/60 font-extrabold uppercase block mb-0.5">Sai</span>
                    <span className="text-base font-black text-red-500">{wrongAnswers.length}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-[var(--color-text-secondary)]/60 font-extrabold uppercase block mb-0.5">Tổng số</span>
                    <span className="text-base font-black text-[var(--color-text-main)]">{quizQuestions.length}</span>
                  </div>
                </div>

                {/* Actions buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {wrongAnswers.length > 0 && (
                    <button
                      onClick={() => setShowWrongReview(true)}
                      className="flex-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-650 text-xs font-extrabold rounded-xl transition active:scale-95 bg-[var(--color-surface-base)]"
                    >
                      Xem {wrongAnswers.length} câu sai
                    </button>
                  )}

                  <button
                    onClick={generateQuiz}
                    className="flex-1 py-2.5 border border-[var(--color-primary-color)] text-[var(--color-primary-color)] hover:bg-[var(--color-accent-color)] text-xs font-extrabold rounded-xl transition active:scale-95 bg-[var(--color-surface-base)]"
                  >
                    Làm lại
                  </button>

                  <button
                    onClick={resetQuiz}
                    className="flex-1 py-2.5 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white text-xs font-black rounded-xl transition active:scale-95 shadow-sm"
                  >
                    Thi quiz mới
                  </button>
                </div>
              </BaseCard>
            </div>
          )}

          {/* Quiz Wrong Questions Review Sheet */}
          {quizFinished && showWrongReview && (
            <div className="w-full space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--color-border-color)] pb-3">
                <h3 className="text-sm font-black text-red-600 m-0">
                  ❌ Danh sách câu trả lời sai ({wrongAnswers.length})
                </h3>
                <button
                  onClick={() => setShowWrongReview(false)}
                  className="px-3 py-1.5 border border-[var(--color-border-color)] hover:bg-[var(--color-bg-base)] rounded-xl text-xs font-bold text-[var(--color-text-secondary)] transition active:scale-95 bg-[var(--color-surface-base)]"
                >
                  ← Về bảng điểm
                </button>
              </div>

              <div className="space-y-4">
                {wrongAnswers.map(({ question, selectedIndex }, i) => {
                  const cardColor = LEVEL_COLORS[question.card.level] || LEVEL_COLORS.N5;

                  return (
                    <BaseCard key={i} className="overflow-hidden border border-red-150 !p-0">
                      {/* Banner header of card level & question */}
                      <div className={`bg-gradient-to-r ${cardColor.bg} px-5 py-3.5 text-white flex items-center gap-2`}>
                        <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded">
                          {question.card.level}
                        </span>
                        <span className="text-xs font-extrabold">
                          {quizDirection === "jp-to-vn"
                            ? `${question.card.word} (${question.card.reading})`
                            : question.card.meaning}
                        </span>
                      </div>

                      {/* Incorrect choice details */}
                      <div className="p-5 space-y-3.5">
                        <div className="flex items-start gap-2.5 text-xs">
                          <XCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <span className="text-[10px] text-slate-405 font-bold uppercase block">Bạn đã chọn:</span>
                            <span className="font-extrabold text-red-755">{question.options[selectedIndex]}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <span className="text-[10px] text-slate-405 font-bold uppercase block">Đáp án chính xác là:</span>
                            <span className="font-extrabold text-emerald-705">
                              {question.options[question.correctIndex]}
                            </span>
                          </div>
                        </div>

                        {question.card.example && (
                          <div className="border-t border-slate-100 pt-3 mt-3 text-xs leading-relaxed text-slate-500">
                            <p className="font-bold italic m-0 select-all">{question.card.example}</p>
                            {question.card.exampleMeaning && (
                              <p className="font-semibold text-slate-400 m-0 mt-1">
                                → {question.card.exampleMeaning}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </BaseCard>
                  );
                })}
              </div>

              {/* Action buttons footer */}
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={generateQuiz}
                  className="px-4 py-2 border border-[var(--color-border-color)] text-[var(--color-text-secondary)] rounded-xl text-xs font-bold transition active:scale-95 bg-[var(--color-surface-base)] shadow-sm hover:bg-[var(--color-bg-base)]"
                >
                  Làm lại quiz này
                </button>
                <button
                  onClick={resetQuiz}
                  className="px-4 py-2 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
                >
                  Thi quiz mới
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default VocabularyPracticePage;
