// src/api/quiz.axios.ts
import axiosInstance from "./axiosInstance";
import type {
  Quiz,
  QuizStartResponse,
  QuizSubmitRequest,
  QuizSubmitResponse,
  QuizAttempt,
  AttemptDetailResponse,
  QuizStatistics,
  CreateQuizRequest,
  UpdateQuizRequest,
  QuizWithAttempt,
  QuizQuestionDetail
} from "../types/quiz.types";

export const quizApi = {
  // Teacher/Admin APIs 
  createQuiz: (data: CreateQuizRequest) => {
    console.log('📤 Sending to backend:', JSON.stringify(data, null, 2));
    return axiosInstance.post<{ message: string; quiz: Quiz }>("/quizzes", data);
  },
  
  getQuizzes: (params?: { courseId?: string; chapterId?: string }) =>
    axiosInstance.get<{ message: string; quizzes: Quiz[] }>("/quizzes", { params }),
  
  getQuizzesByCourse: (courseId: string) =>
    axiosInstance.get<{ message: string; quizzes: Quiz[] }>(`/quizzes/course/${courseId}`),

  // ✅ NEW: API cho student lấy quizzes từ courses đã tham gia
  getStudentQuizzes: () =>
    axiosInstance.get<{ message: string; quizzes: QuizWithAttempt[] }>("/quizzes/student/my-quizzes"),

  updateQuiz: (quizId: string, data: UpdateQuizRequest) =>
    axiosInstance.put<{ message: string; quiz: Quiz }>(`/quizzes/${quizId}`, data),
  
  deleteQuiz: (quizId: string, createdBy?: string) =>
    axiosInstance.delete<{ message: string }>(`/quizzes/${quizId}`, {
      params: { createdBy },
    }),
  
  getQuizStatistics: (quizId: string, createdBy?: string) =>
    axiosInstance.get<{ message: string; statistics: QuizStatistics }>(
      `/quizzes/${quizId}/statistics`,
      { params: { createdBy } }
    ),

  getQuizQuestions: (quizId: string, params?: { createdBy?: string; includeCorrectAnswers?: boolean }) =>
    axiosInstance.get<{ message: string; quiz: Quiz; questions: QuizQuestionDetail[] }>(
      `/quizzes/${quizId}/questions`,
      { params }
    ),

  // Student APIs 
  getQuizInfo: (quizId: string) =>
    axiosInstance.get<{ message: string; quiz: Quiz }>(`/quizzes/${quizId}/info`),
  
  startQuiz: (quizId: string, studentId?: string) =>
    axiosInstance.get<{ message: string; quiz: QuizStartResponse }>(
      `/quizzes/${quizId}/start`,
      { params: { studentId } }
    ),
  
  submitQuiz: (quizId: string, data: QuizSubmitRequest) =>
    axiosInstance.post<{ message: string; result: QuizSubmitResponse }>(
      `/quizzes/${quizId}/submit`,
      data
    ),
  
  getStudentQuizHistory: (params?: { courseId?: string; studentId?: string }) =>
    axiosInstance.get<{ message: string; history: QuizAttempt[] }>("/quizzes/history", {
      params,
    }),
  
  getAttemptResult: (attemptId: string, studentId?: string) =>
    axiosInstance.get<{ message: string; result: AttemptDetailResponse }>(
      `/quizzes/attempt/${attemptId}/result`,
      { params: { studentId } }
    ),
};