import mongoose, { Schema, Document } from "mongoose";

export interface IScoreComponent extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  attendanceScore: number;
  attendanceDetails: {
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    percentage: number;
  };

  assignmentScore: number;
  assignmentDetails: {
    totalAssignments: number;
    gradedAssignments: number;
    averageScore: number;
  };

  quizScore: number;
  quizDetails: {
    totalQuizzes: number;
    completedQuizzes: number;
    averageScore: number;
    bestScore: number;
  };

  finalScore: number;
  isPass: boolean;

  lastCalculated: Date;
}

const scoreComponentSchema = new Schema<IScoreComponent>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attendanceScore: { type: Number, default: 0, min: 0, max: 100 },
    attendanceDetails: {
      totalSessions: { type: Number, default: 0 },
      presentCount: { type: Number, default: 0 },
      absentCount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    assignmentScore: { type: Number, default: 0, min: 0, max: 100 },
    assignmentDetails: {
      totalAssignments: { type: Number, default: 0 },
      gradedAssignments: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
    },
    quizScore: { type: Number, default: 0, min: 0, max: 100 },
    quizDetails: {
      totalQuizzes: { type: Number, default: 0 },
      completedQuizzes: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
    },
    finalScore: { type: Number, default: 0 },
    isPass: { type: Boolean, default: false },
    lastCalculated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

scoreComponentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

export const ScoreComponent = mongoose.model<IScoreComponent>(
  "ScoreComponent",
  scoreComponentSchema
);

export interface IFinalScore extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  attendanceScore: number;
  assignmentScore: number;
  quizScore: number;

  weights: {
    attendance: number;
    assignment: number;
    quiz: number;
  };

  finalScore: number;
  grade: string;
  passed: boolean;

  rank?: number;
  totalStudents?: number;

  calculatedAt: Date;
}

const finalScoreSchema = new Schema<IFinalScore>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attendanceScore: { type: Number, required: true, min: 0, max: 10 },
    assignmentScore: { type: Number, required: true, min: 0, max: 10 },
    quizScore: { type: Number, required: true, min: 0, max: 10 },
    weights: {
      attendance: { type: Number, default: 20 },
      assignment: { type: Number, default: 40 },
      quiz: { type: Number, default: 40 },
    },
    finalScore: { type: Number, required: true, min: 0, max: 10 },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
      required: true,
    },
    passed: { type: Boolean, required: true },
    rank: { type: Number, min: 1 },
    totalStudents: { type: Number, min: 0 },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

finalScoreSchema.index({ courseId: 1, studentId: 1 }, { unique: true });
finalScoreSchema.index({ courseId: 1, finalScore: -1 });
finalScoreSchema.index({ finalScore: -1 });

export const FinalScore = mongoose.model<IFinalScore>("FinalScore", finalScoreSchema);

export interface ICourseRanking extends Document {
  courseId: mongoose.Types.ObjectId;
  rankings: Array<{
    rank: number;
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    studentEmail: string;
    finalScore: number;
    grade: string;
  }>;
  statistics: {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    gradeDistribution: {
      "A+": number;
      A: number;
      "B+": number;
      B: number;
      "C+": number;
      C: number;
      D: number;
      F: number;
    };
  };
  topStudent?: {
    studentId: mongoose.Types.ObjectId | null;
    studentName: string | null;
    finalScore: number | null;
    grade: string | null;
  };
  lastUpdated: Date;
}

const courseRankingSchema = new Schema<ICourseRanking>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, unique: true },
    rankings: [
      {
        rank: { type: Number, required: true },
        studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        studentName: { type: String, required: true },
        studentEmail: { type: String, required: true },
        finalScore: { type: Number, required: true },
        grade: { type: String, required: true },
      },
    ],
    statistics: {
      totalStudents: { type: Number, required: true },
      averageScore: { type: Number, required: true },
      highestScore: { type: Number, required: true },
      lowestScore: { type: Number, required: true },
      passRate: { type: Number, required: true },
      gradeDistribution: {
        "A+": { type: Number, default: 0 },
        A: { type: Number, default: 0 },
        "B+": { type: Number, default: 0 },
        B: { type: Number, default: 0 },
        "C+": { type: Number, default: 0 },
        C: { type: Number, default: 0 },
        D: { type: Number, default: 0 },
        F: { type: Number, default: 0 },
      },
    },
    topStudent: {
      studentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      studentName: { type: String, default: null },
      finalScore: { type: Number, default: null },
      grade: { type: String, default: null },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CourseRanking = mongoose.model<ICourseRanking>(
  "CourseRanking",
  courseRankingSchema
);


