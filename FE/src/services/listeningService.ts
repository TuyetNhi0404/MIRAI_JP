import axiosInstance from '../api/axiosInstance';
import type { ListeningContent } from '../features/listening/types';

// Response từ GET /api/listening/contents (có phân trang)
export interface ListeningListResponse {
  contents: ListeningContent[];
  total: number;
  page: number;
  limit: number;
}

// Params lọc danh sách
export interface ListeningFilterParams {
  topic?: string;
  level?: string;
  page?: number;
  limit?: number;
}

// Payload tạo/cập nhật bài nghe (không có exercises, Admin không quản lý)
export interface ListeningContentPayload {
  title: string;
  description?: string;
  topic: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  audioSource: 'upload' | 'tts';
  audioUrl?: string;
  transcript?: string;
}

// Payload submit bài làm của Student
export interface SubmitAnswerPayload {
  answers: {
    exerciseId: string;
    studentAnswer: string | string[]; // quiz: 'A'/'B'/'C'/'D' | fill_blank: string[] | dictation: string
  }[];
  timeSpent?: number;
}

// Response từ POST /api/listening/contents/:id/submit
export interface SubmitResult {
  _id?: string;
  studentId: string;
  contentId: string;
  answers: Array<{
    exerciseId: string;
    studentAnswer: string;
    isCorrect: boolean;
    score: number;
  }>;
  totalScore: number;
  maxScore: number;
  timeSpent: number;
  createdAt?: string;
}

export const listeningService = {
  // GET /api/listening/contents
  getAll: async (params?: ListeningFilterParams): Promise<ListeningListResponse> => {
    const response = await axiosInstance.get('/listening/contents', { params });
    // Dữ liệu trả về có dạng { contents, total, page, limit } hoặc được bọc trong data field
    // Để an toàn, hỗ trợ cả 2 dạng: response.data.contents hoặc response.data trực tiếp
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

  // GET /api/listening/contents/:id
  getById: async (id: string): Promise<ListeningContent> => {
    const response = await axiosInstance.get(`/listening/contents/${id}`);
    return response.data;
  },

  // POST /api/listening/contents
  create: async (data: ListeningContentPayload): Promise<ListeningContent> => {
    const response = await axiosInstance.post('/listening/contents', data);
    return response.data;
  },

  // PATCH /api/listening/contents/:id
  update: async (id: string, data: Partial<ListeningContentPayload>): Promise<ListeningContent> => {
    const response = await axiosInstance.patch(`/listening/contents/${id}`, data);
    return response.data;
  },

  // DELETE /api/listening/contents/:id
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/listening/contents/${id}`);
  },

  // POST /api/listening/contents/:id/upload-audio
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

  // POST /api/listening/contents/:id/submit
  submit: async (id: string, payload: SubmitAnswerPayload): Promise<SubmitResult> => {
    const response = await axiosInstance.post(`/listening/contents/${id}/submit`, payload);
    return response.data;
  },
};

export default listeningService;
