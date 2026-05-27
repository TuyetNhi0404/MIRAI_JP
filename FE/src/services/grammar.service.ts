import axiosInstance from "../api/axiosInstance";

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface IGrammarDocument {
  _id: string;
  title: string;
  filePath: string;
  centerId: string;
  level: JLPTLevel;
  status: "processing" | "completed" | "failed";
  totalPages: number;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
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

const BASE = "/grammar";

export const grammarService = {
  // ─── ADMIN: UPLOAD & OCR DOCUMENT ──────────────────────────────────────────
  uploadDocument: async (file: File, title: string, centerId: string, level: JLPTLevel): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("centerId", centerId);
    formData.append("level", level);
    
    const res = await axiosInstance.post(`${BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  // ─── ADMIN: GET ALL DOCUMENTS ──────────────────────────────────────────────
  getDocuments: async (filter?: { centerId?: string; level?: JLPTLevel }): Promise<{ success: boolean; documents: IGrammarDocument[] }> => {
    const res = await axiosInstance.get(`${BASE}/documents`, { params: filter });
    return res.data;
  },

  // ─── ADMIN: DELETE DOCUMENT ────────────────────────────────────────────────
  deleteDocument: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/documents/${id}`);
  },

  // ─── ADMIN: RAG - GENERATE DRAFT CARDS ──────────────────────────────────────
  generateDraftCards: async (centerId: string, level: JLPTLevel, topic: string): Promise<{ success: boolean; draftCards: Omit<IGrammarCard, "_id">[] }> => {
    const res = await axiosInstance.post(`${BASE}/cards/generate-draft`, { centerId, level, topic });
    return res.data;
  },

  // ─── ADMIN: CRUD CARDS ──────────────────────────────────────────────────────
  getGrammarCards: async (filter?: { centerId?: string; level?: JLPTLevel; search?: string }): Promise<{ success: boolean; cards: IGrammarCard[] }> => {
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

  // ─── STUDENT: GET PRACTICE CARDS ───────────────────────────────────────────
  getStudentPracticeCards: async (): Promise<{ success: boolean; levels: string[]; cards: IGrammarCard[] }> => {
    const res = await axiosInstance.get(`${BASE}/student/practice`);
    return res.data;
  },

  // ─── TEACHER: AUTO GENERATE MCQ QUESTIONS ──────────────────────────────────
  generateQuizQuestions: async (grammarCardIds: string[], numQuestions = 5): Promise<{ success: boolean; questions: IGeneratedQuestion[] }> => {
    const res = await axiosInstance.post(`${BASE}/teacher/quiz/generate-questions`, { grammarCardIds, numQuestions });
    return res.data;
  },

  // ─── TEACHER: SAVE QUIZ TO COURSE ──────────────────────────────────────────
  createQuiz: async (payload: { courseId: string; title: string; durationMinutes?: number; questions: IGeneratedQuestion[] }): Promise<{ success: boolean; quizId: string }> => {
    const res = await axiosInstance.post(`${BASE}/teacher/quiz/create`, payload);
    return res.data;
  },

  // ─── TEACHER: GET QUIZ ATTEMPTS ────────────────────────────────────────────
  getQuizAttempts: async (quizId: string): Promise<{ success: boolean; attempts: IQuizAttempt[] }> => {
    const res = await axiosInstance.get(`${BASE}/teacher/quiz/${quizId}/attempts`);
    return res.data;
  }
};
