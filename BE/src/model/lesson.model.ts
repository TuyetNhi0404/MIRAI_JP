import mongoose, { Document, Schema } from "mongoose";

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  orderIndex?: number;
  estimatedDuration?: number;
  status: "not_started" | "in_progress" | "completed";
}

const lessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: String,
    orderIndex: Number,
    estimatedDuration: Number,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILesson>("Lesson", lessonSchema);
