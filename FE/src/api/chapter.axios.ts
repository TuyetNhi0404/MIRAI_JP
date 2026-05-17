// src/api/chapter.axios.ts
import axiosInstance from "./axiosInstance";
import type {
  Chapter,
  CreateChapterRequest,
  UpdateChapterRequest,
  ChapterListResponse,
} from "../types/chapter.types";

export const chapterApi = {
  getAllChapters: () =>
    axiosInstance.get<ChapterListResponse>("/chapters"),

  createChapter: (data: CreateChapterRequest) =>
    axiosInstance.post<{ message: string; chapter: Chapter }>("/chapters", data),

  updateChapter: (id: string, data: UpdateChapterRequest) =>
    axiosInstance.put<{ message: string; chapter: Chapter }>(`/chapters/${id}`, data),

  deleteChapter: (id: string) =>
    axiosInstance.delete<{ message: string }>(`/chapters/${id}`),
};