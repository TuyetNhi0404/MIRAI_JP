import { Schema, model, Document } from "mongoose";

export interface IAssignment extends Document {
  title: string;
  courseId: Schema.Types.ObjectId;
  teacherId: Schema.Types.ObjectId;
  description?: string;
  status: "draft" | "active" | "closed";
  dueDate: Date;
  maxScore: number;
  fileUrls?: string[];
  createdBy: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  hasSentDeadlineReminder?: boolean;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, required: true },
    fileUrls: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hasSentDeadlineReminder: {
      type: Boolean,
      default: false,
      index: true, // For fast queries
    },
  },
  { timestamps: true }
);

export const Assignment = model<IAssignment>("Assignment", assignmentSchema, "assignment");
