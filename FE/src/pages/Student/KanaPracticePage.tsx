import React, { useState } from "react";
import type { KanaChar, KanaType } from "../../types/kanaData";
import { getKanaData } from "../../types/kanaData";
import KanaSelector from "../../components/kana/KanaSelector";
import KanaGrid from "../../components/kana/KanaGrid";
import KanaDetailPanel from "../../components/kana/KanaDetailPanel";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { PenTool } from "lucide-react";

const KanaPracticePage: React.FC = () => {
  const [kanaType, setKanaType] = useState<KanaType>("hiragana");
  const [selectedChar, setSelectedChar] = useState<KanaChar | null>(null);

  const chars = getKanaData(kanaType);

  const handleTypeChange = (type: KanaType) => {
    setKanaType(type);
    setSelectedChar(null);
  };

  const handleCharSelect = (char: KanaChar) => {
    setSelectedChar((prev) => (prev?.kana === char.kana ? null : char));
  };

  return (
    <PageLayout
      title="Luyện viết bảng chữ cái"
      subtitle="Học cách viết Hiragana và Katakana — chọn chữ cái và luyện tập nét vẽ"
      icon={PenTool}
      extra={<KanaSelector selectedType={kanaType} onSelect={handleTypeChange} />}
    >
      {/* Main 2-column layout */}
      <div className={`grid gap-6 transition-all duration-300 ${selectedChar ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
        {/* Left panel: character grid */}
        <BaseCard className={`${selectedChar ? "lg:col-span-2" : "w-full"}`}>
          {/* Stats row */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-[var(--color-primary-color)] rounded-full"></span>
              <span className="text-sm font-extrabold text-[var(--color-text-main)] uppercase tracking-wide">
                Bảng {kanaType === "hiragana" ? "Hiragana" : "Katakana"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-[var(--color-accent-color)] text-[var(--color-primary-color)] font-extrabold text-xs px-3 py-1 rounded-full">
                {chars.length} ký tự
              </span>
              {selectedChar && (
                <button
                  onClick={() => setSelectedChar(null)}
                  className="bg-transparent border border-[var(--color-border-color)] hover:border-red-500 hover:text-red-500 text-xs font-bold px-3 py-1 rounded-full text-[var(--color-text-secondary)] transition active:scale-95"
                >
                  ✕ Bỏ chọn
                </button>
              )}
            </div>
          </div>

          <KanaGrid chars={chars} selectedChar={selectedChar} onSelect={handleCharSelect} />
        </BaseCard>

        {/* Right panel: detail & writing canvas */}
        {selectedChar && (
          <div className="lg:col-span-1 lg:sticky lg:top-[88px] self-start max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
            <BaseCard className="border-l-4 border-emerald-500">
              <KanaDetailPanel selectedChar={selectedChar} kanaType={kanaType} />
            </BaseCard>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default KanaPracticePage;
