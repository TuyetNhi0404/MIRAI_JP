import React, { type ReactNode } from "react";
import { Card, Typography, Space } from "antd";
import { type LucideIcon } from "lucide-react";
import { brandColors } from "../../theme/theme";

const { Title, Text } = Typography;

// Lucide icons are forwardRef components, so we need to detect them by
// checking for $$typeof + render rather than just typeof === "function".
function resolveIcon(
  icon: ReactNode | LucideIcon | undefined,
  size = 20,
  strokeWidth = 2
): ReactNode {
  if (icon === undefined || icon === null) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function") {
    const Comp = icon as LucideIcon;
    return <Comp size={size} strokeWidth={strokeWidth} />;
  }
  if (
    typeof icon === "object" &&
    icon !== null &&
    "$$typeof" in icon &&
    "render" in icon
  ) {
    const Comp = icon as unknown as LucideIcon;
    return <Comp size={size} strokeWidth={strokeWidth} />;
  }
  return icon as ReactNode;
}

interface PageHeaderProps {
  icon?: ReactNode | LucideIcon;
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  bordered?: boolean;
}

export function PageHeader({ icon, title, subtitle, extra, bordered = true }: PageHeaderProps) {
  const renderedIcon = resolveIcon(icon, 22);
  return (
    <div
      className="mira-fade-in"
      style={{
        background: brandColors.paper,
        border: bordered ? `1px solid ${brandColors.border}` : "none",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)",
      }}
    >
      <Space size={14} align="center" style={{ minWidth: 0, flex: 1 }}>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: brandColors.redSoft,
              color: brandColors.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {renderedIcon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <Title
            level={3}
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: brandColors.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 13, marginTop: 2, display: "block" }}>
              {subtitle}
            </Text>
          )}
        </div>
      </Space>
      {extra && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{extra}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode | LucideIcon;
  trend?: { value: number; label?: string };
  accent?: "primary" | "success" | "warning" | "info" | "neutral";
  loading?: boolean;
}

const ACCENT_COLORS = {
  primary: { bg: brandColors.redSoft, fg: brandColors.red },
  success: { bg: "#F6FFED", fg: brandColors.success },
  warning: { bg: "#FFFBE6", fg: brandColors.warning },
  info: { bg: "#E6F4FF", fg: brandColors.info },
  neutral: { bg: "#F5F5F5", fg: brandColors.textPrimary },
} as const;

export function StatCard({ label, value, hint, icon, trend, accent = "primary", loading = false }: StatCardProps) {
  const renderedIcon = resolveIcon(icon);
  const tone = ACCENT_COLORS[accent];
  return (
    <Card
      loading={loading}
      className="mira-card-hover mira-fade-in-up"
      style={{
        borderRadius: 12,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              display: "block",
              marginBottom: 8,
            }}
          >
            {label}
          </Text>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: brandColors.textPrimary,
              lineHeight: 1.1,
              letterSpacing: -0.3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </div>
          {(hint || trend) && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              {trend && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: trend.value >= 0 ? "#F6FFED" : "#FFF1F0",
                    color: trend.value >= 0 ? brandColors.success : brandColors.error,
                  }}
                >
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
              {hint && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {hint}
                </Text>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: tone.bg,
              color: tone.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {renderedIcon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode | LucideIcon;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const renderedIcon = resolveIcon(icon, 32, 1.5);
  return (
    <div
      className="mira-fade-in"
      style={{
        textAlign: "center",
        padding: "56px 24px",
        background: brandColors.paper,
        border: `1px dashed ${brandColors.border}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: brandColors.redSoft,
          color: brandColors.red,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {renderedIcon}
      </div>
      <Title level={5} style={{ marginBottom: 6, color: brandColors.textPrimary }}>
        {title}
      </Title>
      {description && (
        <Text type="secondary" style={{ display: "block", maxWidth: 360, margin: "0 auto 20px" }}>
          {description}
        </Text>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mira-button-hover"
          style={{
            background: brandColors.red,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 0 rgba(185, 0, 0, 0.06)",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ToolbarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onSearch?: () => void;
  };
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageToolbar({ search, actions, filters }: ToolbarProps) {
  return (
    <div
      className="mira-fade-in"
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 280, alignItems: "center", flexWrap: "wrap" }}>
        {search && (
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search.onSearch?.()}
            placeholder={search.placeholder ?? "Tìm kiếm..."}
            className="mira-button-hover"
            style={{
              flex: 1,
              minWidth: 220,
              maxWidth: 360,
              padding: "9px 14px",
              borderRadius: 8,
              border: `1px solid ${brandColors.border}`,
              fontSize: 14,
              outline: "none",
              transition: "border-color 200ms ease, box-shadow 200ms ease",
              background: brandColors.paper,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = brandColors.red;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColors.redSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = brandColors.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        )}
        {filters}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

interface StatusTagProps {
  status: "success" | "warning" | "error" | "info" | "default" | "processing";
  text: string;
  icon?: ReactNode;
}

export function StatusTag({ status, text, icon }: StatusTagProps) {
  const config: Record<string, { bg: string; fg: string; border: string }> = {
    success: { bg: "#F6FFED", fg: brandColors.success, border: "#B7EB8F" },
    warning: { bg: "#FFFBE6", fg: brandColors.warning, border: "#FFE58F" },
    error: { bg: "#FFF1F0", fg: brandColors.error, border: "#FFA39E" },
    info: { bg: "#E6F4FF", fg: brandColors.info, border: "#91CAFF" },
    processing: { bg: "#E6F4FF", fg: brandColors.info, border: "#91CAFF" },
    default: { bg: "#FAFAFA", fg: brandColors.textSecondary, border: brandColors.border },
  };
  const c = config[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: "20px",
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {text}
    </span>
  );
}
