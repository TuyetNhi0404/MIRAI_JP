import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <Icon size={28} className="stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-[#1F2238] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
