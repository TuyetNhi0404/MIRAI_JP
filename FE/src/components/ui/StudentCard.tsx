import React from "react";

interface StudentCardProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBgColorClass?: string; // e.g. 'bg-blue-50 text-blue-600'
  badgeText?: string;
  badgeColorClass?: string; // e.g. 'bg-orange-50 text-orange-600'
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const StudentCard: React.FC<StudentCardProps> = ({
  title,
  description,
  icon: Icon,
  iconBgColorClass = "bg-blue-50 text-blue-600",
  badgeText,
  badgeColorClass = "bg-slate-100 text-slate-600",
  onClick,
  className = "",
  children,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white border border-[#E2E8F0] rounded-[20px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(37,99,235,0.08)] hover:border-blue-200 transition-all duration-300 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Top Row: Icon & Badge */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {Icon ? (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColorClass}`}>
            <Icon size={20} />
          </div>
        ) : (
          <div />
        )}
        {badgeText && (
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${badgeColorClass}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Bottom Row: Text Content */}
      <div className="space-y-1">
        <h3 className="text-[15px] font-bold text-[#0F172A] m-0 leading-snug">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[#475569] m-0 leading-normal">
            {description}
          </p>
        )}
      </div>

      {/* Children for any additional customized body content */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default StudentCard;
