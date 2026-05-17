// axiosConfig.ts
import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
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
  withCredentials: true,
});

// Request interceptor 
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor 
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const store = getStore();
      const currentPath = window.location.pathname;
      
      if (currentPath.startsWith("/dashboard") || currentPath.startsWith("/admin")) {
        console.error("❌ 401 Unauthorized");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
        Cookies.remove("user");
        
        try {
          store.dispatch(forceLogout());
        } catch (e) {
          console.error("Redux dispatch error:", e);
        }
        window.location.href = "/";
      }
    }
    
    if (error.response?.status === 403) {
      console.error("❌ 403 Forbidden");
      alert("Bạn không có quyền truy cập");
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;