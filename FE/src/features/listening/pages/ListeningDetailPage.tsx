import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import listeningService, { type SubmitResult } from "../../../services/listeningService";
import type { ListeningContent, ListeningExercise } from "../types";
import AudioPlayer from "../components/AudioPlayer";
import { PageLayout } from "../../../components/ui/PageLayout";
import { BaseCard } from "../../../components/ui/BaseCard";

const ListeningDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState<ListeningContent | null>(null);
  const [exercises, setExercises] = useState<ListeningExercise[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listeningService.getById(id);
        setContent(data);
        setExercises(data.exercises || []);
      } catch (err: unknown) {
        console.error(err);
        const errorMsg = err instanceof Error ? err.message : "Không thể tải chi tiết bài nghe.";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    void fetchDetail();
  }, [id]);

  const handleAnswerChange = (exerciseId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: val }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const payloadAnswers = exercises.map((ex) => {
        const answerVal = answers[ex._id || ""] || "";
        const formattedAnswer = Array.isArray(answerVal) ? answerVal.join(",") : answerVal;
        return {
          exerciseId: ex._id || "",
          studentAnswer: formattedAnswer,
        };
      });

      const res = await listeningService.submit(id, { answers: payloadAnswers });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : "Nộp bài thất bại. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="bg-slate-200 h-6 w-24 rounded animate-pulse"></div>
        <div className="space-y-3">
          <div className="bg-slate-200 h-8 w-3/4 rounded animate-pulse"></div>
          <div className="bg-slate-200 h-4 w-11/12 rounded animate-pulse"></div>
        </div>
        <div className="bg-slate-200 h-24 w-full rounded-3xl animate-pulse"></div>
        <div className="bg-slate-200 h-64 w-full rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800">
          {error}
        </div>
        <button
          onClick={() => navigate("/dashboard/student/listening")}
          className="flex items-center gap-2 px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-xs transition"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!content) return null;

  return (
    <PageLayout
      title="Luyện nghe Chi tiết"
      subtitle="Thực hiện nghe băng ghi âm, hoàn thành các bài tập trắc nghiệm hoặc điền từ"
      icon={FileText}
    >
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate("/dashboard/student/listening")}
          className="flex items-center gap-2 text-xs font-extrabold text-blue-650 hover:text-blue-800 transition active:scale-95 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-550 hover:text-red-750 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Main Info Card */}
      <BaseCard className="bg-slate-50/50 border border-slate-150/70 p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-800 m-0">{content.title}</h2>
          <p className="text-xs text-slate-500 m-0 mt-1 leading-relaxed font-semibold">{content.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-150">
          <span className="bg-red-50 text-red-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-red-100">
            Cấp độ: {content.level}
          </span>
          <span className="bg-amber-50 text-amber-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-amber-100">
            Chủ đề: {content.topic}
          </span>
        </div>
      </BaseCard>

      {/* Audio Player Container */}
      {content.audioUrl && (
        <div className="sticky top-4 z-20 shadow-md rounded-3xl">
          <AudioPlayer src={content.audioUrl} />
        </div>
      )}

      {/* Transcript Collapsible */}
      {content.transcript && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-extrabold text-blue-650 hover:text-blue-800 transition active:scale-95"
            >
              <span>{showTranscript ? "Ẩn văn bản transcript" : "Hiện văn bản transcript"}</span>
              {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showTranscript && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 text-xs font-medium text-slate-700 leading-loose whitespace-pre-line animate-fadeIn select-all">
              <h4 className="text-xs font-black text-slate-800 m-0 mb-3 uppercase tracking-wider">Văn bản ghi âm</h4>
              {content.transcript}
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 m-0 mb-6">Câu hỏi bài tập</h3>

        <div className="space-y-6">
          {exercises.map((ex, index) => {
            const evaluation = result?.answers?.find((ans) => ans.exerciseId === ex._id);
            const isSubmitted = result !== null;
            const isCorrect = evaluation?.isCorrect || false;

            return (
              <BaseCard
                key={ex._id}
                className={`relative border-2 transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? "border-emerald-250 bg-emerald-50/5"
                      : "border-red-200 bg-red-50/5"
                    : "border-slate-100"
                }`}
              >
                {/* Correct/Incorrect absolute label */}
                {isSubmitted && (
                  <div className="absolute top-4 right-4">
                    {isCorrect ? (
                      <CheckCircle className="text-emerald-600" size={24} />
                    ) : (
                      <XCircle className="text-red-550" size={24} />
                    )}
                  </div>
                )}

                {/* Question title */}
                <div className="flex items-start gap-3 pr-10">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-sm font-extrabold text-slate-800 leading-snug m-0 pt-0.5">{ex.question}</p>
                </div>

                {/* Input Area */}
                <div className="mt-5 pl-9">
                  {ex.type === "quiz" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(ex.options || []).map((opt: string) => {
                        const isSelected = answers[ex._id || ""] === opt;
                        const isCorrectAnswer = opt === ex.correctAnswer;
                        const isWrongSelection = isSelected && !evaluation?.isCorrect;

                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border transition cursor-pointer text-xs font-bold ${
                              isSubmitted
                                ? isCorrectAnswer
                                  ? "bg-emerald-50 border-emerald-250 text-emerald-800 font-extrabold"
                                  : isWrongSelection
                                    ? "bg-red-50 border-red-200 text-red-800"
                                    : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                : isSelected
                                  ? "bg-blue-50 border-blue-300 text-blue-800"
                                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`exercise-${ex._id}`}
                              disabled={isSubmitted}
                              checked={isSelected}
                              onChange={() => handleAnswerChange(ex._id || "", opt)}
                              className="accent-blue-600 w-4.5 h-4.5 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {ex.type === "fill_blank" && (
                    <div className="space-y-3">
                      <p className="leading-loose text-xs font-semibold text-slate-700 m-0">
                        {(ex.textWithBlanks || "").split("___").map((part: string, i: number, arr: any[]) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <input
                                type="text"
                                disabled={isSubmitted}
                                value={answers[ex._id || ""]?.[i] || ""}
                                onChange={(e) => {
                                  const currentVal = answers[ex._id || ""] || [];
                                  const newAnswers = [...(Array.isArray(currentVal) ? currentVal : [])];
                                  newAnswers[i] = e.target.value;
                                  handleAnswerChange(ex._id || "", newAnswers);
                                }}
                                className="mx-1.5 px-2 py-0.5 border-b-2 border-slate-350 focus:border-blue-500 focus:outline-none bg-transparent w-20 text-center font-black text-slate-800 disabled:border-slate-200 disabled:text-slate-400"
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                      {isSubmitted && (
                        <p className="text-xs font-extrabold text-emerald-700 mt-2">
                          Đáp án đúng: {(ex.answers || []).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {ex.type === "dictation" && (
                    <div className="space-y-3">
                      <textarea
                        rows={3}
                        disabled={isSubmitted}
                        placeholder="Nghe và nhập nội dung viết chính tả tại đây..."
                        value={answers[ex._id || ""] || ""}
                        onChange={(e) => handleAnswerChange(ex._id || "", e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                      {isSubmitted && (
                        <div
                          className={`p-4 rounded-2xl border text-xs font-bold ${
                            isCorrect
                              ? "bg-emerald-50/50 border-emerald-250 text-emerald-800"
                              : "bg-red-50/50 border-red-200 text-red-800"
                          }`}
                        >
                          <span className="font-extrabold block mb-1 uppercase tracking-wide text-[9px] text-slate-400">
                            Lời thoại chính xác:
                          </span>
                          <p className="m-0 leading-relaxed">{ex.targetText}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </BaseCard>
            );
          })}
        </div>
      </div>

      {/* Footer action button or Result card */}
      <div className="pt-6">
        {result === null ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang nộp bài...
              </span>
            ) : (
              "Nộp bài tập nghe"
            )}
          </button>
        ) : (
          <BaseCard className="bg-gradient-to-r from-blue-50/30 to-orange-50/10 border-l-4 border-blue-600 text-center p-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-600">
              <CheckCircle size={32} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Điểm số đạt được</span>
              <h2 className="text-3xl font-black text-blue-650 m-0">
                {result.totalScore} <span className="text-sm text-slate-400 font-bold">/ {result.maxScore}</span>
              </h2>
            </div>

            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-semibold">
              Chúc mừng bạn đã hoàn thành bài tập nghe! Hãy xem lại chi tiết đúng sai của từng câu trả lời ở trên để cải
              thiện kỹ năng.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => navigate("/dashboard/student/listening")}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-655 rounded-xl text-xs font-bold transition active:scale-95"
              >
                Quay lại danh sách
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                }}
                className="px-5 py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-sm"
              >
                Luyện tập lại
              </button>
            </div>
          </BaseCard>
        )}
      </div>
    </PageLayout>
  );
};

export default ListeningDetailPage;
