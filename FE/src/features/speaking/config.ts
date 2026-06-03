export const isSpeakingPracticeEnabled =
  import.meta.env.VITE_ENABLE_SPEAKING_PRACTICE === "true";

export function speakingApiPath(path: string): string {
  return `speaking${path.startsWith("/") ? path : `/${path}`}`;
}

export function speakingAudioUrl(relativePath: string): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}/api/speaking${normalized}`;
}

export function speakingWebSocketUrl(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const wsBase = base.replace(/^http/, "ws");
  const token = localStorage.getItem("accessToken");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}/api/speaking/stream${suffix}`;
}
