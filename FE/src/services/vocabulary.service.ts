import axiosInstance from "../api/axiosInstance";

export interface IVocabulary {
  _id: string;
  word: string;
  reading: string;
  meaning: string;
  level: "N1" | "N2" | "N3" | "N4" | "N5";
  topic: string;
  example?: string;
  exampleMeaning?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VocabularyFilter {
  level?: string;
  topic?: string;
  search?: string;
}

export interface ImportResult {
  message: string;
  created: number;
  updated: number;
  errors: string[];
}

const BASE = "/vocabulary";

export const vocabularyService = {
  // ─── GET ALL ──────────────────────────────────────────────────────────────
  getAll: async (
    filter: VocabularyFilter = {}
  ): Promise<{ data: IVocabulary[]; total: number }> => {
    const params: Record<string, string> = {};
    if (filter.level) params.level = filter.level;
    if (filter.topic) params.topic = filter.topic;
    if (filter.search) params.search = filter.search;
    const res = await axiosInstance.get(BASE, { params });
    return res.data;
  },

  // ─── GET BY ID ───────────────────────────────────────────────────────────
  getById: async (id: string): Promise<IVocabulary> => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data;
  },

  // ─── GET TOPICS ──────────────────────────────────────────────────────────
  getTopics: async (level?: string): Promise<string[]> => {
    const params: Record<string, string> = {};
    if (level) params.level = level;
    const res = await axiosInstance.get(`${BASE}/topics`, { params });
    return res.data.topics;
  },

  // ─── GET LEVELS ──────────────────────────────────────────────────────────
  getLevels: async (): Promise<string[]> => {
    const res = await axiosInstance.get(`${BASE}/levels`);
    return res.data.levels;
  },

  // ─── GET STATS ───────────────────────────────────────────────────────────
  getStats: async () => {
    const res = await axiosInstance.get(`${BASE}/stats`);
    return res.data;
  },

  // ─── CREATE ──────────────────────────────────────────────────────────────
  create: async (data: Omit<IVocabulary, "_id">): Promise<IVocabulary> => {
    const res = await axiosInstance.post(BASE, data);
    return res.data;
  },

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update: async (
    id: string,
    data: Partial<IVocabulary>
  ): Promise<IVocabulary> => {
    const res = await axiosInstance.put(`${BASE}/${id}`, data);
    return res.data;
  },

  // ─── DELETE ──────────────────────────────────────────────────────────────
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
  },

  // ─── EXPORT EXCEL ────────────────────────────────────────────────────────
  exportExcel: async (filter: VocabularyFilter = {}): Promise<void> => {
    const params: Record<string, string> = {};
    if (filter.level) params.level = filter.level;
    if (filter.topic) params.topic = filter.topic;

    const res = await axiosInstance.get(`${BASE}/export`, {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const disposition = res.headers["content-disposition"];
    let filename = "vocabulary.xlsx";
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) filename = decodeURIComponent(match[1]);
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── IMPORT EXCEL ────────────────────────────────────────────────────────
  importExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosInstance.post(`${BASE}/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
