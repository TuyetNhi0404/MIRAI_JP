import { getApiOrigin, getWsOrigin } from "../../utils/apiBase";

export const isSpeakingPracticeEnabled =
  import.meta.env.VITE_ENABLE_SPEAKING_PRACTICE === "true";

export function speakingApiPath(path: string): string {
  return `speaking${path.startsWith("/") ? path : `/${path}`}`;
}

export function speakingAudioUrl(relativePath: string): string {
  const base = getApiOrigin();
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}/api/speaking${normalized}`;
}

export function speakingWebSocketUrl(): string {
  const wsBase = getWsOrigin();
  const token = localStorage.getItem("accessToken");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}/api/speaking/stream${suffix}`;
}
