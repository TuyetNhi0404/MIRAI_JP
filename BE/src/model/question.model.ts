import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  chapterId: mongoose.Types.ObjectId;
  questionText: string;
  correctAnswer: number; // 1..4
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
}

const questionSchema = new Schema<IQuestion>(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
    questionText: { type: String, required: true },
    correctAnswer: { type: Number, required: true, min: 1, max: 4 },
    answer1: { type: String, required: true },
    answer2: { type: String, required: true },
    answer3: { type: String, required: true },
    answer4: { type: String, required: true },
  },
  { timestamps: true }
);

questionSchema.index({ chapterId: 1 });

export const Question = mongoose.model<IQuestion>("Question", questionSchema);


