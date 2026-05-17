// src/axios/question.axios.ts
import axiosInstance from "./axiosInstance";
import type { IChapter, IQuestion, CreateChapterPayload, UpdateChapterPayload, CreateQuestionPayload, UpdateQuestionPayload } from "../types/question.types";

// ========== CHAPTER APIs ==========
export const getChapters = async (): Promise<IChapter[]> => {
  const response = await axiosInstance.get("/chapters");
  return response.data.chapters;
};

export const createChapter = async (payload: CreateChapterPayload): Promise<IChapter> => {
  const response = await axiosInstance.post("/chapters", payload);
  return response.data.chapter;
};

export const updateChapter = async (id: string, payload: UpdateChapterPayload): Promise<IChapter> => {
  const response = await axiosInstance.put(`/chapters/${id}`, payload);
  return response.data.chapter;
};

export const deleteChapter = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/chapters/${id}`);
};

// ========== QUESTION APIs ==========
export const getQuestionsByChapter = async (chapterId: string): Promise<IQuestion[]> => {
  const response = await axiosInstance.get(`/questions/chapter/${chapterId}`);
  return response.data.questions;
};

export const createQuestion = async (payload: CreateQuestionPayload): Promise<IQuestion> => {
  const response = await axiosInstance.post("/questions", payload);
  return response.data.question;
};

export const updateQuestion = async (id: string, payload: UpdateQuestionPayload): Promise<IQuestion> => {
  const response = await axiosInstance.put(`/questions/${id}`, payload);
  return response.data.question;
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/questions/${id}`);
};

export const uploadQuestionsExcel = async (chapterId: string, file: File): Promise<{ count: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("chapterId", chapterId);
  
  const response = await axiosInstance.post("/questions/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};