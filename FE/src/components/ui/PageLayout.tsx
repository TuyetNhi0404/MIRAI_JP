import React from "react";
import type { LucideIcon } from "lucide-react";

interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, icon: Icon, extra, children }) => {
  const hasHeader = Boolean((title && title.trim()) || (subtitle && subtitle.trim()) || Icon || extra);

  return (
    <div className="w-full bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${hasHeader ? "py-6 space-y-6" : "py-3 sm:py-4 space-y-4"}`}>
        {/* Page Header */}
        {hasHeader && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border-color pb-6">
            <div className="flex items-start gap-4">
              {Icon && (
                <div className="p-3 bg-white rounded-2xl border border-border-color shadow-sm text-primary-color shrink-0">
                  <Icon size={28} strokeWidth={2.5} />
                </div>
              )}
              <div className="space-y-1">
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-sm text-text-secondary font-medium max-w-2xl">{subtitle}</p>}
              </div>
            </div>
            {extra && <div className="flex items-center gap-3 shrink-0">{extra}</div>}
          </div>
        )}

        {/* Page Body */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};
export default PageLayout;
