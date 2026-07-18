/**
 * Tokens cho micro-motion trong MIRAI FE.
 * Dùng xuyên suốt 3 page: Admin / Schedule / Assignment / Speaking.
 * Theo nguyên tắc taste-skill §3.B — token-based, reduced-motion friendly.
 */

export const motionEase = {
  /** ease-out, dùng cho entry, bounce mềm */
  outQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** ease-in-out, dùng cho state transitions */
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** snap, dùng cho hover/preview */
  snap: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** spring-like, dùng cho press/release */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const motionDuration = {
  fast: "120ms",
  base: "200ms",
  smooth: "320ms",
  slow: "520ms",
} as const;

export const motionStagger = {
  xs: 0.025,
  sm: 0.045,
  md: 0.07,
  lg: 0.11,
} as const;

export const motionShadow = {
  /** hover lift nhẹ (idempotent) */
  lift: "0 6px 18px -6px rgba(185, 0, 0, 0.18), 0 2px 6px -2px rgba(31, 34, 56, 0.06)",
  /** press nhẹ xuống */
  press: "0 1px 2px 0 rgba(31, 34, 56, 0.08)",
  /** glow halo cho accent CTA */
  glow: "0 0 0 3px rgba(185, 0, 0, 0.16)",
  /** floating card khi hover */
  float: "0 14px 32px -12px rgba(185, 0, 0, 0.22), 0 4px 10px -4px rgba(31, 34, 56, 0.08)",
} as const;
