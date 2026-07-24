import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Timer,
  Send,
  ArrowLeft,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Lock,
  Info,
} from "lucide-react";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import { useAntiCheat } from "../../hooks/useAntiCheat";
import AntiCheatWarning from "../../components/quiz/AntiCheatWarning";
import type { UserWithId } from "../../types/quiz.types";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";

const TakeQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { currentQuiz, loading, error, beginQuiz, submitQuizAnswers } = useQuiz();

  // Anti-Cheat Hook config
  const {
    logs,
    violationCount,
    isFullscreen,
    isLocked,
    showWarning,
    currentWarningType,
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    exitFullscreen,
    getSummary,
    maxViolations,
  } = useAntiCheat({
    maxViolations: 5,
    enableFullscreen: true,
    enableDevToolsDetection: true,
    enableCopyPasteBlock: true,
    enableContextMenuBlock: true,
    enableTabSwitchDetection: true,
    warningDuration: 5000,
  });

  // Quiz State
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showAutoSubmitDialog, setShowAutoSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const hasStartedMonitoring = useRef(false);
  const autoSubmitTriggered = useRef(false);

  const handleAnswerChange = useCallback(
    (questionIndex: number, answerValue: number) => {
      if (isLocked) return;
      setAnswers((prev) => ({
        ...prev,
        [questionIndex]: answerValue,
      }));
    },
    [isLocked]
  );

  useEffect(() => {
    if (quizId && !hasStartedMonitoring.current) {
      const userId = user?._id || (user as UserWithId)?.id;

      void beginQuiz(quizId, userId).then(() => {
        console.log("✅ Quiz loaded, starting anti-cheat monitoring...");
        startMonitoring();
        hasStartedMonitoring.current = true;
      });
    }

    return () => {
      if (hasStartedMonitoring.current) {
        stopMonitoring();
        hasStartedMonitoring.current = false;
      }
    };
  }, [quizId, beginQuiz, user, startMonitoring, stopMonitoring]);

  useEffect(() => {
    if (currentQuiz?.durationMinutes) {
      setTimeLeft(currentQuiz.durationMinutes * 60);
    }
  }, [currentQuiz]);

  const handleSubmitQuiz = useCallback(
    async (isAuto = false, reason?: string) => {
      if (!currentQuiz || !quizId || isSubmitting) return;

      setIsSubmitting(true);
      stopMonitoring();

      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      const answerArray = currentQuiz.questions.map((_, index) => answers[index] || 0);
      const userId = user?._id || (user as UserWithId)?.id;

      try {
        const result = await submitQuizAnswers(quizId, {
          answers: answerArray,
          timeSpent: timeSpentMinutes,
          studentId: userId,
          antiCheatLogs: logs,
        });

        // Navigate to result page if we have attemptId, otherwise fall back to quizzes list
        const attemptId = (result.payload as { attemptId?: string })?.attemptId;
        if (attemptId) {
          navigate(`/dashboard/student/quiz/result/${attemptId}`, {
            state: {
              isAutoSubmit: isAuto,
              autoSubmitReason: reason,
            },
          });
        } else {
          navigate("/dashboard/student/quizzes", {
            state: {
              defaultTab: 1,
              message: isAuto
                ? `Bài kiểm tra tự động nộp do: ${reason === "time_expired" ? "Hết giờ làm bài" : "Vi phạm quy chế thi nhiều lần"}`
                : "Nộp bài kiểm tra thành công!",
              isAutoSubmit: isAuto,
            },
          });
        }
      } catch (err) {
        console.error("Failed to submit quiz:", err);
        setIsSubmitting(false);
        startMonitoring(); // Resume monitoring if failed
      }
    },
    [
      currentQuiz,
      quizId,
      answers,
      startTime,
      user,
      logs,
      submitQuizAnswers,
      navigate,
      stopMonitoring,
      isSubmitting,
      startMonitoring,
    ]
  );

  const handleAutoSubmit = useCallback(
    async (reason: "time_expired" | "max_violations") => {
      if (isSubmitting) return;
      await handleSubmitQuiz(true, reason);
    },
    [isSubmitting, handleSubmitQuiz]
  );

  // 1. Timer countdown effect
  useEffect(() => {
    if (timeLeft > 0 && !isLocked && !isSubmitting) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            void handleAutoSubmit("time_expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isLocked, isSubmitting, handleAutoSubmit]);

  // 2. Auto-submit when max violations reached or locked
  useEffect(() => {
    const isViolated = isLocked || violationCount >= maxViolations;
    if (isViolated && !autoSubmitTriggered.current && !isSubmitting) {
      autoSubmitTriggered.current = true;
      setShowAutoSubmitDialog(true);

      const timer = setTimeout(() => {
        void handleAutoSubmit("max_violations");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isLocked, violationCount, maxViolations, isSubmitting, handleAutoSubmit]);

  // 3. Tab reload/close protection (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting && hasStartedMonitoring.current) {
        e.preventDefault();
        e.returnValue = "Bạn đang làm bài kiểm tra. Nếu thoát, kết quả bài làm sẽ bị mất!";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  // 4. Browser back/forward button interception (popstate)
  useEffect(() => {
    if (isSubmitting) return;

    window.history.pushState({ quizActive: true }, "", window.location.href);

    const handlePopState = () => {
      if (isSubmitting) return;

      const confirmLeave = window.confirm(
        "⚠️ BẠN ĐANG LÀM BÀI KIỂM TRA!\n\nNếu bạn rời khỏi đây, bài thi của bạn sẽ được tự động nộp ngay lập tức với các câu đã chọn.\n\nBạn có chắc chắn muốn nộp bài và rời đi không?"
      );

      if (confirmLeave) {
        void handleAutoSubmit("max_violations");
      } else {
        window.history.pushState({ quizActive: true }, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isSubmitting, handleAutoSubmit]);

  // 5. Sidebar and Header navigation click capture
  useEffect(() => {
    const handleNavigationClick = (e: MouseEvent) => {
      if (isSubmitting) return;

      const target = e.target as HTMLElement;
      // Capture clicks on sidebar or header navigation elements
      const navElement = target.closest("aside, header, .ant-layout-header");

      if (navElement) {
        e.preventDefault();
        e.stopPropagation();

        const confirmLeave = window.confirm(
          "⚠️ BẠN ĐANG LÀM BÀI KIỂM TRA!\n\nNếu bạn chuyển sang trang khác, bài thi của bạn sẽ được tự động nộp ngay lập tức với các câu đã trả lời.\n\nBạn có chắc chắn muốn nộp bài và thoát không?"
        );

        if (confirmLeave) {
          void handleAutoSubmit("max_violations");
        }
      }
    };

    document.addEventListener("click", handleNavigationClick, true); // Use capture phase
    return () => document.removeEventListener("click", handleNavigationClick, true);
  }, [isSubmitting, handleAutoSubmit]);

  const handleSubmitClick = useCallback(() => {
    if (isLocked) return;

    const unanswered = currentQuiz?.questions.filter((_, index) => !answers[index]).length || 0;

    if (unanswered > 0) {
      setShowSubmitDialog(true);
    } else {
      void handleSubmitQuiz();
    }
  }, [currentQuiz, answers, isLocked, handleSubmitQuiz]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgress = () => {
    if (!currentQuiz) return 0;
    const answered = Object.keys(answers).length;
    return (answered / currentQuiz.questions.length) * 100;
  };

  const getTimeColor = () => {
    if (timeLeft < 60) return "text-red-600 bg-red-50 border-red-200 animate-pulse";
    if (timeLeft < 300) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-text-secondary bg-bg-base border-border-color";
  };

  const summary = getSummary();
  const hasViolations = summary.totalViolations > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-primary-color border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-text-secondary font-medium">Đang chuẩn bị đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <PageLayout title="Bài kiểm tra" subtitle="Trình làm bài thi trực tuyến">
        <BaseCard className="bg-red-50 border border-red-150 p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-red-800 font-bold text-sm">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => navigate("/dashboard/student/quizzes")}
            className="flex items-center gap-2 text-text-secondary hover:text-primary-color text-xs font-bold transition"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách bài kiểm tra
          </button>
        </BaseCard>
      </PageLayout>
    );
  }

  if (!currentQuiz) {
    return (
      <PageLayout title="Bài kiểm tra" subtitle="Trình làm bài thi trực tuyến">
        <BaseCard>
          <div className="text-center py-12 text-text-secondary/80 text-sm font-semibold">
            Không tìm thấy thông tin đề thi.
          </div>
        </BaseCard>
      </PageLayout>
    );
  }

  const isQuizExpired = currentQuiz.dueDate ? new Date(currentQuiz.dueDate).getTime() <= Date.now() : false;

  if (isQuizExpired) {
    return (
      <PageLayout title="Bài kiểm tra" subtitle="Trình làm bài thi trực tuyến">
        <BaseCard className="bg-red-50 border border-red-200 p-6 text-center space-y-4">
          <div className="flex flex-col items-center gap-2 text-red-800 font-bold text-sm">
            <AlertTriangle size={32} className="text-red-600" />
            <h3 className="text-base font-extrabold m-0">Bài kiểm tra đã hết hạn nộp</h3>
            <p className="text-xs text-red-600 font-semibold max-w-md m-0">
              Thời hạn làm bài thi này đã kết thúc. Bạn không thể thực hiện hoặc nộp bài kiểm tra này nữa.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate("/dashboard/student/quizzes")}
              className="inline-flex items-center gap-2 text-primary-color hover:underline text-xs font-extrabold transition"
            >
              <ArrowLeft size={16} />
              Quay lại danh sách bài kiểm tra
            </button>
          </div>
        </BaseCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Bài kiểm tra" subtitle="Trình làm bài thi trực tuyến - Đọc kỹ hướng dẫn và câu hỏi">
      {/* 1. Anti-Cheat Security alert banner */}
      <BaseCard className="bg-accent-color/50 border-l-4 border-primary-color !p-4">
        <div className="flex items-start gap-3">
          <Info className="text-primary-color shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-blue-900 m-0 leading-relaxed font-semibold">
            🔒 <strong>Hệ thống giám sát thi cử (Anti-Cheat) đang chạy.</strong> Mọi hoạt động của bạn (như chuyển tab,
            thoát toàn màn hình, sao chép/dán, mở Developer Tools) đều được ghi nhận trực tiếp và báo cáo lại cho giáo viên.
            Hãy làm bài thi một cách trung thực.
          </p>
        </div>
      </BaseCard>

      {/* 2. Lock notification */}
      {isLocked && (
        <BaseCard className="bg-red-50 border-2 border-red-500 !p-4 animate-pulse">
          <div className="flex items-start gap-3 text-red-800">
            <Lock className="shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-black m-0">BÀI THI ĐÃ BỊ KHÓA - Phát hiện quá nhiều lần vi phạm quy chế</h3>
              <p className="text-xs m-0 mt-1 leading-relaxed">
                Bạn đã vượt quá giới hạn vi phạm cho phép. Hệ thống sẽ tự động nộp bài thi của bạn ngay lập tức.
              </p>
            </div>
          </div>
        </BaseCard>
      )}

      {/* 3. Header Details & Controls */}
      <BaseCard className={`border ${isLocked ? "bg-red-50/20 border-red-200" : "bg-surface-base border-border-color"}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className={`text-xl font-extrabold m-0 ${isLocked ? "text-red-700" : "text-text-main"}`}>
              {currentQuiz.title}
            </h2>
            {currentQuiz.description && (
              <p className="text-xs text-text-secondary m-0 leading-relaxed">{currentQuiz.description}</p>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Violations */}
            {hasViolations && (
              <span className="bg-red-100 text-red-700 font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <AlertTriangle size={14} />
                {violationCount} / {maxViolations} Vi phạm
              </span>
            )}

            {/* Fullscreen control */}
            <button
              onClick={isFullscreen ? exitFullscreen : requestFullscreen}
              disabled={isLocked}
              title={isFullscreen ? "Thoát toàn màn hình" : "Chế độ toàn màn hình"}
              className={`p-2 rounded-xl text-white transition active:scale-95 disabled:bg-slate-350 disabled:cursor-not-allowed ${
                isFullscreen ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary-color hover:bg-primary-color-hover"
              }`}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Timer */}
            {currentQuiz.durationMinutes && (
              <div className={`flex items-center gap-1.5 font-black text-sm px-4 py-2 border rounded-xl ${getTimeColor()}`}>
                <Timer size={16} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator bar */}
        <div className="mt-6 pt-4 border-t border-border-color space-y-1.5">
          <div className="flex justify-between text-xs text-text-secondary font-bold">
            <span>Tiến độ làm bài</span>
            <span>
              {Object.keys(answers).length} / {currentQuiz.questions.length} câu đã chọn
            </span>
          </div>
          <div className="w-full h-2.5 bg-bg-base rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isLocked ? "bg-red-500" : "bg-primary-color"}`}
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>
      </BaseCard>

      {/* 4. Questions Grid */}
      <div className={`space-y-6 transition ${isLocked ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {currentQuiz.questions.map((question, index) => {
          const isAnswered = !!answers[index];
          return (
            <BaseCard key={question.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg text-white ${
                    isAnswered ? "bg-emerald-500" : "bg-primary-color"
                  }`}
                >
                  Q{question.order}
                </span>
                <h3 className="text-sm font-extrabold text-text-main m-0 leading-relaxed">
                  {question.question}
                </h3>
              </div>

              {/* Options list */}
              <div className="grid grid-cols-1 gap-2.5">
                {question.options.map((option, optIndex) => {
                  const isOptionSelected = answers[index] === optIndex + 1;
                  return (
                    <label
                      key={optIndex}
                      className={`flex items-center gap-3 border px-4 py-3 rounded-2xl cursor-pointer transition select-none active:scale-[0.99] ${
                        isOptionSelected
                          ? "border-primary-color bg-accent-color/10 font-bold text-primary-color"
                          : "border-border-color hover:bg-bg-base/50 text-text-secondary"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${index}`}
                        value={optIndex + 1}
                        checked={isOptionSelected}
                        onChange={() => handleAnswerChange(index, optIndex + 1)}
                        disabled={isLocked}
                        className="w-4 h-4 text-primary-color border-border-color focus:ring-primary-color shrink-0"
                      />
                      <span className="text-[10px] font-black bg-bg-base border border-border-color px-2 py-0.5 rounded text-text-secondary shrink-0">
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span className="text-xs">{option}</span>
                    </label>
                  );
                })}
              </div>
            </BaseCard>
          );
        })}
      </div>

      {/* 5. Footer Buttons */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => navigate("/dashboard/student/quizzes")}
          disabled={isSubmitting}
          className="px-5 py-2.5 border border-border-color hover:border-border-color/80 rounded-xl text-text-secondary hover:text-text-main text-xs font-bold transition active:scale-95 disabled:opacity-50"
        >
          Hủy bỏ
        </button>

        <button
          onClick={handleSubmitClick}
          disabled={isLocked || isSubmitting}
          className="px-6 py-2.5 bg-primary-color hover:bg-primary-color-hover disabled:bg-slate-350 text-white text-xs font-black rounded-xl active:scale-95 transition flex items-center gap-1.5 shadow-sm disabled:shadow-none disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Đang nộp bài...</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Nộp bài thi</span>
            </>
          )}
        </button>
      </div>

      {/* --- CONFIRMATION DIALOG MODAL (Tailwind replacement) --- */}
      {showSubmitDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-base rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border-color space-y-4 animate-scaleUp">
            <h3 className="text-base font-extrabold text-text-main m-0">Xác nhận nộp bài kiểm tra</h3>

            <div className="space-y-3">
              <p className="text-xs text-text-secondary m-0">
                Bạn đang còn{" "}
                <strong className="text-primary-color">
                  {currentQuiz.questions.filter((_, index) => !answers[index]).length} câu chưa trả lời
                </strong>
                . Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?
              </p>

              {hasViolations && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle size={14} />
                    <span>Hệ thống ghi nhận {summary.totalViolations} vi phạm:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-1 font-semibold">
                    <li>Chuyển tab: {summary.tabSwitches}</li>
                    <li>Rời khỏi trang thi: {summary.windowBlurs}</li>
                    <li>Sao chép văn bản: {summary.copyEvents}</li>
                    <li>Dán văn bản: {summary.pasteEvents}</li>
                    <li>Thoát chế độ toàn màn hình: {summary.fullscreenExits}</li>
                    <li>Cố gắng mở DevTools: {summary.devToolsAttempts}</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="px-4 py-2 border border-border-color hover:bg-bg-base text-text-secondary rounded-xl text-xs font-bold transition active:scale-95"
              >
                Xem lại câu hỏi
              </button>
              <button
                onClick={() => {
                  setShowSubmitDialog(false);
                  void handleSubmitQuiz();
                }}
                className="px-4 py-2 bg-primary-color hover:bg-primary-color-hover text-white rounded-xl text-xs font-extrabold transition active:scale-95"
              >
                Vẫn nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Submit Warning Dialog */}
      <AntiCheatWarning
        open={showAutoSubmitDialog}
        violationType="max_violations"
        violationCount={violationCount}
        maxViolations={maxViolations}
        onContinue={() => {}}
        isAutoSubmit={true}
      />

      {/* Regular Warning Dialog */}
      <AntiCheatWarning
        open={showWarning && !showAutoSubmitDialog}
        violationType={currentWarningType}
        violationCount={violationCount}
        maxViolations={maxViolations}
        onContinue={() => {}}
      />
    </PageLayout>
  );
};

export default TakeQuizPage;
