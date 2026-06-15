import axiosInstance from '../api/axiosInstance';
import type { ListeningContent } from '../features/listening/types';

export interface ListeningListResponse {
  contents: ListeningContent[];
  total: number;
  page: number;
  limit: number;
}

export interface ListeningFilterParams {
  topic?: string;
  level?: string;
  page?: number;
  limit?: number;
}

export interface ListeningContentPayload {
  title: string;
  description?: string;
  topic: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  audioSource: 'upload' | 'tts';
  audioUrl?: string;
  transcript?: string;
  isPublished?: boolean;
}

export const listeningService = {
  getAll: async (params?: ListeningFilterParams): Promise<ListeningListResponse> => {
    const response = await axiosInstance.get('/listening/contents', { params });
    const data = response.data;
    if (data && data.contents) {
      return data;
    }
    return {
      contents: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
      page: 1,
      limit: 10,
    };
  },

  getById: async (id: string): Promise<ListeningContent> => {
    const response = await axiosInstance.get(`/listening/contents/${id}`);
    return response.data;
  },

  create: async (data: ListeningContentPayload): Promise<ListeningContent> => {
    const response = await axiosInstance.post('/listening/contents', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ListeningContentPayload>): Promise<ListeningContent> => {
    const response = await axiosInstance.patch(`/listening/contents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/listening/contents/${id}`);
  },

  uploadAudio: async (id: string, audioFile: File): Promise<{ audioUrl: string }> => {
    const formData = new FormData();
    formData.append('audio', audioFile, audioFile.name);
    const response = await axiosInstance.post(
      `/listening/contents/${id}/upload-audio`,
      formData,
      {
        headers: { 'Content-Type': undefined },
        timeout: 120000,
      }
    );
    return response.data;
  },
};

export default listeningService;
