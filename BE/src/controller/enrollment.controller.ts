import { Request, Response } from "express";
import Enrollment from "../model/enrollment.model";
import { Course } from "../model/course.model";
import { extractTextFromFile } from "../service/file.service";
import { extractInfoFromCV } from "../service/ai.service";
import { CVInfo } from "../types/cv.types.js";
import { uploadToCloudinary } from "../service/cloundinary.service";
import { User } from "../model/user.model";
import { CourseMember } from "../model/courseMember.model";
import NotificationService from "../service/notification.service";
import { sendApprovalEmail, sendRejectionEmail } from "../service/email.service";
import { FinalScore, ScoreComponent } from "../model/score.model";

export const uploadCV = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const text = await extractTextFromFile(file);
    const info: CVInfo = await extractInfoFromCV(text);

    res.json({ success: true, data: info });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🎯 Student đăng ký khóa học
export const enrollCourse = async (req: Request, res: Response) => {
  try {
    const { courseId, cvInfo } = req.body;
    const file = req.file;

    if (!courseId || !cvInfo) {
      return res.status(400).json({ message: "Missing necessary information." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    let parsedCV;
    try {
      parsedCV = typeof cvInfo === "string" ? JSON.parse(cvInfo) : cvInfo;
    } catch {
      return res.status(400).json({ message: "Invalid cvInfo." });
    }

    const { name, email } = parsedCV;
    if (!name || !email) {
      return res.status(400).json({ message: "CV must have name and email." });
    }

    const enrollmentExisted = await Enrollment.findOne({ studentEmail: email});
    if (enrollmentExisted) {
      return res.status(400).json({ message: "You cannot register twice." });
    }

    const accountExisted = await User.findOne({ email });
    if (accountExisted) {
      return res.status(400).json({ message: "Email đã được sử dụng để tạo tài khoản." });
    }

    let fileUrl = "";
    if (file) {
      const urls = await uploadToCloudinary(file);
      fileUrl = urls[0] as string;
    }

    const enrollment = await Enrollment.create({
      studentName: name,
      studentEmail: email,
      courseId,
      cvBirthday: parsedCV.birthday,
      cvPhone: parsedCV.phone,
      cvEducation: parsedCV.education,
      cvExperience: parsedCV.experience,
      cvSkills: parsedCV.skills,
      cvCertifications: parsedCV.certifications,
      cvProjects: parsedCV.projects,
      cvFileUrl: fileUrl,
      status: "pending",
    });

    // Notify all admins about new enrollment request
    try {
      await NotificationService.notifyEnrollmentRequest({
        studentName: name,
        studentEmail: email,
        courseName: course.name,
        enrollmentId: (enrollment._id as any).toString(),
      });
    } catch (notifErr) {
      console.error("⚠️ Error sending enrollment request notification:", notifErr);
      // Don't fail the enrollment creation if notification fails
    }

    return res.status(201).json({
      message: "Enrollment request sent successfully!",
      data: enrollment,
    });
  } catch (error) {
    console.error("❌ Error enrolling in course:", error);
    res.status(500).json({ message: "Error enrolling in course." });
  }
};
export const approveEnrollment = async (req: Request, res: Response) => {
  try {
    const enrollmentId = req.params.id;

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (enrollment.status !== "pending") {
      return res.status(400).json({ message: "This enrollment has already been processed" });
    }

    // ✅ Cập nhật trạng thái
    enrollment.status = "approved";
    await enrollment.save();

    // ✅ Tăng enrolledCount
    const course = await Course.findByIdAndUpdate(
      enrollment.courseId,
      { $inc: { enrolledCount: 1 } },
      { new: true }
    );

    // ✅ Auto tạo User nếu chưa tồn tại
    let user = await User.findOne({ email: enrollment.studentEmail });

    if (!user) {
      user = await User.create({
        name: enrollment.studentName,
        email: enrollment.studentEmail,
        username: enrollment.studentEmail.split("@")[0],
        role: "student",
        password: null,
      });
    }

    // ✅ Auto add vào CourseMember
    const existed = await CourseMember.findOne({
      courseId: enrollment.courseId,
      userId: user._id,
    });

    if (!existed) {
      await CourseMember.create({
        courseId: enrollment.courseId,
        userId: user._id,
        role: "student",
        enrolledAt: new Date(),
      });
    }
    //tạo bản ghi score
    const scoreExists = await ScoreComponent.findOne({
      courseId: enrollment.courseId,
      studentId: user._id,
    });

    if (!scoreExists) {
      await ScoreComponent.create({
        courseId: enrollment.courseId,
        studentId: user._id,
        studentName:user.name,
        attendanceScore: 0,
        assignmentScore: 0,
        quizScore: 0,
      });
    }

    // Tạo Final Score
    const finalExists = await FinalScore.findOne({
      courseId: enrollment.courseId,
      studentId: user._id,
    });

    if (!finalExists) {
      await FinalScore.create({
        courseId: enrollment.courseId,
        studentId: user._id,
        midterm: 0,
        final: 0,
        overall: 0,
      });
    }

    try {
      await sendApprovalEmail(
        enrollment.studentEmail,
        enrollment.studentName,
        course?.name || "Course"
      );
    } catch (err) {
      console.error("Error sending email:", err);
      // Không break logic chính — chỉ log lỗi email
    }

    res.status(200).json({
      message: "Enrollment approved successfully",
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({ message: "Error approving enrollment", error });
  }
};

// ❌ Admin từ chối đơn
export const rejectEnrollment = async (req: Request, res: Response) => {
  try {
    const enrollmentId = req.params.id;
    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (enrollment.status !== "pending") {
      return res.status(400).json({ message: "This enrollment has already been processed" });
    }

    enrollment.status = "rejected";
    await enrollment.save();

    const course = await Course.findById(enrollment.courseId);

    try {
      await sendRejectionEmail(
        enrollment.studentEmail,
        enrollment.studentName,
        course?.name || "Course"
      );
    } catch (err) {
      console.error("Error sending email:", err);
      // Không break logic chính — chỉ log lỗi email
    }

    res.status(200).json({
      message: "Enrollment rejected successfully",
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting enrollment", error });
  }
};

// 📋 Lấy danh sách tất cả đơn đăng ký (Admin)
export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    // Lấy status từ query nếu có (vd: ?status=pending)
    const { status } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    // Populate thêm thông tin khóa học để admin xem rõ
    const enrollments = await Enrollment.find(filter)
      .populate("courseId", "name managerName startDate endDate")
      .populate("studentName")
      .populate("studentEmail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Get enrollment list successfully",
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({ message: "Error getting enrollment list", error });
  }
};

// 🧑‍🎓 Lấy danh sách đơn đăng ký của chính student đang đăng nhập
export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    const studentId = req.id; // lấy từ middleware verifyToken

    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId", "name startDate endDate managerName status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Lấy danh sách đơn đăng ký của bạn thành công",
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error("❌ Error getting student's enrollments:", error);
    res.status(500).json({ message: "Error getting your enrollment list" });
  }
};