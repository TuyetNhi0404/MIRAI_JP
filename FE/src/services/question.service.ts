// src/services/question.service.ts
import * as questionAxios from "../api/question.axios";
import type { IChapter, IQuestion, CreateChapterPayload, UpdateChapterPayload, CreateQuestionPayload, UpdateQuestionPayload } from "../types/question.types";

class QuestionService {
  // ========== CHAPTER SERVICES ==========
  async getAllChapters(): Promise<IChapter[]> {
    try {
      return await questionAxios.getChapters();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to fetch chapters");
    }
  }

  async createChapter(payload: CreateChapterPayload): Promise<IChapter> {
    try {
      return await questionAxios.createChapter(payload);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to create chapter");
    }
  }

  async updateChapter(id: string, payload: UpdateChapterPayload): Promise<IChapter> {
    try {
      return await questionAxios.updateChapter(id, payload);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to update chapter");
    }
  }

  async deleteChapter(id: string): Promise<void> {
    try {
      await questionAxios.deleteChapter(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to delete chapter");
    }
  }

  // ========== QUESTION SERVICES ==========
  async getQuestionsByChapter(chapterId: string): Promise<IQuestion[]> {
    try {
      return await questionAxios.getQuestionsByChapter(chapterId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to fetch questions");
    }
  }

  async createQuestion(payload: CreateQuestionPayload): Promise<IQuestion> {
    try {
      return await questionAxios.createQuestion(payload);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to create question");
    }
  }

  async updateQuestion(id: string, payload: UpdateQuestionPayload): Promise<IQuestion> {
    try {
      return await questionAxios.updateQuestion(id, payload);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to update question");
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      await questionAxios.deleteQuestion(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to delete question");
    }
  }

  async uploadQuestionsExcel(chapterId: string, file: File): Promise<{ count: number }> {
    try {
      return await questionAxios.uploadQuestionsExcel(chapterId, file);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err?.response?.data?.message || "Failed to upload questions");
    }
  }
}

export default new QuestionService();