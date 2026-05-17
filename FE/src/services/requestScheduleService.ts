import axios, { AxiosError } from "axios";
import type { RequestSchedule } from "../types/requestSchedule.types";

const API_BASE_URL = "http://localhost:5000/api";

interface RefreshConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 
    "Content-Type": "application/json"
  },
});

api.interceptors.request.use(
  (config) => {
    console.log('Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & RefreshConfig;
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log('Token expired, trying to refresh...');
        await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        console.log('Token refreshed, retrying original request');
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed, redirecting to login');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const requestScheduleService = {
  getAllRequests: async (status?: string): Promise<RequestSchedule[]> => {
    try {
      const params = status ? { status } : {};
      console.log("Fetching all requests with params:", params);
      
      const response = await api.get<RequestSchedule[]>("/request-schedules", { params });
      console.log("Requests fetched:", response.data);
      
      return response.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("getAllRequests error:", error.response?.data || error.message);
      } else {
        console.error("getAllRequests error:", error);
      }
      throw error;
    }
  },

  acceptRequest: async (requestId: string): Promise<RequestSchedule> => {
    try {
      console.log("Accepting request:", requestId);
      
      const response = await api.patch<RequestSchedule>(`/request-schedules/${requestId}/accept`);
      console.log("Request accepted:", response.data);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("acceptRequest error:", error.response?.data || error.message);
      } else {
        console.error("acceptRequest error:", error);
      }
      throw error;
    }
  },

  rejectRequest: async (requestId: string): Promise<RequestSchedule> => {
    try {
      console.log("Rejecting request:", requestId);
      
      const response = await api.patch<RequestSchedule>(`/request-schedules/${requestId}/reject`);
      console.log("Request rejected:", response.data);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("rejectRequest error:", error.response?.data || error.message);
      } else {
        console.error("rejectRequest error:", error);
      }
      throw error;
    }
  },
};

export default requestScheduleService;