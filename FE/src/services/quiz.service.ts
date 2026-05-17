// src/services/quiz.service.ts
import { quizApi } from "../api/quiz.axios";
import type {
  Quiz,
  QuizStartResponse,
  QuizSubmitRequest,
  QuizSubmitResponse,
  QuizAttempt,
  AttemptDetailResponse,
  QuizStatistics,
  QuizQuestionsResponse,
  CreateQuizRequest,
  UpdateQuizRequest,
  QuizWithAttempt,
} from "../types/quiz.types";

class QuizService {
  /**
   * ============================================
   * TEACHER/ADMIN METHODS
   * ============================================
   */

  // Tạo quiz mới
  async createQuiz(data: CreateQuizRequest): Promise<Quiz> {
    const response = await quizApi.createQuiz(data);
    return response.data.quiz;
  }

  // ✅ FIX: Lấy danh sách tất cả quizzes với filter - return Quiz[] cho teacher
  async getQuizzes(params?: { courseId?: string; chapterId?: string }): Promise<Quiz[]> {
    const response = await quizApi.getQuizzes(params);
    return response.data.quizzes;
  }

  // ✅ FIX: Lấy quizzes theo course - return Quiz[] cho teacher
  async getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
    const response = await quizApi.getQuizzesByCourse(courseId);
    return response.data.quizzes;
  }

  // Cập nhật quiz
  async updateQuiz(quizId: string, data: UpdateQuizRequest): Promise<Quiz> {
    const response = await quizApi.updateQuiz(quizId, data);
    return response.data.quiz;
  }

  // Xóa quiz
  async deleteQuiz(quizId: string, createdBy?: string): Promise<void> {
    await quizApi.deleteQuiz(quizId, createdBy);
  }

  // Lấy thống kê quiz (cho teacher)
  async getQuizStatistics(quizId: string, createdBy?: string): Promise<QuizStatistics> {
    const response = await quizApi.getQuizStatistics(quizId, createdBy);
    return response.data.statistics;
  }

  // Lấy danh sách câu hỏi của quiz (cho teacher)
  async getQuizQuestions(
    quizId: string,
    createdBy?: string,
    includeCorrectAnswers: boolean = true
  ): Promise<QuizQuestionsResponse> {
    const response = await quizApi.getQuizQuestions(quizId, {
      createdBy,
      includeCorrectAnswers,
    });
    return {
      quiz: response.data.quiz,
      questions: response.data.questions,
    };
  }

  /**
   * ============================================
   * STUDENT METHODS
   * ============================================
   */

  // ✅ CORRECT: Lấy danh sách quizzes từ courses student đã tham gia
  async getStudentQuizzes(): Promise<QuizWithAttempt[]> {
    const response = await quizApi.getStudentQuizzes();
    return response.data.quizzes;
  }

  // Lấy thông tin quiz (không có đáp án)
  async getQuizInfo(quizId: string): Promise<Quiz> {
    const response = await quizApi.getQuizInfo(quizId);
    return response.data.quiz;
  }

  // Bắt đầu làm quiz
  async startQuiz(quizId: string, studentId?: string): Promise<QuizStartResponse> {
    const response = await quizApi.startQuiz(quizId, studentId);
    return response.data.quiz;
  }

  // Nộp bài quiz
  async submitQuiz(quizId: string, data: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const response = await quizApi.submitQuiz(quizId, data);
    return response.data.result;
  }

  // Lấy lịch sử làm quiz của student
  async getStudentQuizHistory(params?: {
    courseId?: string;
    studentId?: string;
  }): Promise<QuizAttempt[]> {
    const response = await quizApi.getStudentQuizHistory(params);
    return response.data.history;
  }

  // Lấy kết quả chi tiết của một attempt
  async getAttemptResult(attemptId: string, studentId?: string): Promise<AttemptDetailResponse> {
    const response = await quizApi.getAttemptResult(attemptId, studentId);
    return response.data.result;
  }

  /**
   * ============================================
   * UTILITY METHODS
   * ============================================
   */

  // Kiểm tra xem quiz có còn active không
  isQuizActive(quiz: Quiz): boolean {
    return quiz.isActive;
  }

  // Tính toán thời gian còn lại
  calculateTimeRemaining(startTime: number, durationMinutes?: number): number | null {
    if (!durationMinutes) return null;
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    return Math.max(0, durationMinutes - elapsed);
  }

  // Format thời gian
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  // Kiểm tra điểm đạt hay không (70% threshold)
  isPassed(percentage: number): boolean {
    return percentage >= 70;
  }

  // Tính phần trăm điểm
  calculatePercentage(score: number, totalQuestions: number): number {
    if (totalQuestions === 0) return 0;
    return Math.round((score / totalQuestions) * 100);
  }

  // Format completion date
  formatCompletionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get quiz difficulty label
  getDifficultyLabel(totalQuestions: number): string {
    if (totalQuestions <= 10) return "Easy";
    if (totalQuestions <= 20) return "Medium";
    return "Hard";
  }

  // Get pass/fail color
  getResultColor(passed: boolean): string {
    return passed ? "#4CAF50" : "#f44336";
  }

  // Get percentage color
  getPercentageColor(percentage: number): string {
    if (percentage >= 90) return "#4CAF50";
    if (percentage >= 70) return "#FF9800";
    return "#f44336";
  }
}

// Export singleton instance
export const quizService = new QuizService();
export default quizService;