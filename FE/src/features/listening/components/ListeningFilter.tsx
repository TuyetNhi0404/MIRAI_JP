import React from "react";

interface ListeningFilterProps {
  topic: string;
  level: string;
  setTopic: (v: string) => void;
  setLevel: (v: string) => void;
}

const topics = [
  { value: "all", label: "Tất cả chủ đề" },
  { value: "daily_life", label: "Đời sống hàng ngày" },
  { value: "travel", label: "Du lịch" },
  { value: "business", label: "Công việc/Kinh doanh" },
  { value: "culture", label: "Văn hóa" },
];

const levels = ["Tất cả", "N5", "N4", "N3", "N2", "N1"];

const ListeningFilter: React.FC<ListeningFilterProps> = ({ topic, level, setTopic, setLevel }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center p-4 rounded-2xl bg-[var(--color-surface-base)] border border-[var(--color-border-color)] shadow-[0_2px_10px_rgb(0,0,0,0.03)]">
      {/* Topic Dropdown */}
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-[10px] text-[var(--color-text-secondary)] font-extrabold uppercase tracking-wider">Chủ đề bài nghe</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-[var(--color-border-color)] rounded-xl px-3 py-2 bg-[var(--color-surface-base)] text-xs font-bold text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary-color)]"
        >
          {topics.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Level Filter Tags */}
      <div className="flex-1 flex flex-col gap-1">
        <label className="text-[10px] text-[var(--color-text-secondary)] font-extrabold uppercase tracking-wider">Trình độ JLPT</label>
        <div className="flex flex-wrap gap-2">
          {levels.map((l) => {
            const isSelected = level === (l === "Tất cả" ? "all" : l);
            return (
              <button
                key={l}
                onClick={() => setLevel(l === "Tất cả" ? "all" : l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border active:scale-95 ${
                  isSelected
                    ? "bg-[var(--color-primary-color)] border-[var(--color-primary-color)] text-white shadow-sm"
                    : "bg-[var(--color-surface-base)] border-[var(--color-border-color)] hover:border-[var(--color-primary-color)]/40 text-[var(--color-text-secondary)]"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ListeningFilter;
