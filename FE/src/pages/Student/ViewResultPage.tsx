import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Timer,
  Award,
  BookOpen,
} from "lucide-react";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import type { UserWithId } from "../../types/quiz.types";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";

const ViewResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { attemptDetail, loading, error, loadAttemptResult } = useQuiz();

  useEffect(() => {
    if (attemptId) {
      const userId = user?._id || (user as UserWithId)?.id;
      void loadAttemptResult(attemptId, userId);
    }
  }, [attemptId, loadAttemptResult, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-primary-color border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-text-secondary font-medium">Đang tải kết quả bài làm...</p>
      </div>
    );
  }

  if (error) {
    return (
      <PageLayout title="Kết quả bài kiểm tra" subtitle="Xem phản hồi và đáp án chi tiết">
        <BaseCard className="bg-red-50 border border-red-150 p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-red-800 font-bold text-sm">
            <XCircle size={20} />
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

  if (!attemptDetail) {
    return (
      <PageLayout title="Kết quả bài kiểm tra" subtitle="Xem phản hồi và đáp án chi tiết">
        <BaseCard>
          <div className="text-center py-12 text-text-secondary/80 text-sm font-semibold">
            Không tìm thấy thông tin lượt làm bài.
          </div>
        </BaseCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Kết quả bài làm"
      subtitle="Xem lại chi tiết điểm số, thời gian và lời giải chi tiết cho từng câu hỏi"
      icon={Award}
    >
      {/* Back button row */}
      <div>
        <button
          onClick={() => navigate("/dashboard/student/quizzes")}
          className="flex items-center gap-2 text-xs font-extrabold text-primary-color hover:text-primary-color-hover transition active:scale-95 bg-surface-base border border-border-color shadow-sm rounded-xl px-4 py-2.5"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách bài kiểm tra
        </button>
      </div>

      {/* Result Summary Banner Card */}
      <BaseCard className="bg-gradient-to-r from-accent-color/30 via-surface-base to-accent-color/10 border-l-4 border-primary-color">
        <div className="space-y-6">
          <h2 className="text-lg font-black text-text-main m-0">{attemptDetail.quizTitle}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Score box - hiển thị điểm trên thang 100 */}
            <div className="bg-surface-base border border-border-color p-4 rounded-2xl text-center shadow-sm flex flex-col items-center justify-center">
              <Award className="text-primary-color mb-1" size={24} />
              <span className={`text-2xl font-black ${attemptDetail.passed ? "text-emerald-600" : "text-red-500"}`}>
                {attemptDetail.percentage} <span className="text-xs text-slate-450 font-bold">/ 100</span>
              </span>
              <span className="text-[10px] text-text-secondary font-extrabold uppercase mt-1">Điểm số</span>
            </div>

            {/* Correct answers box */}
            <div className="bg-surface-base border border-border-color p-4 rounded-2xl text-center shadow-sm flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-text-secondary">
                {attemptDetail.score} <span className="text-xs font-bold">/ {attemptDetail.totalQuestions}</span>
              </span>
              <span className="text-[10px] text-text-secondary font-extrabold uppercase mt-3">Số câu đúng</span>
            </div>

            {/* Time spent box */}
            <div className="bg-surface-base border border-border-color p-4 rounded-2xl text-center shadow-sm flex flex-col items-center justify-center">
              <Timer className="text-amber-500 mb-1" size={24} />
              <span className="text-2xl font-black text-text-secondary">{attemptDetail.timeSpent}</span>
              <span className="text-[10px] text-text-secondary font-extrabold uppercase mt-1">Phút làm bài</span>
            </div>

            {/* Status box */}
            <div className="bg-surface-base border border-border-color p-4 rounded-2xl text-center shadow-sm flex items-center justify-center">
              <span
                className={`text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 ${
                  attemptDetail.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {attemptDetail.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {attemptDetail.passed ? "ĐẠT" : "KHÔNG ĐẠT"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-text-secondary/80 font-semibold border-t border-border-color pt-4 mt-2">
            <span>Hoàn thành lúc: {new Date(attemptDetail.completedAt).toLocaleString("vi-VN")}</span>
          </div>
        </div>
      </BaseCard>

      {/* Detailed review header */}
      <div className="flex items-center gap-2 border-b border-border-color pb-2">
        <BookOpen className="text-text-secondary" size={18} />
        <h3 className="text-sm font-extrabold text-text-main m-0">Xem lại câu hỏi</h3>
      </div>

      {/* Questions list review */}
      <div className="space-y-6">
        {attemptDetail.results.map((result, index) => {
          const isCorrect = result.isCorrect;

          return (
            <BaseCard
              key={index}
              className={`border-l-4 ${isCorrect ? "border-l-emerald-500" : "border-l-red-500"} space-y-4`}
            >
              {/* Question header badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded text-white ${
                    isCorrect ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  Q{result.questionIndex + 1}
                </span>

                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {isCorrect ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {isCorrect ? "Đúng" : "Sai"}
                </span>
              </div>

              {/* Question content */}
              <h4 className="text-xs font-extrabold text-text-main m-0 leading-relaxed">{result.question}</h4>

              <hr className="border-border-color" />

              {/* Options list */}
              <div className="grid grid-cols-1 gap-2.5">
                {result.options.map((option, optIndex) => {
                  const optionNumber = optIndex + 1;
                  const isStudentAnswer = result.studentAnswer === optionNumber;
                  const isCorrectAnswer = result.correctAnswer === optionNumber;

                  let optionStyle = "border-border-color/85 text-text-secondary hover:bg-bg-base/50";
                  let leftIcon = null;

                  if (isCorrectAnswer) {
                    optionStyle = "bg-emerald-50/35 border-emerald-500 text-emerald-800 font-bold";
                    leftIcon = <CheckCircle size={14} className="text-emerald-600 shrink-0" />;
                  } else if (isStudentAnswer && !isCorrect) {
                    optionStyle = "bg-red-50/35 border-red-500 text-red-800 font-bold";
                    leftIcon = <XCircle size={14} className="text-red-600 shrink-0" />;
                  }

                  return (
                    <div
                      key={optIndex}
                      className={`flex items-center justify-between border px-4 py-3 rounded-2xl transition select-none ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        {leftIcon || <div className="w-3.5 h-3.5 shrink-0" />}

                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded text-center shrink-0 ${
                            isCorrectAnswer
                              ? "bg-emerald-500 text-white"
                              : "bg-bg-base border border-border-color text-text-secondary"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>

                        <span className="text-xs">{option}</span>
                      </div>

                      {/* Right feedback badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isStudentAnswer && (
                          <span
                            className={`text-[9px] font-black px-2.5 py-0.5 rounded-full text-white ${
                              isCorrect ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          >
                            Lựa chọn của bạn
                          </span>
                        )}
                        {isCorrectAnswer && !isStudentAnswer && (
                          <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                            Đáp án đúng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </BaseCard>
          );
        })}
      </div>

      {/* Bottom return button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={() => navigate("/dashboard/student/quizzes")}
          className="flex items-center gap-2 text-xs font-black text-white bg-primary-color hover:bg-primary-color-hover transition active:scale-95 shadow-sm rounded-xl px-6 py-3"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách bài kiểm tra
        </button>
      </div>
    </PageLayout>
  );
};

export default ViewResultPage;
