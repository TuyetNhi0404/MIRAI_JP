import mongoose, { Schema, Document } from "mongoose";
import { ScoreComponent, FinalScore } from "./score.model"; // nhớ import đúng đường dẫn

export interface ICourseMember extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "student" | "teacher";
  enrolledAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseMemberSchema = new Schema<ICourseMember>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["student", "teacher"], required: true },
    enrolledAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Index để optimize query
CourseMemberSchema.index({ courseId: 1, role: 1, deletedAt: 1 });
CourseMemberSchema.index({ userId: 1, deletedAt: 1 });

CourseMemberSchema.post("save", async function (doc) {
  try {
    if (doc.role !== "student") return;

    // Kiểm tra nếu đã tồn tại score để tránh duplicate
    const existed = await FinalScore.findOne({
      courseId: doc.courseId,
      studentId: doc.userId,
    });

    if (existed) return;

    console.log(
      `[Score Init] Creating ScoreComponent + FinalScore for student ${doc.userId} in course ${doc.courseId}`
    );

    // TẠO SCORE COMPONENT (attendance/assignment/quiz)
    await ScoreComponent.create({
      courseId: doc.courseId,
      studentId: doc.userId,

      // Bạn có default trong schema rồi nên để trống
      attendanceScore: 0,
      assignmentScore: 0,
      quizScore: 0,
    });

    //TẠO FINAL SCORE THEO SCHEMA
    await FinalScore.create({
      courseId: doc.courseId,
      studentId: doc.userId,

      attendanceScore: 0,
      assignmentScore: 0,
      quizScore: 0,

      weights: {
        attendance: 20,
        assignment: 40,
        quiz: 40,
      },

      finalScore: 0,
      grade: "F",
      passed: false,

      rank: null,
      totalStudents: null,
      calculatedAt: new Date(),
    });

    console.log(`[Score Init] DONE`);
  } catch (err) {
    console.error("[CourseMember Hook] Failed to create score:", err);
  }
});


export const CourseMember = mongoose.model<ICourseMember>(
  "CourseMember",
  CourseMemberSchema
);
