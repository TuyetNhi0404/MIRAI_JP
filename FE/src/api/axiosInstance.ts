// axiosInstance.ts
import axios from "axios";
import { getStore } from "../redux/storeRef";
import { forceLogout } from "../redux/slices/authSlice";

import { getApiBaseUrl } from "../utils/apiBase";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ✅ BẮT BUỘC để gửi cookies 
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

// Request interceptor 
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ Redux (để support hot-reload) hoặc localStorage
    let token = null;
    try {
      token = getStore().getState().auth.accessToken;
    } catch (e) {
      // Bỏ qua nếu store chưa khởi tạo
    }
    
    if (!token) {
      token = localStorage.getItem("accessToken");
    }

    if (token) {
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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor 
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Xử lý 401 - Token hết hạn
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ✅ Bỏ qua refresh token nếu đang ở trang public hoặc đang gọi refresh-token
      if (originalRequest.url?.includes("/auth/refresh-token")) {
        return handleLogout();
      }

      const currentPath = window.location.pathname;
      const isProtectedRoute = 
        currentPath.startsWith("/dashboard") || 
        currentPath.startsWith("/admin");

      if (!isProtectedRoute) {
        return Promise.reject(error);
      }

      // ✅ Đánh dấu request này đã retry
      originalRequest._retry = true;

      if (isRefreshing) {
        // ✅ Nếu đang refresh, đợi trong queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        // ✅ Gọi API refresh token
        const apiUrl = getApiOrigin();
        let refreshTokenVal = null;
        try {
          refreshTokenVal = getStore().getState().auth.refreshToken;
        } catch(e) {}
        if (!refreshTokenVal) {
          refreshTokenVal = localStorage.getItem("refreshToken");
        }
        
        const response = await axios.post(
          `${apiUrl}/api/auth/refresh-token`,
          { refreshToken: refreshTokenVal },
          {
            withCredentials: true, // Gửi refreshToken cookie
          }
        );

        if (response.data?.accessToken) {
          const newToken = response.data.accessToken;
          // ✅ Lưu token mới vào localStorage và Redux
          localStorage.setItem("accessToken", newToken);
          try {
            getStore().dispatch({ type: 'auth/refreshAccessToken/fulfilled', payload: { accessToken: newToken } });
          } catch (e) {}

          processQueue(null);
          isRefreshing = false;

          // ✅ Gắn token mới vào request bị lỗi
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // ✅ Retry request ban đầu
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // ✅ Refresh token thất bại -> Logout
        processQueue(refreshError);
        isRefreshing = false;
        return handleLogout();
      }
    }

    // ✅ Xử lý 403 - Không có quyền
    if (error.response?.status === 403) {
      console.error("❌ 403 Forbidden");
      const url = error.config?.url || "";
      if (!url.includes("/forum")) {
        alert("Bạn không có quyền truy cập");
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Hàm xử lý logout
function handleLogout() {
  console.error("❌ Session expired - Logging out");
  
  // Clear localStorage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  
  try {
    const store = getStore();
    store.dispatch(forceLogout());
  } catch (e) {
    console.error("Redux dispatch error:", e);
  }
  
  window.location.href = "/";
  
  return Promise.reject(new Error("Session expired"));
}

export default axiosInstance;