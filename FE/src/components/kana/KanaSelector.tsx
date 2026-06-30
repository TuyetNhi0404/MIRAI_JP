import React from "react";
import type { KanaType } from "../../types/kanaData";

interface KanaSelectorProps {
  selectedType: KanaType;
  onSelect: (type: KanaType) => void;
}

const KanaSelector: React.FC<KanaSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div className="flex items-center bg-accent-color/40 p-1 rounded-2xl border border-border-color shadow-sm w-fit">
      {(["hiragana", "katakana"] as KanaType[]).map((type) => {
        const isActive = selectedType === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 group
              ${isActive ? "bg-primary-color text-white shadow-md" : "text-text-secondary hover:text-text-main"}
            `}
          >
            <span className={`text-base font-bold transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
              {type === "hiragana" ? "あ" : "ア"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              {type === "hiragana" ? "Hiragana" : "Katakana"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default KanaSelector;
