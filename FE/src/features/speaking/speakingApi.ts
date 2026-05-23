import axios from "axios";
import { getStore } from "../../redux/storeRef";

/** Axios riêng cho speaking — timeout dài (Whisper CPU có thể >30s). */
const speakingApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5000/api",
  timeout: 120000,
  withCredentials: true,
});

speakingApi.interceptors.request.use((config) => {
  let token: string | null = null;
  try {
    token = getStore().getState().auth.accessToken;
  } catch {
    // store chưa sẵn sàng
  }
  if (!token) {
    token = localStorage.getItem("accessToken");
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete (config.headers as Record<string, string>)["Content-Type"];
    }
  }
  return config;
});

export function getSpeakingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const msg = error.response?.data?.message as string | undefined;
    if (status === 401) return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
    if (status === 503) return msg || "Dịch vụ luyện giọng chưa chạy (port 8000).";
    if (status === 404) return "API speaking chưa bật trên BE (ENABLE_SPEAKING_PRACTICE).";
    if (error.code === "ECONNABORTED") return "Hết thời gian chờ — lần đầu load model Whisper có thể mất 1–2 phút, thử lại.";
    if (msg) return msg;
    if (status) return `Lỗi server (${status}).`;
  }
  return "Không thể kết nối dịch vụ luyện giọng.";
}

export default speakingApi;
