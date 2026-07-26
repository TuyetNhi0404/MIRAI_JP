import axiosInstance from "../api/axiosInstance";
import axios, { AxiosError } from "axios";
import type { RequestSchedule } from "../types/requestSchedule.types";

const api = axiosInstance;

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