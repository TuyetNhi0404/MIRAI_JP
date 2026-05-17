import { Request, Response } from "express";
import CourseMemberService from "../service/courseMember.service";
import { User } from "../model/user.model";
import { Course } from "../model/course.model";
import Enrollment from "../model/enrollment.model";

// Lấy danh sách học viên của một khóa học
export const getCourseStudents = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request." });
    }

    // Gọi service để lấy danh sách học viên
    const students = await CourseMemberService.getStudentsByCourse(courseId);
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving student list.", error });
  }
};

// Lấy danh sách giáo viên của một khóa học
export const getCourseTeachers = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request." });
    }
    // Gọi service để lấy danh sách giáo viên
    const teachers = await CourseMemberService.getTeachersByCourse(courseId);

    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving teacher list.",
      error,
    });
  }
};

export const addCourseMember = async (req: Request, res: Response) => {
  try {
    const { courseId, userId, role } = req.body;
    const member = await CourseMemberService.addMember(courseId, userId, role);

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({
      message: "Error while add member.",
      error,
    });
  }
};

export const deleteCourseMember = async (req: Request, res: Response) => {
  try {
    const { courseId, memberId } = req.params;
    
    const deletedById = req.id;

    // Kiểm tra 
    if (!deletedById) {
      return res.status(401).json({
        message: "Unable to identify user information. Please log in again."
      });
    }

    // Kiểm tra 
    if (!courseId || !memberId) {
      return res.status(400).json({ message: "Missing courseId or memberId." });
    }

    // Lấy thông tin khóa học để kiểm tra trạng thái
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Lấy thông tin user trước khi xóa/khóa
    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Xử lý dựa trên trạng thái của khóa học
    // Khi xóa học viên khỏi khóa học, cũng xóa tất cả các yêu cầu đăng ký của họ
    if (user.role === "student") {
      const emailFilter = user.email || null;
      const deleteFilter: any = {
        $or: [
          { userId: memberId },
          { studentId: memberId },
        ],
      };

      if (emailFilter) deleteFilter.$or.push({ studentEmail: emailFilter });

      // Xóa tất cả các đơn đăng ký thuộc về người dùng này
      await Enrollment.deleteMany(deleteFilter);

      // Nếu khóa học chưa bắt đầu, chúng tôi dự định xóa hoàn toàn tài khoản học viên
      if (course.status === "not_yet") {
        await User.findByIdAndDelete(memberId);
      }
    } else if (course.status === "in_progress") {
      // Trạng thái "in_progress": Khóa tài khoản người dùng
      await User.findByIdAndUpdate(memberId, { status: "locked" });
    } else if (course.status === "complete") {
      // Trạng thái "complete": Không cho phép xóa thành viên
      return res.status(400).json({
        message: "Cannot remove member from a completed course."
      });
    }

    // Xóa thành viên khóa học
    const result = await CourseMemberService.deleteCourseMember(
      courseId,
      memberId,
      deletedById
    );

    return res.status(200).json({
      message: "Member removed successfully.",
      data: result,
      userAction: course.status === "not_yet" ? "deleted" : "locked"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error removing member.",
      error,
    });
  }
};

// Lấy danh sách học viên đã xóa của một khóa học
export const getDeletedCourseStudents = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request." });
    }

    // Gọi service để lấy danh sách học viên đã xóa
    const deletedStudents = await CourseMemberService.getDeletedStudentsByCourse(courseId);
    return res.status(200).json(deletedStudents);
  } catch (error) { 
    return res.status(500).json({ message: "Error retrieving deleted students list.", error });
  }
};

export const transferStudent = async (req: Request, res: Response) => {
  try {
    const { fromCourseId, toCourseId } = req.body;
    const { studentId } = req.params;
    const transferredBy = req.id;
    
    if (!studentId) {
      return res.status(400).json({
        message: "Student ID missing in URL.",
      });
    }

    if (!fromCourseId || !toCourseId) {
      return res.status(400).json({
        message: "fromCourseId and toCourseId are required in the request body.",
      });
    }

    if (!transferredBy) {
      return res.status(401).json({
        message: "Unable to identify user. Please log in again.",
      });
    }

    if (fromCourseId === toCourseId) {
      return res.status(400).json({
        message: "The 'from' course and 'to' course cannot be the same.",
      });
    }

    // Kiểm tra trạng thái khóa học "từ"
    const fromCourse = await Course.findById(fromCourseId);
    if (!fromCourse) {
      return res.status(404).json({
        message: "From course not found.",
      });
    }

    if (fromCourse.status !== "not_yet") {
      return res.status(400).json({
        message: "Student can only be transferred from a course with 'not_yet' status.",
      });
    }

    // Kiểm tra trạng thái khóa học "đến"
    const toCourse = await Course.findById(toCourseId);
    if (!toCourse) {
      return res.status(404).json({
        message: "To course not found.",
      });
    }

    if (toCourse.status !== "not_yet") {
      return res.status(400).json({
        message: "Student can only be transferred to a course with 'not_yet' status.",
      });
    }

    const result = await CourseMemberService.transferStudent(
      studentId,
      fromCourseId,
      toCourseId,
      transferredBy
    );

    return res.status(200).json({
      message: "Student transferred successfully.",
      data: result,
    });

  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while transferring the student.",
    });
  }
};