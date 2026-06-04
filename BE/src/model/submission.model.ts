import mongoose, { Schema, model, Document } from "mongoose";

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  files: string[];
  note?: string;
  submittedAt: Date;
  status: "submitted" | "late" | "not_submitted" | "graded";
  score?: number | null;
  feedbacks: {
    studentId: mongoose.Types.ObjectId;
    teacherId?: mongoose.Types.ObjectId;
    message: string;
    reply?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }[];
  gradedBy?: mongoose.Types.ObjectId | null;
  gradedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    files: [
      {
        type: String,
        required: true,
      },
    ],
    note: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["submitted", "late", "not_submitted", "graded"],
      default: "submitted",
    },
    score: { type: Number, default: null },
    feedbacks: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: "User" },
        message: { type: String, required: true },
        reply: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    gradedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Submission = model<ISubmission>(
  "Submission",
  submissionSchema,
  "submission"
);
