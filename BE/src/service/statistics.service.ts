import mongoose from "mongoose";
import { Assignment, IAssignment } from "../model/assignment.model";
import { Submission, ISubmission } from "../model/submission.model";
import { AttendanceStatus } from "../model/calendar.model";
import { CourseCalendar } from "../model/calendar.model";

import { Course } from "../model/course.model";
import { User } from "../model/user.model";
import { Quiz, QuizAttempt, IQuiz, IQuizAttempt } from "../model/quiz.model";
import {CourseRanking,FinalScore,IFinalScore,IScoreComponent,ScoreComponent} from "../model/score.model";

const DEFAULT_WEIGHTS = {
  attendance: 20,
  assignment: 40,
  quiz: 40,
};

const GRADE_BOUNDS: Array<{ min: number; grade: IFinalScore["grade"] }> = [
  { min: 9.0, grade: "A+" },
  { min: 8.5, grade: "A" },
  { min: 8.0, grade: "B+" },
  { min: 7.0, grade: "B" },
  { min: 6.5, grade: "C+" },
  { min: 5.5, grade: "C" },
  { min: 5.0, grade: "D" },
  { min: 0, grade: "F" },
];

export class StatisticsService {
  private static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private static clampTen(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(10, value));
  }

  private static emptyGradeDistribution() {
    return {
      "A+": 0,
      A: 0,
      "B+": 0,
      B: 0,
      "C+": 0,
      C: 0,
      D: 0,
      F: 0,
    };
  }

  private static resolveGrade(score: number): IFinalScore["grade"] {
    for (const bound of GRADE_BOUNDS) {
      if (score >= bound.min) {
        return bound.grade;
      }
    }
    return "F";
  }

  private static buildAssignmentDetails(assignments: IAssignment[], submissions: ISubmission[]) {
    if (!assignments.length) {
      return {
        score: 0,
        details: {
          totalAssignments: 0,
          gradedAssignments: 0,
          averageScore: 0,
        },
      };
    }

    const totalAssignments = assignments.length;
    const totalMaxScore = assignments.reduce((sum, item) => sum + (item.maxScore || 0), 0);
    const gradedAssignments = submissions.filter(
      (s) => s.score !== null && s.score !== undefined
    ).length;
    const totalScore = submissions.reduce(
      (sum, submission) => sum + (submission.score || 0),
      0
    );
    const averageScore = gradedAssignments ? totalScore / gradedAssignments : 0;
    const normalized = totalMaxScore ? (totalScore / totalMaxScore) * 10 : 0;

    return {
      score: this.round(this.clampTen(normalized)),
      details: {
        totalAssignments,
        gradedAssignments,
        averageScore: this.round(averageScore),
      },
    };
  }

  private static async calculateAssignmentDetails(courseId: string, studentId: string) {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const assignments = await Assignment.find({
      courseId: courseObjectId,
      status: { $in: ["active", "closed"] },
    }).lean();

    if (!assignments.length) {
      return this.buildAssignmentDetails([], []);
    }

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: new mongoose.Types.ObjectId(studentId),
    }).lean();

    return this.buildAssignmentDetails(
      assignments as unknown as IAssignment[],
      submissions as unknown as ISubmission[]
    );
  }

  private static buildAttendanceDetails(totalSessions: number, attendanceRecords: { status: AttendanceStatus }[]) {
    if (!totalSessions) {
      return {
        score: 0,
        details: {
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          percentage: 0,
        },
      };
    }

    const presentCount = attendanceRecords.filter(
      (record) => record.status === AttendanceStatus.PRESENT
    ).length;
    const absentCount = attendanceRecords.filter(
      (record) => record.status === AttendanceStatus.ABSENT
    ).length;
    const percentage = (presentCount / totalSessions) * 100;
    const score = this.round(this.clampTen(percentage / 10));

    return {
      score,
      details: {
        totalSessions,
        presentCount,
        absentCount,
        percentage: this.round(percentage),
      },
    };
  }

  private static async calculateAttendanceDetails(courseId: string, studentId: string) {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const calendars = await CourseCalendar.find({
      courseId: courseObjectId,
    })
      .select("_id attendances")
      .lean();

    const totalSessions = calendars.length;
    const attendanceRecords: { status: AttendanceStatus }[] = [];
    
    calendars.forEach((calendar: any) => {
      const record = calendar.attendances?.find((a: any) => a.userId.toString() === studentId);
      if (record) {
        attendanceRecords.push({ status: record.status as AttendanceStatus });
      }
    });

    return this.buildAttendanceDetails(
      totalSessions,
      attendanceRecords
    );
  }

  private static buildQuizDetails(quizzes: IQuiz[], attempts: IQuizAttempt[]) {
    if (!quizzes.length) {
      return {
        score: 0,
        details: {
          totalQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
        },
      };
    }

    const completedQuizzes = attempts.length;
    const sumPercentage = attempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0);
    const averageScore = completedQuizzes ? sumPercentage / completedQuizzes : 0;
    const bestScore = attempts.reduce(
      (max, attempt) => Math.max(max, attempt.percentage || 0),
      0
    );
    const normalized = averageScore / 10;

    return {
      score: this.round(this.clampTen(normalized)),
      details: {
        totalQuizzes: quizzes.length,
        completedQuizzes,
        averageScore: this.round(averageScore),
        bestScore: this.round(bestScore),
      },
    };
  }

  private static async calculateQuizDetails(courseId: string, studentId: string) {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const quizzes = await Quiz.find({
      courseId: courseObjectId,
      isActive: true,
    })
      .select("_id")
      .lean();

    const quizIds = quizzes.map((quiz) => quiz._id);
    const attempts = quizIds.length
      ? await QuizAttempt.find({
          quizId: { $in: quizIds },
          studentId: new mongoose.Types.ObjectId(studentId),
        }).lean()
      : [];

    return this.buildQuizDetails(quizzes as unknown as IQuiz[], attempts as unknown as IQuizAttempt[]);
  }

  private static async buildScoreComponent(
    courseId: string,
    studentId: string
  ): Promise<IScoreComponent> {
    const [attendance, assignment, quiz] = await Promise.all([
      this.calculateAttendanceDetails(courseId, studentId),
      this.calculateAssignmentDetails(courseId, studentId),
      this.calculateQuizDetails(courseId, studentId),
    ]);

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // Tính finalScore = trung bình của 3 thành phần (scale 0-10)
    // Chuyển đổi từ scale 0-10 sang 0-100 để tính
    const attendanceScore100 = attendance.score * 10;
    const assignmentScore100 = assignment.score * 10;
    const quizScore100 = quiz.score * 10;
    const finalScore100 = (attendanceScore100 + assignmentScore100 + quizScore100) / 3;
    const finalScore = finalScore100 / 10; // Chuyển về scale 0-10

    // Điều kiện Pass: attendanceScore >= 80% && finalScore >= 50%
    const attendancePercentage = attendance.details.percentage;
    const isPass = attendancePercentage >= 80 && finalScore100 >= 50;

    const payload = {
      courseId: courseObjectId,
      studentId: studentObjectId,
      attendanceScore: attendance.score,
      attendanceDetails: attendance.details,
      assignmentScore: assignment.score,
      assignmentDetails: assignment.details,
      quizScore: quiz.score,
      quizDetails: quiz.details,
      finalScore: this.round(finalScore),
      isPass,
      lastCalculated: new Date(),
    };

    const scoreComponent = await ScoreComponent.findOneAndUpdate(
      { courseId: courseObjectId, studentId: studentObjectId },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<IScoreComponent>();

    if (!scoreComponent) {
      throw new Error("Unable to calculate component score.");
    }

    return scoreComponent;
  }

  private static async buildFinalScore(
    courseId: string,
    studentId: string,
    scoreComponent: IScoreComponent
  ): Promise<IFinalScore> {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const existing = await FinalScore.findOne({
      courseId: courseObjectId,
      studentId: studentObjectId,
    }).lean();

    const weights = existing?.weights || DEFAULT_WEIGHTS;
    const weightTotal = weights.attendance + weights.assignment + weights.quiz || 100;

    const value =
      (scoreComponent.attendanceScore * weights.attendance +
        scoreComponent.assignmentScore * weights.assignment +
        scoreComponent.quizScore * weights.quiz) /
      weightTotal;

    const computedFinalScore = this.round(this.clampTen(value));
    const attendancePercentage = scoreComponent.attendanceDetails.percentage;
    const grade = this.resolveGrade(computedFinalScore);
    const passed = computedFinalScore >= 5 && attendancePercentage >= 80;

    const finalScoreDocument = await FinalScore.findOneAndUpdate(
      { courseId: courseObjectId, studentId: studentObjectId },
      {
        courseId: courseObjectId,
        studentId: studentObjectId,
        attendanceScore: scoreComponent.attendanceScore,
        assignmentScore: scoreComponent.assignmentScore,
        quizScore: scoreComponent.quizScore,
        weights,
        finalScore: computedFinalScore,
        grade,
        passed,
        calculatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<IFinalScore>();

    if (!finalScoreDocument) {
      throw new Error("Unable to calculate final score.");
    }

    return finalScoreDocument;
  }

  private static async refreshStudentScores(courseId: string, studentId: string) {
    const scoreComponent = await this.buildScoreComponent(courseId, studentId);
    const finalScore = await this.buildFinalScore(courseId, studentId, scoreComponent);
    return { scoreComponent, finalScore };
  }

  // Public method để gọi từ middleware tự động tính điểm
  static async refreshStudentScoresAsync(courseId: string, studentId: string) {
    try {
      console.log(`[StatisticsService] Starting score refresh for student ${studentId} in course ${courseId}`);
      
      const { scoreComponent, finalScore } = await this.refreshStudentScores(courseId, studentId);
      
      console.log(`[StatisticsService] ScoreComponent updated:`, {
        attendanceScore: scoreComponent.attendanceScore,
        assignmentScore: scoreComponent.assignmentScore,
        quizScore: scoreComponent.quizScore,
        finalScore: scoreComponent.finalScore,
        isPass: scoreComponent.isPass,
      });
      
      console.log(`[StatisticsService] FinalScore updated:`, {
        finalScore: finalScore.finalScore,
        grade: finalScore.grade,
        passed: finalScore.passed,
      });
      
      await this.updateCourseRanking(courseId);
      
      console.log(`[StatisticsService] Successfully refreshed all scores for student ${studentId} in course ${courseId}`);
    } catch (error) {
      // Log error nhưng không throw để không làm gián đoạn flow chính
      console.error(`[StatisticsService] Error refreshing scores for student ${studentId} in course ${courseId}:`, error);
      if (error instanceof Error) {
        console.error(`[StatisticsService] Error stack:`, error.stack);
      }
    }
  }

  private static async updateCourseRanking(courseId: string) {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const finalScores = await FinalScore.find({ courseId: courseObjectId })
      .sort({ finalScore: -1 })
      .lean();

    if (!finalScores.length) {
      await CourseRanking.findOneAndUpdate(
        { courseId: courseObjectId },
        {
          courseId: courseObjectId,
          rankings: [],
          statistics: {
            totalStudents: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passRate: 0,
            gradeDistribution: this.emptyGradeDistribution(),
          },
          topStudent: null,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return;
    }

    const studentIds = finalScores.map((score) => score.studentId);
    const students = await User.find({ _id: { $in: studentIds } })
      .select("name email")
      .lean();
    const studentMap = new Map(students.map((student) => [student._id.toString(), student]));

    const rankings = finalScores.map((score, index) => {
      const student = studentMap.get(score.studentId.toString());
      return {
        rank: index + 1,
        studentId: score.studentId,
        studentName: student?.name || "N/A",
        studentEmail: student?.email || "",
        finalScore: this.round(score.finalScore),
        grade: score.grade,
      };
    });

    await Promise.all(
      finalScores.map((score, index) =>
        FinalScore.updateOne(
          { _id: score._id },
          { rank: index + 1, totalStudents: finalScores.length }
        )
      )
    );

    const totalStudents = finalScores.length;
    const averageScore =
      totalStudents === 0
        ? 0
        : this.round(
            finalScores.reduce((sum, item) => sum + (item.finalScore || 0), 0) / totalStudents
          );
    const highestScore = this.round(finalScores[0]?.finalScore || 0);
    const lowestScore = this.round(finalScores[totalStudents - 1]?.finalScore || 0);
    const passCount = finalScores.filter((score) => score.passed).length;
    const passRate = totalStudents ? this.round((passCount / totalStudents) * 100) : 0;

    const gradeDistribution = this.emptyGradeDistribution();
    for (const score of finalScores) {
      const key = score.grade as keyof typeof gradeDistribution;
      if (gradeDistribution[key] === undefined) {
        gradeDistribution[key] = 0;
      }
      gradeDistribution[key] += 1;
    }

    await CourseRanking.findOneAndUpdate(
      { courseId: courseObjectId },
      {
        courseId: courseObjectId,
        rankings,
        statistics: {
          totalStudents,
          averageScore,
          highestScore,
          lowestScore,
          passRate,
          gradeDistribution,
        },
        topStudent: rankings[0]
          ? {
              studentId: rankings[0].studentId,
              studentName: rankings[0].studentName,
              finalScore: rankings[0].finalScore,
              grade: rankings[0].grade,
            }
          : null,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  private static async getStudentOverview(studentId: string) {
    const finalScores = await FinalScore.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    }).lean();

    if (!finalScores.length) {
      return {
        totalCourses: 0,
        averageFinalScore: 0,
        averageAttendanceScore: 0,
        averageAssignmentScore: 0,
        averageQuizScore: 0,
        passRate: 0,
      };
    }

    const totalCourses = finalScores.length;
    const sumReducer = (key: keyof IFinalScore) =>
      finalScores.reduce((sum, item) => sum + (item[key] as number), 0);

    const passRate =
      (finalScores.filter((score) => score.passed).length / totalCourses) * 100;

    return {
      totalCourses,
      averageFinalScore: this.round(sumReducer("finalScore") / totalCourses),
      averageAttendanceScore: this.round(sumReducer("attendanceScore") / totalCourses),
      averageAssignmentScore: this.round(sumReducer("assignmentScore") / totalCourses),
      averageQuizScore: this.round(sumReducer("quizScore") / totalCourses),
      passRate: this.round(passRate),
    };
  }

  static async getStudentCourseStatistics(
    studentId: string,
    courseId: string,
    userRole: string,
    userId: string
  ) {
    if (userRole === "student" && userId !== studentId) {
      throw new Error("Access denied");
    }

    const course = await Course.findById(courseId).select("name members").lean();
    
    if (!course) {
      throw new Error("Student or course data not found.");
    }

    const enrollment = course.members?.find((m) => m.userId.toString() === studentId && m.role === "student" && !m.deletedAt);

    if (!enrollment) {
      throw new Error("Student is not enrolled in this course.");
    }

    const student = await User.findById(studentId).select("name email").lean();

    if (!student) {
      throw new Error("Student data not found.");
    }

    const { scoreComponent, finalScore } = await this.refreshStudentScores(courseId, studentId);
    await this.updateCourseRanking(courseId);
    const overview = await this.getStudentOverview(studentId);

    return {
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      course: {
        id: course._id,
        name: course.name,
      },
      scoreComponent,
      finalScore,
      overview,
    };
  }

  static async getStudentAssignmentDetails(
    studentId: string,
    courseId: string,
    userRole: string,
    userId: string
  ) {
    if (userRole === "student" && userId !== studentId) {
      throw new Error("Access denied");
    }

    const assignments = await Assignment.find({
      courseId: new mongoose.Types.ObjectId(courseId),
    })
      .sort({ createdAt: -1 })
      .lean();

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
      studentId: new mongoose.Types.ObjectId(studentId),
    }).lean();

    const submissionMap = new Map(
      submissions.map((submission) => [submission.assignmentId.toString(), submission])
    );

    const details = assignments.map((assignment) => {
      const submission = submissionMap.get(assignment._id.toString());
      let status: "submitted" | "missing" | "late" = "missing";
      if (submission) {
        if (submission.status === "late") {
          status = "late";
        } else if (
          submission.status === "submitted" ||
          submission.status === "graded"
        ) {
          status = "submitted";
        }
      }

      return {
        assignmentId: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
        status,
        score: submission?.score ?? null,
        submittedAt: submission?.submittedAt ?? null,
        files: submission?.files ?? [],
        feedbacks: submission?.feedbacks ?? [],
      };
    });

    return details;
  }

  static async getAllStudentsCourseStatistics(
    courseId: string,
    userRole: string,
    _userId: string
  ) {
    if (!["teacher", "admin"].includes(userRole)) {
      throw new Error("Access denied");
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    
    const course = await Course.findById(courseId).select("name members").populate("members.userId", "name email").lean();
    if (!course) {
      throw new Error("Course not found.");
    }

    const enrollments = course.members?.filter(m => m.role === "student" && !m.deletedAt) || [];

    const statistics = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentId = (enrollment.userId as any)._id.toString();
        const student = enrollment.userId as any;
        const { scoreComponent, finalScore } = await this.refreshStudentScores(
          courseId,
          studentId
        );
        return {
          student: {
            id: student._id,
            name: student.name,
            email: student.email,
          },
          scoreComponent,
          finalScore,
        };
      })
    );

    await this.updateCourseRanking(courseId);
    const ranking = await CourseRanking.findOne({ courseId: courseObjectId }).lean();

    return {
      course: {
        id: course._id,
        name: course.name,
      },
      students: statistics,
      summary: ranking?.statistics ?? {
        totalStudents: statistics.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        gradeDistribution: this.emptyGradeDistribution(),
      },
      rankings: ranking?.rankings ?? [],
    };
  }

  static async getAssignmentStatistics(
    assignmentId: string,
    userRole: string,
    _userId: string
  ) {
    if (!["teacher", "admin"].includes(userRole)) {
      throw new Error("Access denied");
    }

    const assignment = await Assignment.findById(assignmentId)
      .populate("courseId", "name")
      .lean();

    if (!assignment) {
      throw new Error("Assignment not found.");
    }

    const courseId = (assignment.courseId as any)._id.toString();
    const course = await Course.findById(courseId).select("members").populate("members.userId", "name email").lean();
    const enrollments = course?.members?.filter(m => m.role === "student" && !m.deletedAt) || [];

    const studentIds = enrollments.map((enrollment) => (enrollment.userId as any)._id);
    const submissions = await Submission.find({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      studentId: { $in: studentIds },
    }).lean();

    const submissionMap = new Map(
      submissions.map((submission) => [submission.studentId.toString(), submission])
    );

    const statistics = enrollments.map((enrollment) => {
      const studentId = (enrollment.userId as any)._id.toString();
      const student = enrollment.userId as any;
      const submission = submissionMap.get(studentId);
      let status: "submitted" | "missing" | "late" = "missing";
      if (submission) {
        if (submission.status === "late") {
          status = "late";
        } else if (
          submission.status === "submitted" ||
          submission.status === "graded"
        ) {
          status = "submitted";
        }
      }

      return {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
        status,
        score: submission?.score ?? null,
        submittedAt: submission?.submittedAt ?? null,
        files: submission?.files ?? [],
        feedbacks: submission?.feedbacks ?? [],
      };
    });

    const gradedSubmissions = submissions.filter(
      (submission) => submission.score !== null && submission.score !== undefined
    );
    const averageScore = gradedSubmissions.length
      ? this.round(
          gradedSubmissions.reduce((sum, submission) => sum + (submission.score || 0), 0) /
            gradedSubmissions.length
        )
      : 0;

    return {
      assignment: {
        id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
      },
      course: {
        id: courseId,
        name: (assignment.courseId as any).name,
      },
      students: statistics,
      summary: {
        totalStudents: statistics.length,
        submitted: submissions.length,
        graded: gradedSubmissions.length,
        averageScore,
      },
      totalStudents: statistics.length,
    };
  }

  static async getAllStudentsStatistics(userRole: string) {
    if (userRole !== "admin") {
      throw new Error("Only admins are authorized to view system-wide statistics.");
    }

    const rawStudents = await User.find({ role: "student" }).select("name email").lean();
    const students = rawStudents as unknown as Array<{
      _id: mongoose.Types.ObjectId;
      name?: string;
      email?: string;
    }>;
    const studentMap = new Map(students.map((student) => [student._id.toString(), student]));
    const rawFinalScores = await FinalScore.find().lean();
    const finalScores = rawFinalScores as unknown as Array<
      IFinalScore & { _id: mongoose.Types.ObjectId }
    >;
    const courseIds = Array.from(
      new Set(finalScores.map((score) => score.courseId.toString()))
    );
    const rawCourses = await Course.find({ _id: { $in: courseIds } })
      .select("name")
      .lean();
    const courses = rawCourses as unknown as Array<{ _id: mongoose.Types.ObjectId; name?: string }>;
    const courseMap = new Map(courses.map((course) => [course._id.toString(), course]));

    const zeroOverview = () => ({
      totalCourses: 0,
      averageFinalScore: 0,
      averageAttendanceScore: 0,
      averageAssignmentScore: 0,
      averageQuizScore: 0,
      passRate: 0,
    });

    const overviewMap = new Map<
      string,
      {
        student: { id: mongoose.Types.ObjectId; name: string; email: string };
        courses: Array<{
          courseId: mongoose.Types.ObjectId;
          courseName: string;
          attendanceScore: number;
          assignmentScore: number;
          quizScore: number;
          finalScore: number;
          grade: string;
          passed: boolean;
          rank?: number;
          totalStudents?: number;
        }>;
        overview: ReturnType<typeof zeroOverview>;
      }
    >();

    const ensureStudentEntry = (
      studentId: string,
      fallbackId: mongoose.Types.ObjectId
    ) => {
      if (!overviewMap.has(studentId)) {
        const studentInfo = studentMap.get(studentId);
        overviewMap.set(studentId, {
          student: {
            id: studentInfo?._id || fallbackId,
            name: studentInfo?.name || "N/A",
            email: studentInfo?.email || "",
          },
          courses: [],
          overview: zeroOverview(),
        });
      }
      return overviewMap.get(studentId)!;
    };

    // Ensure every student appears even without scores
    for (const student of students) {
      ensureStudentEntry(student._id.toString(), student._id);
    }

    for (const finalScore of finalScores) {
      const studentId = finalScore.studentId.toString();
      const studentEntry = ensureStudentEntry(studentId, finalScore.studentId);
      const courseId = finalScore.courseId.toString();
      const courseInfo = courseMap.get(courseId);

      studentEntry.courses.push({
        courseId: finalScore.courseId,
        courseName: courseInfo?.name || "N/A",
        attendanceScore: finalScore.attendanceScore,
        assignmentScore: finalScore.assignmentScore,
        quizScore: finalScore.quizScore,
        finalScore: finalScore.finalScore,
        grade: finalScore.grade,
        passed: finalScore.passed,
        rank: finalScore.rank ?? undefined,
        totalStudents: finalScore.totalStudents ?? undefined,
      });
    }

    for (const entry of overviewMap.values()) {
      const totalCourses = entry.courses.length;
      if (!totalCourses) {
        entry.overview = zeroOverview();
        continue;
      }

      const totals = entry.courses.reduce(
        (acc, course) => {
          acc.attendance += course.attendanceScore;
          acc.assignment += course.assignmentScore;
          acc.quiz += course.quizScore;
          acc.final += course.finalScore;
          if (course.passed) acc.passCount += 1;
          return acc;
        },
        { attendance: 0, assignment: 0, quiz: 0, final: 0, passCount: 0 }
      );

      entry.overview = {
        totalCourses,
        averageAttendanceScore: this.round(totals.attendance / totalCourses),
        averageAssignmentScore: this.round(totals.assignment / totalCourses),
        averageQuizScore: this.round(totals.quiz / totalCourses),
        averageFinalScore: this.round(totals.final / totalCourses),
        passRate: this.round((totals.passCount / totalCourses) * 100),
      };
    }

    return Array.from(overviewMap.values());
  }
}
