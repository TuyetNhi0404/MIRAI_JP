// axiosInstance.ts
import axios from "axios";
import { getStore } from "../redux/storeRef";
import { forceLogout } from "../redux/slices/authSlice";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : "http://localhost:5000/api",
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
    // ✅ Lấy token từ cookie thay vì localStorage 
    const token = Cookies.get("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh-token`,
          {},
          {
            withCredentials: true, // Gửi refreshToken cookie
          }
        );

        if (response.data?.accessToken) {
          // ✅ Token mới đã được lưu vào cookie từ BE
          processQueue(null);
          isRefreshing = false;

          // ✅ Retry request ban đầu với token mới
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
  
  const store = getStore();
  
  // Clear cookies
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
  Cookies.remove("user");
  
  try {
    store.dispatch(forceLogout());
  } catch (e) {
    console.error("Redux dispatch error:", e);
  }
  
  window.location.href = "/";
  
  return Promise.reject(new Error("Session expired"));
}

export default axiosInstance;