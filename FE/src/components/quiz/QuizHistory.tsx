import React from "react";
import { CheckCircle, AlertTriangle, Eye, Calendar, Award, Timer, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { QuizAttempt } from "../../types/quiz.types";
import { BaseCard } from "../../components/ui/BaseCard";
import { EmptyState } from "../../components/ui/EmptyState";

interface QuizHistoryProps {
  attempts: QuizAttempt[];
}

const QuizHistory: React.FC<QuizHistoryProps> = ({ attempts }) => {
  const navigate = useNavigate();

  const handleViewResult = (attemptId: string) => {
    navigate(`/dashboard/student/quiz/result/${attemptId}`);
  };

  if (attempts.length === 0) {
    return (
      <BaseCard>
        <EmptyState
          title="Chưa có lượt làm bài nào"
          description="Hãy bắt đầu làm bài kiểm tra để xem kết quả chi tiết tại đây."
          icon={Award}
        />
      </BaseCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Card-based List (shown on small screens) */}
      <div className="block md:hidden space-y-4">
        {attempts.map((attempt) => {
          const quizTitle =
            typeof attempt.quizId === "string"
              ? "Bài kiểm tra không xác định"
              : attempt.quizId.title || "Bài kiểm tra không xác định";

          return (
            <BaseCard
              key={attempt._id}
              className={`border-2 ${attempt.passed ? "border-emerald-250" : "border-red-200"}`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-[var(--color-text-main)] line-clamp-1">{quizTitle}</h4>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] mt-1 font-semibold">
                      <Calendar size={12} />
                      {new Date(attempt.completedAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      attempt.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {attempt.passed ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                    {attempt.passed ? "Đạt" : "Không đạt"}
                  </span>
                </div>

                {/* Stats block */}
                <div className="grid grid-cols-3 gap-2 bg-[var(--color-bg-base)] border border-[var(--color-border-color)] rounded-xl p-3 text-center">
                  <div>
                    <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-[var(--color-text-secondary)]/50 uppercase">
                      <Award size={10} />
                      Điểm
                    </span>
                    <span className="text-sm font-black text-[var(--color-text-main)] mt-0.5 block">{attempt.percentage}/100</span>
                  </div>
                  <div>
                    <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-[var(--color-text-secondary)]/50 uppercase">
                      <HelpCircle size={10} />
                      Tỷ lệ
                    </span>
                    <span
                      className={`text-sm font-black mt-0.5 block ${
                        attempt.passed ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {attempt.percentage}%
                    </span>
                  </div>
                  <div>
                    <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-[var(--color-text-secondary)]/50 uppercase">
                      <Timer size={10} />
                      Thời gian
                    </span>
                    <span className="text-sm font-black text-[var(--color-text-main)] mt-0.5 block">{attempt.timeSpent}p</span>
                  </div>
                </div>

                <button
                  onClick={() => handleViewResult(attempt._id)}
                  className="w-full py-2 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] active:scale-95 transition text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1"
                >
                  <Eye size={12} />
                  Xem chi tiết
                </button>
              </div>
            </BaseCard>
          );
        })}
      </div>

      {/* Desktop Table-based List (shown on md and larger screens) */}
      <div className="hidden md:block bg-[var(--color-surface-base)] border border-[var(--color-border-color)] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-base)] border-b border-[var(--color-border-color)]">
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide">Tên bài kiểm tra</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide text-center">Điểm số</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide text-center">Tỷ lệ chính xác</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide text-center">Trạng thái</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide text-center">Thời gian</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide">Nộp lúc</th>
              <th className="px-5 py-4 text-xs font-black text-[var(--color-text-main)] uppercase tracking-wide text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-color)]">
            {attempts.map((attempt) => {
              const quizTitle =
                typeof attempt.quizId === "string"
                  ? "Bài kiểm tra không xác định"
                  : attempt.quizId.title || "Bài kiểm tra không xác định";

              return (
                <tr key={attempt._id} className="hover:bg-[var(--color-bg-base)]/50 transition">
                  <td className="px-5 py-4">
                    <span className="text-xs font-extrabold text-[var(--color-text-main)] line-clamp-1">{quizTitle}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs font-extrabold text-[var(--color-text-main)]">{attempt.percentage}/100</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs font-black ${attempt.passed ? "text-emerald-600" : "text-red-500"}`}>
                      {attempt.percentage}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        attempt.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {attempt.passed ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                      {attempt.passed ? "Đạt" : "Không đạt"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{attempt.timeSpent} phút</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]/70">
                      {new Date(attempt.completedAt).toLocaleString("vi-VN")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleViewResult(attempt._id)}
                      className="text-xs font-black text-[var(--color-primary-color)] hover:text-[var(--color-primary-color-hover)] hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <Eye size={12} />
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuizHistory;
