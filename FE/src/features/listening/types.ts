export interface ListeningContent {
  _id: string;
  title: string;
  description: string;
  topic: string;
  level: string;
  audioSource: 'upload' | 'tts';
  audioUrl: string;
  transcript: string;
  duration: number;
  thumbnailUrl: string;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ListeningExerciseType = 'quiz' | 'fill_blank' | 'dictation';

export interface QuizExercise {
  id: string;
  type: 'quiz';
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface FillBlankExercise {
  id: string;
  type: 'fill_blank';
  question: string;
  template: string;
  answers: string[];
  hints?: string[];
}

export interface DictationExercise {
  id: string;
  type: 'dictation';
  question: string;
  startTime: number;
  endTime: number;
  correctText: string;
  acceptableVariants?: string[];
}

export type ListeningExercise = QuizExercise | FillBlankExercise | DictationExercise;

export interface ListeningResult {
  _id: string;
  studentId: string;
  contentId: string;
  answers: Array<{
    exerciseId: string;
    studentAnswer: string;
    isCorrect: boolean;
    score: number;
  }>;
  totalScore: number;
  maxScore: number;
  completedAt: string;
  timeSpent: number;
}
