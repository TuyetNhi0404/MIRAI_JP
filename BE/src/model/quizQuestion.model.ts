import mongoose, { Document, Schema } from "mongoose";

export interface IQuizQuestionMap extends Document {
  quizId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  questionOrder: number;
}

const quizQuestionSchema = new Schema<IQuizQuestionMap>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    questionOrder: { type: Number, required: true },
  },
  { timestamps: true }
);

quizQuestionSchema.index({ quizId: 1, questionId: 1 }, { unique: true });

export const QuizQuestion = mongoose.model<IQuizQuestionMap>("QuizQuestion", quizQuestionSchema);


