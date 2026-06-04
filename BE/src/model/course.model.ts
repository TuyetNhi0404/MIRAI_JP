import mongoose, { Document, Schema } from "mongoose";

export type CourseStatus = "not_yet" | "in_progress" | "complete";

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface ICourse extends Document {
  name: string;
  description?: string;
  status: CourseStatus;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  homeroomTeacherId: Schema.Types.ObjectId;
  homeroomTeacher: string;
  session: number;
  capacity: number;
  enrolledCount: number;
  members: {
    userId: Schema.Types.ObjectId;
    role: "student" | "teacher";
    enrolledAt: Date;
    deletedAt?: Date | null;
    deletedBy?: string | null;
  }[];
}

const courseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true },
    description: String,

    status: {
      type: String,
      enum: ["not_yet", " in_progress", "complete"],
      default: "not_yet",
      required: true,
    },

    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    createdBy: { type: String, required: true },
    homeroomTeacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    homeroomTeacher: { type: String, required: true },
    capacity: { type: Number, default: 0, min: 0, required: true },
    session: { type: Number, default: 0, min: 0, required: true },
    enrolledCount: { type: Number, default: 0, min: 0, required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["student", "teacher"], required: true },
        enrolledAt: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: String, default: null },
      }
    ],
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>("Course", courseSchema);
