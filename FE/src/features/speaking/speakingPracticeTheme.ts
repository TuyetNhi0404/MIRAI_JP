/** Design tokens — Soft UI + Mirai brand (ui-ux-pro-max: WCAG AA, 200–300ms transitions) */
export const sp = {
  brand: "#B90000",
  brandMid: "#c83c3c",
  brandLight: "#ff6b6b",
  orb: "#fa9d9d",
  surface: "#FFFBFB",
  surfaceMuted: "#F8F4F4",
  border: "rgba(185, 0, 0, 0.1)",
  borderStrong: "rgba(185, 0, 0, 0.18)",
  text: "#1a1a1a",
  textMuted: "#5c5c5c",
  textSoft: "#6b7280",
  success: "#16a34a",
  shadowSm: "0 1px 3px rgba(26, 26, 26, 0.06)",
  shadowMd: "0 4px 20px rgba(185, 0, 0, 0.08)",
  shadowLg: "0 8px 32px rgba(185, 0, 0, 0.1)",
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 20,
  radiusPill: 999,
  transition: "all 0.22s cubic-bezier(0.4, 0, 0.2,  1)",
  focusRing: "0 0 0 3px rgba(185, 0, 0, 0.22)",
} as const;

export const LEVELS = [
  { value: "N5", label: "N5 · Sơ cấp" },
  { value: "N4", label: "N4 · Sơ trung" },
  { value: "N3", label: "N3 · Trung cấp" },
  { value: "N2", label: "N2 · Trung cao" },
  { value: "N1", label: "N1 · Cao cấp" },
] as const;
