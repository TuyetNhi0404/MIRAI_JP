import React, { useEffect, useRef, useState, type ReactNode } from "react";
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
  const renderedIcon = resolveIcon(icon, 20);
  return (
    <div
      className="mira-fade-in"
      style={{
        background: brandColors.paper,
        border: bordered ? `1px solid ${brandColors.border}` : "none",
        borderRadius: 12,
        padding: "22px 26px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: brandColors.redSoft,
              color: brandColors.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: `1px solid ${brandColors.redSoft}`,
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
              fontSize: 20,
              fontWeight: 600,
              color: brandColors.textPrimary,
              lineHeight: 1.25,
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block", lineHeight: 1.4 }}>
              {subtitle}
            </Text>
          )}
        </div>
      </div>
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
  onClick?: () => void;
}

const ACCENT_COLORS = {
  primary: { bg: brandColors.redSoft, fg: brandColors.red },
  success: { bg: "#F6FFED", fg: brandColors.success },
  warning: { bg: "#FFFBE6", fg: brandColors.warning },
  info: { bg: "#E6F4FF", fg: brandColors.info },
  neutral: { bg: "#F5F5F5", fg: brandColors.textPrimary },
} as const;

export function StatCard({ label, value, hint, icon, trend, accent = "primary", loading = false, onClick }: StatCardProps) {
  const renderedIcon = resolveIcon(icon);
  const tone = ACCENT_COLORS[accent];
  return (
    <Card
      loading={loading}
      onClick={onClick}
      className={onClick ? "mira-card-hover mira-fade-in-up" : "mira-fade-in-up"}
      style={{
        borderRadius: 12,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        cursor: onClick ? "pointer" : "default",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: brandColors.textSecondary,
              display: "block",
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            {label}
          </Text>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: brandColors.textPrimary,
              lineHeight: 1.15,
              letterSpacing: -0.3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </div>
          {(hint || trend) && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
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
              width: 36,
              height: 36,
              borderRadius: 9,
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
  const renderedIcon = resolveIcon(icon, 26, 1.5);
  return (
    <div
      className="mira-fade-in"
      style={{
        textAlign: "center",
        padding: "64px 24px",
        background: brandColors.paper,
        border: `1px dashed ${brandColors.border}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 14,
          background: brandColors.redSoft,
          color: brandColors.red,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        {renderedIcon}
      </div>
      <Title level={5} style={{ marginBottom: 6, color: brandColors.textPrimary, fontSize: 15, fontWeight: 600 }}>
        {title}
      </Title>
      {description && (
        <Text type="secondary" style={{ display: "block", maxWidth: 380, margin: "0 auto 20px", fontSize: 13 }}>
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
            padding: "9px 18px",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 0 rgba(185, 0, 0, 0.06)",
            transition: "all 200ms ease",
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
    success: { bg: "#F6FFED", fg: "#389E0D", border: "#D9F7BE" },
    warning: { bg: "#FFFBE6", fg: "#D48806", border: "#FFE7BA" },
    error: { bg: "#FFF1F0", fg: "#CF1322", border: "#FFD6D6" },
    info: { bg: "#E6F4FF", fg: "#0958D9", border: "#BAE0FF" },
    processing: { bg: "#E6F4FF", fg: "#0958D9", border: "#BAE0FF" },
    default: { bg: "#FAFAFA", fg: brandColors.textSecondary, border: brandColors.border },
  };
  const c = config[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 999,
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

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CountUp({
  end,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  style,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(end);
      return;
    }

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(end * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [end, duration]);

  const formatted = value.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof React.JSX.IntrinsicElements;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 360,
  y = 8,
  className,
  style,
  as: Tag = "div",
}: FadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const animStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : `translateY(${y}px)`,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    willChange: "opacity, transform",
  };

  return React.createElement(Tag, { className, style: { ...animStyle, ...style } }, children);
}

interface StaggerProps {
  children: ReactNode;
  baseDelay?: number;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Stagger({ children, baseDelay = 0, step = 60, className, style }: StaggerProps) {
  const arr = React.Children.toArray(children);
  return (
    <div className={className} style={style}>
      {arr.map((child, i) => (
        <FadeIn key={i} delay={baseDelay + i * step} y={6}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

interface PulseDotProps {
  color?: string;
  size?: number;
  ringColor?: string;
  style?: React.CSSProperties;
}

export function PulseDot({ color = brandColors.red, size = 8, ringColor, style }: PulseDotProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        position: "relative",
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
          opacity: 0.4,
          animation: "ringPulse 1.8s ease-out infinite",
        }}
      />
    </span>
  );
}

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, circle = false, style }: SkeletonProps) {
  return (
    <div
      className="mira-shimmer"
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : 6,
        ...style,
      }}
    />
  );
}

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  tooltip?: string;
  size?: "small" | "middle" | "large";
  variant?: "ghost" | "filled" | "text";
  danger?: boolean;
  style?: React.CSSProperties;
}

export function IconButton({
  icon,
  onClick,
  tooltip,
  size = "middle",
  variant = "ghost",
  danger = false,
  style,
}: IconButtonProps) {
  const dim = size === "small" ? 28 : size === "large" ? 40 : 34;
  const bg =
    variant === "filled"
      ? danger
        ? brandColors.red
        : brandColors.paper
      : "transparent";
  const color =
    variant === "filled"
      ? variant === "filled" && !danger
        ? brandColors.textPrimary
        : "#fff"
      : danger
        ? brandColors.red
        : brandColors.textSecondary;
  const border =
    variant === "filled" && !danger ? `1px solid ${brandColors.border}` : "1px solid transparent";

  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className="mira-button-hover mira-press"
      style={{
        width: dim,
        height: dim,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color,
        border,
        borderRadius: 8,
        cursor: "pointer",
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
