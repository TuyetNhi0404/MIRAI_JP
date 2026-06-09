import React, { useState, useEffect } from "react";
import { Play, Headphones, Search, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import listeningService from "../../../services/listeningService";
import type { ListeningContent } from "../types";
import ListeningFilter from "../components/ListeningFilter";
import { PageLayout } from "../../../components/ui/PageLayout";
import { BaseCard } from "../../../components/ui/BaseCard";

const ListeningListPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("all");
  const [level, setLevel] = useState("all");
  const [contents, setContents] = useState<ListeningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listeningService.getAll({
          topic: topic !== "all" ? topic : undefined,
          level: level !== "all" ? level : undefined,
        });
        setContents(res.contents);
      } catch (err: unknown) {
        console.error(err);
        const errorMsg = err instanceof Error ? err.message : "Không thể tải danh sách bài nghe. Vui lòng thử lại.";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    void fetchContents();
  }, [topic, level]);

  return (
    <PageLayout
      title="Luyện nghe Tiếng Nhật"
      subtitle="Nâng cao khả năng nghe và phản xạ thông qua các chủ đề và bài tập đa dạng"
      icon={Headphones}
    >
      {/* Search & Filter Component */}
      <ListeningFilter topic={topic} level={level} setTopic={setTopic} setLevel={setLevel} />

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Sleek pulse skeletons instead of heavy Material UI
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-surface-base)] border border-[var(--color-border-color)] rounded-3xl overflow-hidden shadow-sm animate-pulse space-y-4 p-4">
              <div className="bg-[var(--color-secondary-color)] h-48 w-full rounded-2xl"></div>
              <div className="space-y-2">
                <div className="bg-[var(--color-secondary-color)] h-5 w-4/5 rounded-md"></div>
                <div className="bg-[var(--color-secondary-color)] h-4 w-11/12 rounded-md"></div>
                <div className="bg-[var(--color-secondary-color)] h-4 w-2/3 rounded-md"></div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="bg-[var(--color-secondary-color)] h-4 w-1/4 rounded-md"></div>
                <div className="bg-[var(--color-secondary-color)] h-4 w-1/6 rounded-md"></div>
              </div>
              <div className="bg-[var(--color-secondary-color)] h-10 w-full rounded-xl mt-2"></div>
            </div>
          ))
        ) : (
          contents.map((content) => {
            const minutes = Math.floor((content.duration || 0) / 60);
            const seconds = ((content.duration || 0) % 60).toString().padStart(2, "0");

            return (
              <BaseCard
                key={content._id}
                className="group flex flex-col justify-between overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full border border-[var(--color-border-color)]"
              >
                <div className="space-y-4">
                  {/* Thumbnail / Level tag header */}
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[var(--color-bg-base)] border border-[var(--color-border-color)]">
                    <img
                      src={
                        content.thumbnailUrl ||
                        "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800"
                      }
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 right-3 bg-[var(--color-primary-color)] text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                      {content.level}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)] leading-tight group-hover:text-[var(--color-primary-color)] transition m-0">
                      {content.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 m-0">
                      {content.description}
                    </p>
                  </div>
                </div>

                {/* Footer specs / Play action */}
                <div className="space-y-4 mt-4 pt-3 border-t border-[var(--color-border-color)]">
                  <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-1">
                      <Headphones size={13} className="text-[var(--color-text-secondary)]/60" />
                      <span>{content.playCount || 0} lượt nghe</span>
                    </div>
                    <span className="font-extrabold text-[var(--color-text-main)]">
                      {minutes}:{seconds}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/dashboard/student/listening/${content._id}`)}
                    className="w-full py-2.5 bg-[var(--color-primary-color)] hover:bg-[var(--color-primary-color-hover)] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play size={14} className="fill-white" />
                    Bắt đầu luyện nghe
                  </button>
                </div>
              </BaseCard>
            );
          })
        )}
      </div>

      {/* Empty Search/Filter results */}
      {!loading && contents.length === 0 && (
        <BaseCard className="text-center py-16">
          <div className="max-w-md mx-auto space-y-3">
            <Search size={40} className="mx-auto text-[var(--color-border-color)]" />
            <h4 className="text-sm font-extrabold text-[var(--color-text-main)] m-0">Không tìm thấy bài nghe nào</h4>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              Không tìm thấy tài liệu phù hợp với chủ đề hoặc trình độ bạn đã chọn.
            </p>
          </div>
        </BaseCard>
      )}
    </PageLayout>
  );
};

export default ListeningListPage;
