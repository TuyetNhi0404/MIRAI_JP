import mongoose, { Schema, model, Document } from "mongoose";

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  files: string[];
  note?: string;
  submittedAt: Date;
  status: "submitted" | "late" | "not_submitted" | "graded";
  score?: number | null;
  feedback?: string;
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
    feedback: { type: String, default: "" },
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
