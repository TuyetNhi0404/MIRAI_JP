import React from "react";

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const BaseCard: React.FC<BaseCardProps> = ({ children, className = "", onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-base rounded-2xl border border-border-color shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 transition-all duration-300 ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-border-color/80" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};
