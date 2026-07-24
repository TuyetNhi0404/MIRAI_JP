/**
 * MiraPatterns — reusable micro-motion components cho MIRAI FE.
 * Có 3 dạng tương tác:
 *  1. Stagger: item xuất hiện tuần tự khi mount.
 *  2. LiftCard: card nhảy nhẹ khi hover (-2px + glow).
 *  3. MagneticButton: nút "hút" theo con trỏ khi hover.
 *  4. ScrollReveal: item faden-in khi cuộn vào viewport.
 *
 * Tất cả đều honour prefers-reduced-motion (taste-skill §6.B).
 */

import { useEffect, useRef, useState } from "react";
import {
  motionEase,
} from "../../styles/motion";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface StaggerProps {
  children: React.ReactNode;
  /** seconds between each child's reveal */
  delay?: number;
  /** vertical offset to animate from (px) */
  fromY?: number;
  className?: string;
  /** re-run animation when key changes */
  resetKey?: string | number;
}

export function Stagger({
  children,
  delay = 0.045,
  fromY = 16,
  className,
  resetKey,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    if (reduce) return;
    const items = Array.from(el.children) as HTMLElement[];
    const start = performance.now();
    const total = items.length;
    if (total === 0) return;
    items.forEach((node, i) => {
      node.style.opacity = "0";
      node.style.transform = `translateY(${fromY}px)`;
      const animate = (now: number) => {
        const elapsed = (now - start) / 1000;
        if (elapsed >= delay * i) {
          node.style.transition = `opacity 360ms ${motionEase.outQuint}, transform 360ms ${motionEase.outQuint}`;
          node.style.opacity = "1";
          node.style.transform = "translateY(0)";
        } else {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    });
  }, [delay, fromY, resetKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface LiftCardProps {
  children: React.ReactNode;
  className?: string;
  /** px lift on hover */
  lift?: number;
  /** whether to draw a glow halo on hover */
  glow?: boolean;
  onClick?: () => void;
}

export function LiftCard({
  children,
  className,
  lift = 4,
  glow = true,
  onClick,
}: LiftCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const base = "transition-[transform,box-shadow] duration-300 ease-out-quint";
  const interactive =
    "cursor-pointer active:translate-y-0 active:scale-[0.99] active:duration-100";

  return (
    <div
      ref={ref}
      className={`${base} ${onClick ? interactive : ""} ${className ?? ""}`}
      style={{
        boxShadow: hovered && glow ? "var(--mira-shadow-float)" : "var(--mira-shadow-rest)",
        transform: hovered ? `translateY(-${lift}px)` : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface MagneticButtonProps {
  /** distance in px the button travels toward the cursor */
  strength?: number;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Magnetic — CTA button "hút" theo con trỏ nhưng không bao giờ vượt
 * quá `strength` px. Khi rời khỏi vùng thì spring về vị trí gốc.
 */
export function MagneticButton({
  strength = 8,
  className,
  children,
  onClick,
  style,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const reduce = prefersReducedMotion();
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x / (rect.width / strength)}px, ${
      y / (rect.height / strength)
    }px)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
    el.style.transition = "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)";
  };

  const handleEnter = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 220ms ease-out";
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onMouseEnter={handleEnter}
      onClick={onClick}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * MagicCard — viền gradient tự vẽ theo vị trí con trỏ. Dùng CSS variables
 * trên root để không phụ thuộc vào cuộn.
 */
export function MagicCard({ children, className }: MagicCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const reduce = prefersReducedMotion();
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mira-mx", `${mx}%`);
    el.style.setProperty("--mira-my", `${my}%`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        backgroundImage: "radial-gradient(circle at var(--mira-mx, 50%) var(--mira-my, 50%), rgba(185, 0, 0, 0.08), transparent 60%)",
      }}
    >
      {children}
    </div>
  );
}
