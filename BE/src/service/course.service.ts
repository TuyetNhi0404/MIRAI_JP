import { Course, ICourse } from "../model/course.model";

export class CourseService {
  static async create(data: Partial<ICourse>) {
    const course = new Course(data);
    return await course.save();
  }

  static async getAll() {
    return await Course.find();
  }

  static async getById(id: string) {
    return await Course.findById(id);
  }

  static async update(id: string, data: Partial<ICourse>) {
    return await Course.findByIdAndUpdate(id, data, { new: true });
  }

  static async remove(id: string) {
    return await Course.findByIdAndDelete(id);
  }

  // --- Member Logic ---

  static async getStudentsByCourse(courseId: string) {
    const course = await Course.findById(courseId).populate({
      path: "members.userId",
      select: "name fullName username email avatar",
    });
    if (!course) return [];
    return course.members
      .filter((m) => m.role === "student" && !m.deletedAt)
      .map((m) => ({ ...(m as any).toJSON(), userId: m.userId }));
  }

  static async getTeachersByCourse(courseId: string) {
    const course = await Course.findById(courseId).populate({
      path: "members.userId",
      select: "name fullName username email avatar",
    });
    if (!course) return [];
    return course.members
      .filter((m) => m.role === "teacher" && !m.deletedAt)
      .map((m) => ({ ...(m as any).toJSON(), userId: m.userId }));
  }

  static async addMember(courseId: string, userId: string, role: "student" | "teacher") {
    const course = await Course.findById(courseId);
    if (!course) throw new Error("Course not found");

    const existingMember = course.members.find(
      (m) => m.userId.toString() === userId && !m.deletedAt
    );
    if (existingMember) throw new Error("User already in course");

    course.members.push({
      userId: userId as any,
      role,
      enrolledAt: new Date(),
    });
    course.enrolledCount = course.members.filter(m => m.role === "student" && !m.deletedAt).length;

    await course.save();

    if (role === "student") {
      try {
        const { ScoreComponent, FinalScore } = require("../model/score.model");
        const existed = await FinalScore.findOne({ courseId, studentId: userId });
        if (!existed) {
          console.log(`[Score Init] Creating ScoreComponent + FinalScore for student ${userId} in course ${courseId}`);
          await ScoreComponent.create({
            courseId,
            studentId: userId,
            attendanceScore: 0,
            assignmentScore: 0,
            quizScore: 0,
          });
          await FinalScore.create({
            courseId,
            studentId: userId,
            attendanceScore: 0,
            assignmentScore: 0,
            quizScore: 0,
            weights: { attendance: 20, assignment: 40, quiz: 40 },
            finalScore: 0,
            grade: "F",
            passed: false,
            rank: null,
            totalStudents: null,
            calculatedAt: new Date(),
          });
          console.log(`[Score Init] DONE`);
        }
      } catch (err) {
        console.error("[Course Service] Failed to create score:", err);
      }
    }

    return course;
  }

  static async deleteCourseMember(courseId: string, memberId: string, deletedBy: string) {
    const course = await Course.findById(courseId);
    if (!course) throw new Error("Course not found");

    const member = course.members.find(
      (m) => m.userId.toString() === memberId && !m.deletedAt
    );
    if (!member) throw new Error("Member not found in this course");

    member.deletedAt = new Date();
    member.deletedBy = deletedBy;
    course.enrolledCount = course.members.filter(m => m.role === "student" && !m.deletedAt).length;

    return await course.save();
  }

  static async getDeletedStudentsByCourse(courseId: string) {
    const course = await Course.findById(courseId).populate({
      path: "members.userId",
      select: "name fullName username email avatar",
    });
    if (!course) return [];
    return course.members
      .filter((m) => m.role === "student" && m.deletedAt)
      .map((m) => ({ ...(m as any).toJSON(), userId: m.userId }));
  }

  static async transferStudent(
    studentId: string,
    fromCourseId: string,
    toCourseId: string,
    transferredBy: string
  ) {
    const fromCourse = await Course.findById(fromCourseId);
    if (!fromCourse) throw new Error("Source course not found");

    const toCourse = await Course.findById(toCourseId);
    if (!toCourse) throw new Error("Destination course not found");

    const existingMember = fromCourse.members.find(
      (m) => m.userId.toString() === studentId && m.role === "student" && !m.deletedAt
    );
    if (!existingMember) throw new Error("Student not found in source course");

    const alreadyInNewCourse = toCourse.members.find(
      (m) => m.userId.toString() === studentId && !m.deletedAt
    );
    if (alreadyInNewCourse) throw new Error("Student already exists in the new class");

    // Remove from source
    existingMember.deletedAt = new Date();
    existingMember.deletedBy = transferredBy;
    fromCourse.enrolledCount = fromCourse.members.filter(m => m.role === "student" && !m.deletedAt).length;
    await fromCourse.save();

    // Add to destination
    toCourse.members.push({
      userId: studentId as any,
      role: "student",
      enrolledAt: new Date(),
    });
    toCourse.enrolledCount = toCourse.members.filter(m => m.role === "student" && !m.deletedAt).length;
    await toCourse.save();

    return {
      fromCourse: fromCourseId,
      toCourse: toCourseId,
      student: studentId,
      transferredAt: new Date(),
      status: "success",
    };
  }
}
