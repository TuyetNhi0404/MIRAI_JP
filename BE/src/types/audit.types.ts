export interface EvaluationResult {
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
}

export enum AppState {
  IDLE,
  GETTING_QUESTION,
  ASKING_QUESTION,
  READY_TO_RECORD,
  RECORDING,
  PROCESSING,
  SHOWING_FEEDBACK,
  ERROR,
}