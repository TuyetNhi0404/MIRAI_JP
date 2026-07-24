import axiosInstance from "../api/axiosInstance";

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export type GrammarDocumentScope = "private" | "shared";

export interface IGrammarDocument {
  _id: string;
  title: string;
  filePath: string;
  centerId: string;
  level: JLPTLevel;
  status: "processing" | "completed" | "failed";
  totalPages: number;
  scope: GrammarDocumentScope;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
  chunkCount?: number;
}

export interface IGrammarDocumentStatus {
  _id: string;
  title: string;
  status: "processing" | "completed" | "failed";
  level: JLPTLevel;
  centerId: string;
  scope: GrammarDocumentScope;
  totalPages: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
}

export interface IGrammarCardExample {
  japanese: string;
  furigana: string;
  vietnamese: string;
}

export interface IGrammarCard {
  _id: string;
  centerId: string;
  level: JLPTLevel;
  title: string;
  structure: string;
  meaningVi: string;
  explanation: string;
  examples: IGrammarCardExample[];
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IGeneratedQuestion {
  grammarCardId: string;
  questionText: string;
  correctAnswer: number;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
}

export interface IQuizAttempt {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  score: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  completedAt: string;
}

// ─── Phase 6: shared filter types ──────────────────────────────────────────
export type DateRangePreset = "today" | "7d" | "30d" | "custom" | "all";

export interface IDateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "title";
  order?: "asc" | "desc";
}

export interface IGrammarCardFilter extends IDateRangeFilter {
  centerId?: string;
  level?: JLPTLevel;
  search?: string;
}

export interface IGrammarDocumentFilter extends IDateRangeFilter {
  centerId?: string;
  level?: JLPTLevel;
}

const BASE = "/grammar";

export const grammarService = {
  // ─── UPLOAD & OCR DOCUMENT (Phase 5: admin + teacher) ──────────────────────
  uploadDocument: async (
    file: File,
    title: string,
    centerId: string,
    level: JLPTLevel,
    scope?: GrammarDocumentScope
  ): Promise<{ success: boolean; message: string; document: IGrammarDocument }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("centerId", centerId);
    formData.append("level", level);
    if (scope) formData.append("scope", scope);

    const res = await axiosInstance.post(`${BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  // ─── GET DOCUMENTS (Phase 5: role-aware, Phase 6: date filter) ────────────
  getDocuments: async (
    filter?: IGrammarDocumentFilter
  ): Promise<{ success: boolean; count: number; documents: IGrammarDocument[] }> => {
    const res = await axiosInstance.get(`${BASE}/documents`, { params: filter });
    return res.data;
  },

  // ─── Phase 5: GET STATUS ──────────────────────────────────────────────────
  getDocumentStatus: async (id: string): Promise<{ success: boolean; document: IGrammarDocumentStatus }> => {
    const res = await axiosInstance.get(`${BASE}/documents/${id}/status`);
    return res.data;
  },

  // ─── DELETE DOCUMENT (Phase 5: teacher chỉ xóa của mình) ─────────────────
  deleteDocument: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/documents/${id}`);
  },

  // ─── RAG - GENERATE DRAFT CARDS (Phase 5: documentId optional) ────────────
  generateDraftCards: async (
    centerId: string,
    level: JLPTLevel,
    topic: string,
    documentId?: string
  ): Promise<{
    success: boolean;
    documentId: string | null;
    contextChunksFound: number;
    draftCards: Omit<IGrammarCard, "_id">[];
  }> => {
    const res = await axiosInstance.post(`${BASE}/cards/generate-draft`, {
      centerId,
      level,
      topic,
      documentId,
    });
    return res.data;
  },

  // ─── CRUD CARDS (Phase 6: date filter + sort) ────────────────────────────
  getGrammarCards: async (
    filter?: IGrammarCardFilter
  ): Promise<{ success: boolean; count: number; cards: IGrammarCard[] }> => {
    const res = await axiosInstance.get(`${BASE}/cards`, { params: filter });
    return res.data;
  },

  createGrammarCard: async (card: Omit<IGrammarCard, "_id" | "createdBy">): Promise<{ success: boolean; card: IGrammarCard }> => {
    const res = await axiosInstance.post(`${BASE}/cards`, card);
    return res.data;
  },

  updateGrammarCard: async (id: string, card: Partial<IGrammarCard>): Promise<{ success: boolean; card: IGrammarCard }> => {
    const res = await axiosInstance.put(`${BASE}/cards/${id}`, card);
    return res.data;
  },

  deleteGrammarCard: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/cards/${id}`);
  },

  deleteGrammarCardsBatch: async (ids: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const res = await axiosInstance.post(`${BASE}/cards/batch-delete`, { ids });
    return res.data;
  },

  // ─── STUDENT: GET PRACTICE CARDS ──────────────────────────────────────────
  getStudentPracticeCards: async (): Promise<{ success: boolean; levels: string[]; cards: IGrammarCard[] }> => {
    const res = await axiosInstance.get(`${BASE}/student/practice`);
    return res.data;
  },

  // ─── TEACHER: FETCH EXISTING QUESTIONS (0đ AI) ─────────────────────────
  fetchExistingQuestions: async (grammarCardIds: string[]): Promise<{ success: boolean; questions: IGeneratedQuestion[] }> => {
    const res = await axiosInstance.post(`${BASE}/teacher/quiz/existing-questions`, { grammarCardIds });
    return res.data;
  },

  // ─── TEACHER: AUTO GENERATE MCQ QUESTIONS ─────────────────────────────────
  generateQuizQuestions: async (grammarCardIds: string[], numQuestions = 5): Promise<{ success: boolean; questions: IGeneratedQuestion[] }> => {
    const res = await axiosInstance.post(`${BASE}/teacher/quiz/generate-questions`, { grammarCardIds, numQuestions });
    return res.data;
  },

  // ─── TEACHER: GET ALL GRAMMAR QUESTIONS FOR QUESTION BANK ──────────────────
  getGrammarQuestionsBank: async (params?: { level?: string; search?: string }): Promise<{ success: boolean; questions: any[] }> => {
    const res = await axiosInstance.get(`/questions/grammar-questions`, { params });
    return res.data;
  },

  // ─── TEACHER: SAVE QUIZ TO COURSE ─────────────────────────────────────────
  createQuiz: async (payload: { courseId: string; title: string; durationMinutes?: number; dueDate?: string; questions: IGeneratedQuestion[] }): Promise<{ success: boolean; quizId: string }> => {
    const res = await axiosInstance.post(`${BASE}/teacher/quiz/create`, payload);
    return res.data;
  },

  // ─── TEACHER: GET QUIZ ATTEMPTS ───────────────────────────────────────────
  getQuizAttempts: async (quizId: string): Promise<{ success: boolean; attempts: IQuizAttempt[] }> => {
    const res = await axiosInstance.get(`${BASE}/teacher/quiz/${quizId}/attempts`);
    return res.data;
  },
};
