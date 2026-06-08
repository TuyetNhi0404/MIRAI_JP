import axios from "axios";
import { getStore } from "../../redux/storeRef";
import { getApiBaseUrl } from "../../utils/apiBase";

/** Axios riêng cho speaking — timeout dài (Whisper CPU có thể >30s). */
const speakingApi = axios.create({
  baseURL: getApiBaseUrl(),
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

function extractApiMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail) && d.detail[0] && typeof d.detail[0] === "object") {
    const first = d.detail[0] as { msg?: string };
    if (first.msg) return first.msg;
  }
  return undefined;
}

export function getSpeakingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const msg = extractApiMessage(error.response?.data);
    if (status === 401) return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
    if (status === 503) return msg || "Dịch vụ luyện giọng chưa chạy (port 8000).";
    if (status === 404) return "API speaking chưa bật trên BE (ENABLE_SPEAKING_PRACTICE).";
    if (error.code === "ECONNABORTED") return "Hết thời gian chờ. Lần đầu load model Whisper có thể mất 1–2 phút, thử lại.";
    if (error.code === "ERR_NETWORK") {
      return "Không kết nối được API speaking. Kiểm tra container backend và ocr đang chạy.";
    }
    if (msg) return msg;
    if (status) return `Lỗi server (${status}).`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Không thể kết nối dịch vụ luyện giọng.";
}

export default speakingApi;
