import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  message: string;
  reply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      required: true,
    },
    reply: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IFeedback>("Feedback", FeedbackSchema);
