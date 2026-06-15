import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, FileText } from "lucide-react";
import listeningService from "../../../services/listeningService";
import type { ListeningContent } from "../types";
import AudioPlayer from "../components/AudioPlayer";
import { PageLayout } from "../../../components/ui/PageLayout";
import { BaseCard } from "../../../components/ui/BaseCard";

const ListeningDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [content, setContent] = useState<ListeningContent | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backPath = location.pathname.includes("/dashboard/teacher/")
    ? "/dashboard/teacher/listening"
    : "/dashboard/student/listening";

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listeningService.getById(id);
        setContent(data);
      } catch (err: unknown) {
        console.error(err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Không thể tải chi tiết bài nghe.";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [id]);

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
          onClick={() => navigate(backPath)}
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
      subtitle="Thực hiện nghe băng ghi âm và xem lại transcript khi cần"
      icon={FileText}
    >
      <div>
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-xs font-extrabold text-blue-650 hover:text-blue-800 transition active:scale-95 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-550 hover:text-red-750 font-black"
          >
            ×
          </button>
        </div>
      )}

      <BaseCard className="bg-slate-50/50 border border-slate-150/70 p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-800 m-0">
            {content.title}
          </h2>
          <p className="text-xs text-slate-500 m-0 mt-1 leading-relaxed font-semibold">
            {content.description}
          </p>
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

      {content.audioUrl && (
        <div className="sticky top-4 z-20 shadow-md rounded-3xl">
          <AudioPlayer src={content.audioUrl} />
        </div>
      )}

      {content.transcript && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-extrabold text-blue-650 hover:text-blue-800 transition active:scale-95"
            >
              <span>
                {showTranscript
                  ? "Ẩn văn bản transcript"
                  : "Hiện văn bản transcript"}
              </span>
              {showTranscript ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          </div>

          {showTranscript && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 text-xs font-medium text-slate-700 leading-loose whitespace-pre-line animate-fadeIn select-all">
              <h4 className="text-xs font-black text-slate-800 m-0 mb-3 uppercase tracking-wider">
                Văn bản ghi âm
              </h4>
              {content.transcript}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default ListeningDetailPage;
