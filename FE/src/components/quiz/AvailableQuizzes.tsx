import React, { useState } from "react";
import { Play, Timer, HelpCircle, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { QuizWithAttempt } from "../../types/quiz.types";
import { BaseCard } from "../../components/ui/BaseCard";
import { EmptyState } from "../../components/ui/EmptyState";

interface AvailableQuizzesProps {
  quizzes: QuizWithAttempt[];
}

const AvailableQuizzes: React.FC<AvailableQuizzesProps> = ({ quizzes = [] }) => {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const isQuizExpired = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() <= Date.now();
  };

  const formatDueDate = (dueDate?: string): string => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemainingText = (dueDate?: string): string => {
    if (!dueDate) return "";
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) return "Đã hết hạn";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `Còn ${diffHours} giờ`;

    const diffDays = Math.floor(diffHours / 24);
    return `Còn ${diffDays} ngày`;
  };

  const getDueDateStyle = (dueDate?: string): string => {
    if (!dueDate) return "bg-slate-50 text-slate-600 border-slate-100";
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return "bg-red-50 text-red-700 border-red-100";
    if (diffHours < 24) return "bg-amber-50 text-amber-700 border-amber-100";
    if (diffHours < 72) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  const courseName = quizzes.length > 0 && quizzes[0].courseName ? quizzes[0].courseName : "Khóa học của tôi";

  const filteredQuizzes = quizzes.filter((quiz) => {
    return showCompleted || !quiz.hasAttempted;
  });

  const handleStartQuiz = (quizId: string, hasAttempted: boolean, dueDate?: string) => {
    if (isQuizExpired(dueDate)) {
      alert("Bài kiểm tra này đã hết hạn và không thể làm nữa.");
      return;
    }

    if (hasAttempted) {
      alert("Bạn đã hoàn thành bài kiểm tra này rồi!");
      return;
    }
    navigate(`/dashboard/student/quiz/${quizId}`);
  };

  if (quizzes.length === 0) {
    return (
      <BaseCard>
        <EmptyState
          title="Hiện chưa có bài kiểm tra nào"
          description="Bạn chưa tham gia khóa học nào hoặc chưa có bài kiểm tra nào được tạo từ phía giáo viên."
          icon={AlertTriangle}
        />
      </BaseCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header filter row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-base font-extrabold text-[var(--color-text-main)] m-0">{courseName}</h3>
          <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">
            Tổng số: {quizzes.length} • Chưa làm:{" "}
            {quizzes.filter((q) => !q.hasAttempted && !isQuizExpired(q.dueDate)).length} • Đã hoàn thành:{" "}
            {quizzes.filter((q) => q.hasAttempted).length}
          </p>
        </div>

        <select
          value={showCompleted ? "yes" : "no"}
          onChange={(e) => setShowCompleted(e.target.value === "yes")}
          className="border border-[var(--color-border-color)] rounded-xl px-4 py-2 bg-[var(--color-surface-base)] text-xs font-bold text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary-color)] max-w-[200px]"
        >
          <option value="no">Chỉ bài chưa làm</option>
          <option value="yes">Hiển thị tất cả</option>
        </select>
      </div>

      {/* Quiz Cards */}
      {filteredQuizzes.length === 0 ? (
        <BaseCard>
          <EmptyState
            title="Không tìm thấy bài kiểm tra nào"
            description={
              showCompleted
                ? "Thử thay đổi bộ lọc để hiển thị bài kiểm tra."
                : "Bạn đã hoàn thành toàn bộ bài kiểm tra hoặc chưa có bài kiểm tra mới."
            }
            icon={HelpCircle}
          />
        </BaseCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => {
            const isExpired = isQuizExpired(quiz.dueDate);
            const timeRemaining = getTimeRemainingText(quiz.dueDate);
            const dueStyle = getDueDateStyle(quiz.dueDate);

            return (
              <BaseCard
                key={quiz._id}
                className={`flex flex-col justify-between transition border-2 ${
                  quiz.hasAttempted
                    ? "border-emerald-250 opacity-90"
                    : isExpired
                      ? "border-red-200 opacity-90"
                      : "border-[var(--color-border-color)] hover:-translate-y-1 hover:shadow-md"
                }`}
              >
                <div className="space-y-4">
                  {/* Status chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {quiz.hasAttempted && (
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          quiz.attemptPassed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        <CheckCircle size={10} />
                        Đã hoàn thành - {quiz.attemptPercentage}%
                      </span>
                    )}
                    {isExpired && !quiz.hasAttempted && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        ĐÃ HẾT HẠN
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4
                      className={`text-sm font-extrabold m-0 leading-snug ${
                        quiz.hasAttempted || isExpired ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-main)]"
                      }`}
                    >
                      {quiz.title}
                    </h4>
                    {quiz.description && (
                      <p className="text-xs text-[var(--color-text-secondary)]/75 m-0 mt-1 line-clamp-2 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Specs & Info */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] border border-[var(--color-border-color)] px-2.5 py-1 rounded-lg">
                      <HelpCircle size={12} className="text-[var(--color-text-secondary)]/50" />
                      {quiz.totalQuestions} câu hỏi
                    </span>

                    {quiz.durationMinutes && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] border border-[var(--color-border-color)] px-2.5 py-1 rounded-lg">
                        <Timer size={12} className="text-[var(--color-text-secondary)]/50" />
                        {quiz.durationMinutes} phút
                      </span>
                    )}

                    {quiz.dueDate && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 border rounded-lg ${dueStyle}`}
                      >
                        <Calendar size={12} />
                        {timeRemaining}
                      </span>
                    )}
                  </div>

                  {quiz.dueDate && !isExpired && (
                    <span className="block text-[10px] text-[var(--color-text-secondary)]/60 font-medium mt-2">
                      📅 Hạn nộp: {formatDueDate(quiz.dueDate)}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  {quiz.hasAttempted ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl border border-[var(--color-border-color)] bg-[var(--color-bg-base)] text-[var(--color-text-secondary)]/40 text-xs font-extrabold cursor-not-allowed"
                    >
                      Đã hoàn thành
                    </button>
                  ) : isExpired ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl border border-red-100 bg-red-50/50 text-red-400 text-xs font-extrabold cursor-not-allowed"
                    >
                      Bài thi đã hết hạn
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartQuiz(quiz._id, quiz.hasAttempted, quiz.dueDate)}
                      className="w-full py-2 rounded-xl bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] text-white text-xs font-extrabold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Play size={12} fill="white" />
                      Bắt đầu làm bài
                    </button>
                  )}
                </div>
              </BaseCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableQuizzes;
