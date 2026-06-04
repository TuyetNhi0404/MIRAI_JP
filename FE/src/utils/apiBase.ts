/** API base — same-origin `/api` khi deploy Docker (VITE_API_URL rỗng). */
export function getApiBaseUrl(): string {
  const root = import.meta.env.VITE_API_URL?.trim();
  return root ? `${root.replace(/\/$/, "")}/api` : "/api";
}

export function getApiOrigin(): string {
  const root = import.meta.env.VITE_API_URL?.trim();
  if (root) return root.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5000";
}

export function getWsOrigin(): string {
  const root = import.meta.env.VITE_API_URL?.trim();
  if (root) return root.replace(/^http/, "ws");
  if (typeof window === "undefined") return "ws://localhost:5000";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
