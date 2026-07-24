import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import AvailableQuizzes from "../../components/quiz/AvailableQuizzes";
import QuizHistory from "../../components/quiz/QuizHistory";
import type { QuizWithAttempt, UserWithId } from "../../types/quiz.types";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { AlertCircle } from "lucide-react";

function isQuizWithAttempt(quiz: unknown): quiz is QuizWithAttempt {
  return typeof quiz === "object" && quiz !== null && "hasAttempted" in quiz;
}

const StudentQuizzesPage: React.FC = () => {
  const location = useLocation();
  const defaultTab = (location.state as { defaultTab?: number })?.defaultTab ?? 0;
  const [tabValue, setTabValue] = useState(defaultTab);
  const user = useAppSelector((state) => state.auth.user);

  const { quizzes, attempts, loading, error, loadStudentQuizzes, loadStudentHistory, resetError } = useQuiz();

  const studentQuizzes = quizzes.filter(isQuizWithAttempt);

  useEffect(() => {
    void loadStudentQuizzes();
    const userId = user?._id || (user as UserWithId)?.id;
    if (userId) {
      void loadStudentHistory({ studentId: userId });
    }
  }, [loadStudentQuizzes, loadStudentHistory, user]);

  return (
    <PageLayout>
      {/* Error Alert */}
      {error && (
        <BaseCard className="bg-red-50 border-l-4 border-red-500 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={resetError} className="text-xs text-red-500 hover:text-red-700 font-bold">
            Đóng
          </button>
        </BaseCard>
      )}

      {/* Control Header Card */}
      <BaseCard className="!p-3.5 bg-slate-50/60 border-slate-150/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setTabValue(0)}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-extrabold transition flex items-center justify-center gap-2 rounded-lg ${
                tabValue === 0
                  ? "bg-[var(--color-primary-color)] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Bài kiểm tra hiện có
            </button>
            <button
              onClick={() => setTabValue(1)}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-extrabold transition flex items-center justify-center gap-2 rounded-lg ${
                tabValue === 1
                  ? "bg-[var(--color-primary-color)] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Kết quả của tôi
            </button>
          </div>

          {/* Quick Course Info Pill */}
          {tabValue === 0 && studentQuizzes.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              <span className="text-slate-800 font-extrabold">{studentQuizzes[0].courseName || "Khóa học của tôi"}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-slate-500">{studentQuizzes.length} bài test</span>
            </div>
          )}
        </div>
      </BaseCard>

      {/* Loading Indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="w-8 h-8 border-4 border-[var(--color-primary-color)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-text-secondary font-medium">Đang tải dữ liệu bài kiểm tra...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {tabValue === 0 ? (
            <AvailableQuizzes quizzes={studentQuizzes} />
          ) : (
            <QuizHistory attempts={attempts} />
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default StudentQuizzesPage;
