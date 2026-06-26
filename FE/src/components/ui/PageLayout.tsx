import React from "react";
import type { LucideIcon } from "lucide-react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, icon: Icon, extra, children }) => {
  return (
    <div className="w-full bg-bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border-color pb-6">
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="p-3 bg-white rounded-2xl border border-border-color shadow-sm text-primary-color shrink-0">
                <Icon size={28} strokeWidth={2.5} />
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-text-secondary font-medium max-w-2xl">{subtitle}</p>}
            </div>
          </div>
          {extra && <div className="flex items-center gap-3 shrink-0">{extra}</div>}
        </div>

        {/* Page Body */}
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
};
export default PageLayout;
