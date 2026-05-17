// src/types/question.types.ts

export interface IChapter {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IQuestion {
  _id: string;
  chapterId: string;
  questionText: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  correctAnswer: number; // 1, 2, 3, or 4
  createdAt: string;
  updatedAt: string;
}

export interface CreateChapterPayload {
  name: string;
  description?: string;
}

export interface UpdateChapterPayload {
  name?: string;
  description?: string;
}

export interface CreateQuestionPayload {
  chapterId: string;
  questionText: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  correctAnswer: number;
}

export interface UpdateQuestionPayload {
  questionText?: string;
  answer1?: string;
  answer2?: string;
  answer3?: string;
  answer4?: string;
  correctAnswer?: number;
}

export interface QuestionFilters {
  chapterId?: string;
  search?: string;
}