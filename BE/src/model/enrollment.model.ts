import mongoose, { Schema, Document } from "mongoose";

export interface IEnrollment extends Document {
  studentName: string;
  studentEmail: string;
  courseId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },

    studentEmail: {
      type: String,
      required: [true, "Student email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentEmail: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);
