import mongoose, { Schema, Document } from 'mongoose';

export interface IListeningResult extends Document {
  studentId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  answers: {
    exerciseId: mongoose.Types.ObjectId;
    studentAnswer: string;
    isCorrect: boolean;
    score: number;
  }[];
  totalScore: number;
  maxScore: number;
  timeSpent: number;
  completedAt: Date;
}

const listeningResultSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contentId: { type: Schema.Types.ObjectId, ref: 'ListeningContent', required: true },
    answers: [
      {
        exerciseId: { type: Schema.Types.ObjectId, ref: 'ListeningExercise', required: true },
        studentAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        score: { type: Number, required: true }
      }
    ],
    totalScore: { type: Number, required: true, default: 0 },
    maxScore: { type: Number, required: true },
    timeSpent: { type: Number, required: true }, // in seconds
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IListeningResult>('ListeningResult', listeningResultSchema);
