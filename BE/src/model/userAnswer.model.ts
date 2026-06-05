import mongoose, { Document, Schema } from "mongoose";

export interface IUserAnswer extends Document {
  attemptId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  selectedAnswer: number; // 1..4
  isCorrect: boolean;
}

const userAnswerSchema = new Schema<IUserAnswer>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: "QuizAttempt", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedAnswer: { type: Number, required: true, min: 1, max: 4 },
    isCorrect: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const UserAnswer = mongoose.model<IUserAnswer>("UserAnswer", userAnswerSchema);


