import React, { useState, useEffect } from "react";
import { BookOpen, ArrowRight, Bookmark, BookmarkCheck, Languages } from "lucide-react";
import { grammarService, type IGrammarCard } from "../../services/grammar.service";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { EmptyState } from "../../components/ui/EmptyState";

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  N1: { bg: "bg-purple-50", text: "text-purple-750", border: "border-purple-200" },
  N2: { bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200" },
  N3: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  N4: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  N5: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const StudentGrammarPractice: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeLevels, setActiveLevels] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<IGrammarCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<IGrammarCard[]>([]);
  const [selectedLevelTab, setSelectedLevelTab] = useState(0);

  // Flashcard states
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [learnedCards, setLearnedCards] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("mirai_learned_grammar");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await grammarService.getStudentPracticeCards();
        if (res.success) {
          setActiveLevels(res.levels);
          setAllCards(res.cards);
        }
      } catch (err) {
        console.error("Lỗi tải bài học ngữ pháp của học sinh:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Filter cards when level tab changes
  useEffect(() => {
    if (activeLevels.length > 0) {
      const activeLvl = activeLevels[selectedLevelTab];
      const filtered = allCards.filter((card) => card.level === activeLvl);
      setFilteredCards(filtered);
    } else {
      setFilteredCards([]);
    }
  }, [selectedLevelTab, activeLevels, allCards]);

  const handleFlipCard = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleToggleLearned = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation(); // Ngăn flip thẻ khi nhấn nút
    const updated = {
      ...learnedCards,
      [cardId]: !learnedCards[cardId],
    };
    setLearnedCards(updated);
    localStorage.setItem("mirai_learned_grammar", JSON.stringify(updated));
  };

  const countLearnedInCurrentLevel = () => {
    if (filteredCards.length === 0) return 0;
    return filteredCards.filter((c) => learnedCards[c._id]).length;
  };

  const currentLevel = activeLevels[selectedLevelTab] || "";

  return (
    <PageLayout
      title="Luyện tập Ngữ pháp"
      subtitle="Danh sách cấu trúc ngữ pháp được biên soạn riêng theo trình độ khóa học bạn tham gia"
      icon={BookOpen}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="w-10 h-10 border-4 border-[var(--color-primary-color)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[var(--color-text-secondary)] font-medium">Đang tải cấu trúc ngữ pháp...</p>
        </div>
      ) : activeLevels.length === 0 ? (
        <BaseCard>
          <EmptyState
            title="Chưa đăng ký khóa học nào"
            description="Vui lòng đăng ký tham gia các khóa học JLPT tại MIRAI để mở khóa lộ trình học ngữ pháp tương ứng."
            icon={BookOpen}
          />
        </BaseCard>
      ) : (
        <div className="space-y-4">
          {/* Combined Compact Top Bar: Level Tabs & Progress */}
          <BaseCard className="!p-3 bg-[var(--color-surface-base)] border border-[var(--color-border-color)] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Level Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {activeLevels.map((lvl, index) => {
                  const lvlColors = LEVEL_COLORS[lvl] || { bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200" };
                  const isSelected = selectedLevelTab === index;
                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        setSelectedLevelTab(index);
                        setFlippedCards({});
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition border active:scale-95 cursor-pointer ${
                        isSelected
                          ? `bg-[var(--color-primary-color)] border-[var(--color-primary-color)] text-white shadow-xs`
                          : `bg-[var(--color-bg-base)] border-[var(--color-border-color)] hover:border-slate-300 text-[var(--color-text-secondary)]`
                      }`}
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                          isSelected ? "bg-white/20 text-white" : `${lvlColors.bg} ${lvlColors.text}`
                        }`}
                      >
                        {lvl}
                      </span>
                      Lớp {lvl}
                    </button>
                  );
                })}
              </div>

              {/* Level Progress */}
              {filteredCards.length > 0 && (
                <div className="flex items-center gap-3 bg-[var(--color-bg-base)] px-3 py-1.5 rounded-xl border border-[var(--color-border-color)] shrink-0 self-start md:self-auto">
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
                    Tiến độ <span className="font-extrabold text-[var(--color-text-main)]">{currentLevel}</span>:{" "}
                    <span className="font-bold text-[var(--color-primary-color)]">{countLearnedInCurrentLevel()}</span>/{filteredCards.length}
                  </div>
                  <div className="w-28 sm:w-36 h-2 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(countLearnedInCurrentLevel() / filteredCards.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 shrink-0">
                    {Math.round((countLearnedInCurrentLevel() / filteredCards.length) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </BaseCard>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <BaseCard>
              <EmptyState
                title="Chưa có thẻ ngữ pháp"
                description={`Hệ thống chưa cập nhật thẻ ngữ pháp cho trình độ ${currentLevel}.`}
                icon={BookOpen}
              />
            </BaseCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCards.map((card) => {
                const isFlipped = !!flippedCards[card._id];
                const isLearned = !!learnedCards[card._id];
                const cardColors = LEVEL_COLORS[card.level] || { bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-200" };

                return (
                  <div
                    key={card._id}
                    onClick={() => handleFlipCard(card._id)}
                    className="h-72 cursor-pointer relative select-none"
                    style={{ perspective: "1000px" }}
                  >
                    <div
                      className="w-full h-full relative transition-transform duration-500"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      {/* --- CARD FRONT --- */}
                      <div
                        className={`absolute w-full h-full rounded-2xl bg-[var(--color-surface-base)] border p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md ${
                          isLearned ? "border-emerald-500 bg-gradient-to-br from-[var(--color-surface-base)] to-emerald-500/5" : "border-[var(--color-border-color)]"
                        }`}
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${cardColors.bg} ${cardColors.text}`}>
                            {card.level}
                          </span>
                          <button
                            onClick={(e) => handleToggleLearned(e, card._id)}
                            className={`p-1.5 rounded-full hover:bg-[var(--color-bg-base)] transition active:scale-90 ${
                              isLearned ? "text-emerald-600" : "text-slate-300 hover:text-emerald-500"
                            }`}
                          >
                            {isLearned ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                          </button>
                        </div>

                        <div className="text-center my-auto space-y-2">
                          <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight m-0">{card.title}</h3>
                          <span className="inline-block text-[11px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] border border-[var(--color-border-color)] rounded px-2.5 py-0.5">
                            {card.structure}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--color-border-color)]">
                          <span className="text-xs font-black text-[var(--color-primary-color)] truncate max-w-[70%]">{card.meaningVi}</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-text-secondary)]/60 hover:text-[var(--color-primary-color)]">
                            Xem chi tiết <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>

                      {/* --- CARD BACK --- */}
                      <div
                        className="absolute w-full h-full rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-color)] p-5 flex flex-col justify-between shadow-sm"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        <div className="overflow-y-auto space-y-3 flex-1 scrollbar-thin">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-color)]">
                            <Languages size={14} />
                            <span>Giải thích Ngữ pháp:</span>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-base)] border border-[var(--color-border-color)] p-3 rounded-xl leading-relaxed m-0">
                            {card.explanation}
                          </p>

                          {card.examples && card.examples.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ví dụ mẫu:</span>
                              <div className="border-l-2 border-[var(--color-primary-color)] pl-3 space-y-1">
                                <p className="text-xs font-black text-[var(--color-text-main)] m-0">{card.examples[0].japanese}</p>
                                {card.examples[0].furigana && (
                                  <p className="text-[9px] text-slate-400 font-medium m-0">{card.examples[0].furigana}</p>
                                )}
                                <p className="text-[11px] text-[var(--color-text-secondary)] m-0">{card.examples[0].vietnamese}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <span className="block text-[9px] text-slate-400 font-medium text-center pt-2 mt-2 border-t border-[var(--color-border-color)]">
                          Nhấp để quay lại mặt trước
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default StudentGrammarPractice;
