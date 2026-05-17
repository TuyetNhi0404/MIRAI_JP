import { CourseMember } from "../model/courseMember.model";

class CourseMemberService {
  async getStudentsByCourse(courseId: string) {
    return CourseMember.find({
      courseId,
      role: "student",
      deletedAt: null,
    }).populate("userId", "name fullName username email avatar");
  }

  async getTeachersByCourse(courseId: string) {
    return CourseMember.find({
      courseId,
      role: "teacher",
      deletedAt: null,
    }).populate("userId", "name fullName username email avatar");
  }

  async addMember(courseId: string, userId: string, role: "student" | "teacher") {
    return CourseMember.create({
      courseId,
      userId,
      role,
    });
  }
  async deleteCourseMember(courseId: string, memberId: string, deletedBy: string) {
    return CourseMember.findOneAndUpdate(
      {
        userId: memberId,
        courseId,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
        deletedBy,
      },
      { new: true }
    );
  }
  async getDeletedStudentsByCourse(courseId: string) {
    return CourseMember.find({
      courseId,
      role: "student",
      deletedAt: { $ne: null },
    }).populate("userId", "name fullName username email avatar");
  }

// Chuyển lớp cho một sinh viên
  async transferStudent(
    studentId: string,
    fromCourseId: string,
    toCourseId: string,
    transferredBy: string
  ) {
    // Kiểm tra sinh viên có tồn tại trong lớp cũ không
    const existingMember = await CourseMember.findOne({
      userId: studentId,
      courseId: fromCourseId,
      role: "student",
      deletedAt: null,
    });

    if (!existingMember) {
      throw new Error("Student not found in this class");
    }

    // Kiểm tra sinh viên đã có trong lớp mới chưa
    const alreadyInNewCourse = await CourseMember.findOne({
      userId: studentId,
      courseId: toCourseId,
      deletedAt: null,
    });

    if (alreadyInNewCourse) {
      throw new Error("Student already exists in the new class");
    }

    // Xóa sinh viên khỏi lớp cũ (soft delete)
    await CourseMember.findByIdAndUpdate(
      existingMember._id,
      {
        deletedAt: new Date(),
        deletedBy: transferredBy,
      },
      { new: true }
    );

    // Thêm sinh viên vào lớp mới
    const newMember = await CourseMember.create({
      userId: studentId,
      courseId: toCourseId,
      role: "student",
      transferredFrom: fromCourseId,
      transferredBy,
      transferredAt: new Date(),
    });

    return {
      fromCourse: fromCourseId,
      toCourse: toCourseId,
      student: studentId,
      transferredAt: new Date(),
      status: "success",
    };
  }
}
export default new CourseMemberService();