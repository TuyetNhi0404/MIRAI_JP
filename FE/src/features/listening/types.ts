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
  isPublished?: boolean;
  exercises?: ListeningExercise[];
  createdAt: string;
  updatedAt: string;
}

export type ListeningExerciseType = 'quiz' | 'fill_blank' | 'dictation';

export interface QuizExercise {
  id: string;
  _id?: string;
  type: 'quiz';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface FillBlankExercise {
  id?: string;
  _id?: string;
  type: 'fill_blank';
  question: string;
  textWithBlanks: string;
  answers: string[];
  hints?: string[];
}

export interface DictationExercise {
  id?: string;
  _id?: string;
  type: 'dictation';
  question: string;
  audioSegmentStart?: number;
  audioSegmentEnd?: number;
  targetText: string;
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
