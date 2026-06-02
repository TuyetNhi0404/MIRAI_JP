import mongoose, { Document, Schema } from "mongoose";

export interface IQuiz extends Document {
  title: string;
  description?: string;
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  chapterIds?: mongoose.Types.ObjectId[];
  coversAllChapters?: boolean;
  totalQuestions: number;
  durationMinutes?: number; // in minutes
  dueDate?: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  questions: {
    questionId: mongoose.Types.ObjectId;
    questionOrder: number;
  }[];
}

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: number[]; // array of selected option indices
  score: number;
  percentage: number;
  passed: boolean;
  timeSpent: number; // in minutes
  completedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: String,
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter" },
    chapterIds: [{ type: Schema.Types.ObjectId, ref: "Chapter" }],
    coversAllChapters: { type: Boolean, default: false },
    totalQuestions: { type: Number, required: true, min: 1 },
    durationMinutes: Number,
    dueDate: Date,
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questions: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        questionOrder: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: [{ type: Number }],
    score: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    timeSpent: { type: Number, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Indexes for better performance
quizSchema.index({ courseId: 1, isActive: 1 });
quizSchema.index({ chapterId: 1 });
quizSchema.index({ chapterIds: 1 });
quizSchema.index({ coversAllChapters: 1 });
// Unique index để đảm bảo mỗi học sinh chỉ làm quiz một lần
quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });
quizAttemptSchema.index({ studentId: 1, completedAt: -1 });

export const Quiz = mongoose.model<IQuiz>("Quiz", quizSchema);
export const QuizAttempt = mongoose.model<IQuizAttempt>("QuizAttempt", quizAttemptSchema);
