// src/types/quiz.types.ts

export interface QuizQuestionDetail {
  questionId: string;
  chapterId: string;
  order: number;
  questionText: string;
  options: string[];
  correctAnswer?: number;
}

export interface QuizQuestionsResponse {
  quiz: {
    _id: string;
    title: string;
    totalQuestions: number;
    createdBy: string;
  };
  questions: QuizQuestionDetail[];
}

/**
 * ============================================
 * QUIZ TYPES
 * ============================================
 */

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  courseId: string;
  lessonId?: string;
  chapterId?: string;
  chapterIds?: string[];
  coversAllChapters?: boolean;
  totalQuestions: number;
  durationMinutes?: number;
  dueDate?: string; // ✅ THÊM: Hạn nộp bài
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Extended Quiz với thông tin attempt (dùng cho student APIs)
export interface QuizWithAttempt extends Quiz {
  courseName?: string;
  hasAttempted: boolean;
  attemptScore?: number;
  attemptPercentage?: number;
  attemptPassed?: boolean;
  attemptCompletedAt?: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  question: string;
  options: string[];
}

export interface QuizStartResponse {
  _id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  dueDate?: string; // ✅ THÊM: Hạn nộp bài
  questions: QuizQuestion[];
}

/**
 * ============================================
 * SUBMIT & RESULT TYPES
 * ============================================
 */

export interface QuizSubmitRequest {
  answers: number[];
  timeSpent: number;
  studentId?: string;
  antiCheatLogs?: AntiCheatLog[];
}

export interface AntiCheatLog {
  type: 'tab_switch' | 'window_blur' | 'copy' | 'paste' | 'right_click' | 'fullscreen_exit' | 'devtools_open';
  timestamp: number;
  details?: string;
}

export interface QuestionResult {
  order: number;
  questionId: string;
  question: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
}

export interface QuizSubmitResponse {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  results: QuestionResult[];
  timeSpent: number;
  completedAt: string;
}

/**
 * ============================================
 * ATTEMPT TYPES
 * ============================================
 */

export interface QuizAttempt {
  _id: string;
  quizId: {
    _id: string;
    title: string;
    courseId: string;
  };
  studentId: string;
  answers: number[];
  score: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  completedAt: string;
  createdAt: string;
}

export interface AttemptDetailResult {
  questionIndex: number;
  question: string;
  options: string[];
  studentAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
}

export interface AttemptDetailResponse {
  attemptId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  completedAt: string;
  results: AttemptDetailResult[];
}

/**
 * ============================================
 * STATISTICS TYPES
 * ============================================
 */

export interface QuizStatistics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  attempts: {
    attemptId?: string;
    studentName: string;
    studentEmail: string;
    score: number;
    percentage: number;
    passed: boolean;
    timeSpent: number;
    completedAt: string;
    antiCheatLogs?: AntiCheatLog[];
  }[];
}

/**
 * ============================================
 * REQUEST TYPES
 * ============================================
 */

export interface CreateQuizRequest {
  title: string;
  description?: string;
  courseId: string;
  lessonId?: string;
  chapterId?: string;
  chapterIds?: string[];
  useAllChapters?: boolean;
  totalQuestions: number;
  durationMinutes?: number;
  dueDate?: string;
  createdBy?: string;
}

export interface UpdateQuizRequest {
  title?: string;
  description?: string;
  chapterId?: string | null;
  chapterIds?: string[] | null;
  useAllChapters?: boolean;
  totalQuestions?: number;
  durationMinutes?: number;
  dueDate?: string | null;
  isActive?: boolean;
  createdBy?: string;
}

/**
 * ============================================
 * FILTER & PARAMS TYPES
 * ============================================
 */

export interface QuizFilterParams {
  courseId?: string;
  chapterId?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface QuizHistoryParams {
  courseId?: string;
  studentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * ============================================
 * UI STATE TYPES (Optional - for components)
 * ============================================
 */

export interface QuizCardProps {
  quiz: QuizWithAttempt;
  onStart?: (quizId: string) => void;
  onViewResult?: (quizId: string) => void;
}

export interface QuizFilterState {
  courseId: string;
  showCompleted: boolean;
  searchQuery: string;
}

export type QuizStatus = 'available' | 'completed' | 'in_progress' | 'expired';

export interface QuizSortOption {
  field: 'createdAt' | 'title' | 'totalQuestions' | 'attemptPercentage';
  direction: 'asc' | 'desc';
}

export interface AntiCheatLog {
  type: 'tab_switch' | 'window_blur' | 'copy' | 'paste' | 'right_click' | 'fullscreen_exit' | 'devtools_open';
  timestamp: number;
  details?: string;
}

export interface UserWithId {
  _id?: string;
  id?: string;
}