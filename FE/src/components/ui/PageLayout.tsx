import React from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, extra, children }) => {
  return (
    <div className="w-full bg-bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-color pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-text-secondary font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {extra && <div className="flex items-center gap-3 shrink-0">{extra}</div>}
        </div>

        {/* Page Body */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};
export default PageLayout;
