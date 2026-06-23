// axiosInstance.ts
import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getStore } from "../redux/storeRef";
import { forceLogout } from "../redux/slices/authSlice";
import { getApiBaseUrl, getApiOrigin } from "../utils/apiBase";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ✅ Biến để tránh gọi refresh token nhiều lần cùng lúc
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor - Đọc token từ Redux Store hoặc localStorage
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token: string | null = null;
    try {
      token = getStore().getState().auth.accessToken;
    } catch (e) {
      // Store chưa khởi tạo
    }
    if (!token) {
      token = localStorage.getItem("accessToken");
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // FormData must not use application/json — browser/axios needs multipart boundary
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else if (config.headers) {
        delete (config.headers as Record<string, string>)["Content-Type"];
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý 401 bằng refresh token thay vì force logout
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Bỏ qua nếu đang gọi refresh-token hoặc login/register
      if (
        originalRequest.url?.includes("/auth/refresh-token") ||
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register") ||
        originalRequest.url?.includes("/auth/google")
      ) {
        return Promise.reject(error);
      }

      const currentPath = window.location.pathname;
      const isProtectedRoute =
        currentPath.startsWith("/dashboard") ||
        currentPath.startsWith("/admin");

      if (!isProtectedRoute) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const apiUrl = getApiOrigin();
        let refreshTokenVal: string | null = null;
        try {
          refreshTokenVal = getStore().getState().auth.refreshToken;
        } catch (e) {}
        if (!refreshTokenVal) {
          refreshTokenVal = localStorage.getItem("refreshToken");
        }

        const response = await axios.post(
          `${apiUrl}/api/auth/refresh-token`,
          { refreshToken: refreshTokenVal },
          { withCredentials: true }
        );

        if (response.data?.accessToken) {
          const newToken = response.data.accessToken;
          localStorage.setItem("accessToken", newToken);
          try {
            getStore().dispatch({
              type: "auth/refreshAccessToken/fulfilled",
              payload: { accessToken: newToken },
            });
          } catch (e) {}

          processQueue(null);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Refresh thất bại → force logout
        console.error("❌ Session expired - Logging out");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        try {
          getStore().dispatch(forceLogout());
        } catch (e) {
          console.error("Redux dispatch error:", e);
        }
        window.location.href = "/";
        return Promise.reject(new Error("Session expired"));
      }
    }

    if (error.response?.status === 403) {
      console.error("❌ 403 Forbidden");
      const url = (error.config as any)?.url || "";
      if (!url.includes("/forum")) {
        alert("Bạn không có quyền truy cập");
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;