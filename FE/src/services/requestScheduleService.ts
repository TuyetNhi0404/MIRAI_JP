import axios, { AxiosError } from "axios";
import type { RequestSchedule } from "../types/requestSchedule.types";
import { getApiBaseUrl } from "../utils/apiBase";

const API_BASE_URL = getApiBaseUrl();

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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & RefreshConfig;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch (refreshError) {
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
      const response = await api.get<RequestSchedule[]>("/request-schedules", { params });
      return response.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        const message = typeof data === "string" ? data : (data as { message?: string })?.message ?? error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  acceptRequest: async (requestId: string): Promise<RequestSchedule> => {
    const response = await api.patch<RequestSchedule>(`/request-schedules/${requestId}/accept`);
    return response.data;
  },

  rejectRequest: async (requestId: string): Promise<RequestSchedule> => {
    const response = await api.patch<RequestSchedule>(`/request-schedules/${requestId}/reject`);
    return response.data;
  },
};

export default requestScheduleService;