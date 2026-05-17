import { Request, Response } from "express";
import { deleteFileFromCloudinary, uploadToCloudinary } from "../service/cloundinary.service";
import { createAssignment } from "../service/assignment.service";
import { Assignment, IAssignment } from "../model/assignment.model";
import { User } from "../model/user.model";
import Enrollment from "../model/enrollment.model";
import multer from "multer";
import NotificationService from "../service/notification.service";
import mongoose, { Schema } from "mongoose";
// CẤU HÌNH MULTER (Upload file lên bộ nhớ RAM)
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// TẠO BÀI TẬP MỚI
export const createAssignmentController = async (req: Request, res: Response) => {
  try {
    const { title, courseId, status, dueDate, maxScore, description } = req.body;
    const teacherId = new mongoose.Types.ObjectId(req.id);

    if (!teacherId) {
      return res.status(401).json({
        message: "Unable to identify teacher (token error or expired)",
      });
    }

    if (!title || !courseId || !dueDate || !maxScore) {
      return res.status(400).json({ message: "Missing required information" });
    }

    let fileUrls: string[] = [];

    // Upload file(s) lên Cloudinary
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      fileUrls = await uploadToCloudinary(req.files);
    } else if (req.file) {
      fileUrls = await uploadToCloudinary(req.file);
    }

    // SAVE ASSIGNMENT
    const newAssignment = await createAssignment({
      title,
      courseId,
      description: description || "",
      status: status || "draft",
      dueDate,
      maxScore,
      fileUrls,
      createdBy: teacherId as unknown as Schema.Types.ObjectId,
    });

    // SEND NOTIFICATION IF STATUS IS ACTIVE/PUBLISHED
    if (status === "published" || status === "active") {
      try {
        const enrollments = await Enrollment.find({
          courseId: courseId,
          status: "approved",
        }).select("studentEmail");

        const studentEmails = enrollments.map(e => e.studentEmail);

      const students = await User.find({
          email: { $in: studentEmails },
          role: "student",
        }).select("_id");

      const studentIds = students.map((s) => (s._id as mongoose.Types.ObjectId).toString());

        if (studentIds.length > 0) {
          await NotificationService.notifyNewAssignment(
            (newAssignment._id as mongoose.Types.ObjectId).toString(),
            courseId,
            title,
            new Date(dueDate),
            studentIds
          );
        }
      } catch (notifErr) {
        console.error("Error sending notification:", notifErr);
      }
    }

    // Populate teacher name
    const teacher = await User.findById(teacherId).select("name");
    const assignmentWithTeacher = {
      ...newAssignment.toObject(),
      teacherName: teacher?.name || "Unknown",
    };

    return res.status(201).json({
      message: "Created assignment successfully",
      data: assignmentWithTeacher,
      uploadedFiles: fileUrls,
    });
  } catch (err: unknown) {
    console.error("Error creating assignment:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      message: "Server error",
      error: errorMessage,
    });
  }
};

const ensureStudentEnrollment = async (req: Request, courseId: string) => {
  if (req.role !== "student") {
    return { allowed: true };
  }

  const studentId = req.id;
  if (!studentId) {
    return {
      allowed: false,
      status: 401,
      message: "Student not identified.",
    };
  }

  const student = await User.findById(studentId).select("email");
  if (!student?.email) {
    return {
      allowed: false,
      status: 404,
      message: "Student information not found.",
    };
  }

  const enrollment = await Enrollment.findOne({
    courseId,
    studentEmail: student.email.toLowerCase(),
    status: "approved",
  });

  if (!enrollment) {
    return {
      allowed: false,
      status: 403,
      message: "You are not enrolled in this course.",
    };
  }

  return { allowed: true };
};

// LẤY DANH SÁCH BÀI TẬP THEO KHÓA HỌC
export const getAssignmentsByCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId, idOrTitle } = req.params;
    const { status, search } = req.query;

    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request." });
    }

    const enrollmentCheck = await ensureStudentEnrollment(req, courseId);
    if (!enrollmentCheck.allowed) {
      return res.status(enrollmentCheck.status || 403).json({ message: enrollmentCheck.message || "Không có quyền truy cập." });
    }

    // Nếu có idOrTitle → lấy 1 bài tập cụ thể
    if (idOrTitle) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrTitle);
      const assignment = isObjectId
        ? await Assignment.findOne({ _id: idOrTitle, courseId }).populate("courseId", "name")
        : await Assignment.findOne({ title: idOrTitle, courseId }).populate("courseId", "name");

      if (!assignment) {
        return res.status(404).json({
          message: `Assignment "${idOrTitle}" not found in course.`,
        });
      }

      // Populate teacher name
      const teacher = await User.findById(assignment.createdBy).select("name");
      const course =
        assignment.courseId && typeof (assignment.courseId as { name?: string }).name === "string"
          ? (assignment.courseId as { name?: string })
          : undefined;

      const assignmentFormatted = {
        ...assignment.toObject(),
        courseName: course?.name || "Unknown Course",
        teacherName: teacher?.name || "Unknown",
      };

      return res.status(200).json({
        message: "Get assignment information successfully.",
        courseId,
        assignment: assignmentFormatted,
      });
    }

    // Nếu KHÔNG có idOrTitle lấy danh sách tất cả bài tập
    const query: { [key: string]: unknown } = { courseId };

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by title
    if (search && typeof search === "string" && search.trim()) {
      query.title = { $regex: search.trim(), $options: "i" };
    }

    const assignments = await Assignment.find(query)
      .populate("courseId", "name")
      .sort({ createdAt: -1 })
      .select("title description status dueDate maxScore fileUrls createdBy createdAt updatedAt");

    // Populate teacher names and course names
    const assignmentsFormatted = await Promise.all(
      assignments.map(async (assignment) => {
        const teacher = await User.findById(assignment.createdBy).select("name");
        const course =
          assignment.courseId && typeof (assignment.courseId as { name?: string }).name === "string"
            ? (assignment.courseId as { name?: string })
            : undefined;

        return {
          ...assignment.toObject(),
          courseName: course?.name || "Unknown Course",
          teacherName: teacher?.name || "Unknown",
        };
      })
    );

    if (!assignmentsFormatted.length) {
      return res.status(404).json({ message: "There are no assignments for this course." });
    }

    return res.status(200).json({
      message: "Get list of successful exercises.",
      courseId,
      totalAssignments: assignmentsFormatted.length,
      assignments: assignmentsFormatted,
    });
  } catch (error: unknown) {
    console.error("Error when getting list of exercises:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Server error",
      error: errorMessage,
    });
  }
};

// LẤY TẤT CẢ BÀI TẬP (KHÔNG CẦN courseId)
export const getAllAssignmentsController = async (req: Request, res: Response) => {
  try {
    const { status, search, limit = "20", page = "1" } = req.query;

    const query: { [key: string]: unknown } = {};

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by title
    if (search && typeof search === "string" && search.trim()) {
      query.title = { $regex: search.trim(), $options: "i" };
    }

    if (req.role === "student") {
      const studentId = req.id;
      if (!studentId) {
        return res.status(401).json({ message: "Student not identified." });
      }

      const student = await User.findById(studentId).select("email");
      if (!student?.email) {
        return res.status(404).json({ message: "Student information not found." });
      }

      const enrollments = await Enrollment.find({
        studentEmail: student.email.toLowerCase(),
        status: "approved",
      }).select("courseId");

      const courseIds = enrollments.map((enrollment) => enrollment.courseId);

      if (!courseIds.length) {
        return res.status(200).json({
          message: "You are not enrolled in any course.",
          total: 0,
          page: 1,
          limit: Number(limit) || 20,
          totalPages: 0,
          assignments: [],
        });
      }

      query.courseId = { $in: courseIds };
    }

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("title courseId description status dueDate maxScore fileUrls createdBy createdAt updatedAt")
        .populate("courseId", "name")
        .populate("createdBy", "name"),
      Assignment.countDocuments(query),
    ]);

    const assignmentsFormatted = assignments.map((assignment) => {
      const course =
        assignment.courseId && typeof (assignment.courseId as { _id?: string; name?: string }).name === "string"
          ? (assignment.courseId as { _id?: string; name?: string })
          : undefined;

      const creator =
        assignment.createdBy && typeof (assignment.createdBy as { name?: string }).name === "string"
          ? (assignment.createdBy as { name?: string })
          : undefined;

      return {
        _id: assignment._id,
        id: assignment._id,
        title: assignment.title,
        courseId: course?._id || assignment.courseId,
        courseName: course?.name || "Unknown Course",
        description: assignment.description || "",
        status: assignment.status,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
        fileUrls: assignment.fileUrls || [],
        teacherName: creator?.name || "Unknown",
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      };
    });

    return res.status(200).json({
      message: "Get list of successful exercises.",
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      assignments: assignmentsFormatted,
    });
  } catch (error: unknown) {
    console.error("Error when getting all exercises:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Server error",
      error: errorMessage,
    });
  }
};

// CẬP NHẬT BÀI TẬP
export const updateAssignmentController = async (req: Request, res: Response) => {
  try {
    const { idOrTitle, courseId } = req.params;
    const { title, description, status, dueDate, maxScore, deleteFiles } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request" });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrTitle as string);
    const existingAssignment = isObjectId
      ? await Assignment.findOne({ _id: idOrTitle, courseId })
      : await Assignment.findOne({ title: idOrTitle, courseId });

    if (!existingAssignment) {
      return res.status(404).json({
        message: "No exercises found in this course",
      });
    }

    const wasActive = existingAssignment.status === "active";
    const willBeActive = status === "active";
    const justActivated = !wasActive && willBeActive;

    // Chuẩn hóa fileUrls hiện tại
    let currentFileUrls: string[] = Array.isArray(existingAssignment.fileUrls)
      ? existingAssignment.fileUrls
      : existingAssignment.fileUrls
        ? [existingAssignment.fileUrls]
        : [];

    // Xóa file cũ nếu FE gửi danh sách cần xóa
    if (deleteFiles) {
      let deleteList: string[] = [];

      if (typeof deleteFiles === "string") {
        try {
          deleteList = JSON.parse(deleteFiles);
        } catch {
          deleteList = deleteFiles.split(",").map((s) => s.trim());
        }
      } else if (Array.isArray(deleteFiles)) {
        deleteList = deleteFiles;
      }

      for (const url of deleteList) {
        await deleteFileFromCloudinary(url);
        currentFileUrls = currentFileUrls.filter((f) => f !== url);
      }
    }

    // Upload file mới (nếu có)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      const newFileUrls = await uploadToCloudinary(files);
      currentFileUrls = [...currentFileUrls, ...newFileUrls];
    }

    // Cập nhật thông tin
    if (title) existingAssignment.title = title;
    if (description !== undefined) existingAssignment.description = description;
    if (status) existingAssignment.status = status;
    if (dueDate) existingAssignment.dueDate = new Date(dueDate);
    if (maxScore) existingAssignment.maxScore = Number(maxScore);
    existingAssignment.fileUrls = currentFileUrls;

    await existingAssignment.save();

    // ✅ ONLY notify when assignment becomes active for the first time
    if (justActivated) {
      try {
        // ✅ Get ONLY approved students enrolled in THIS SPECIFIC COURSE
        const enrollments = await Enrollment.find({
          courseId: courseId,
          status: "approved"
        }).select("studentEmail");

        if (enrollments.length > 0) {
          // Get user IDs from emails
          const studentEmails = enrollments.map(e => e.studentEmail);

          // ✅ Find users with role "student" to exclude teachers
          const students = await User.find({
            email: { $in: studentEmails },
            role: "student" // ✅ ONLY students, exclude teachers
          }).select("_id");

          const studentIds = students.map((s) => (s._id as mongoose.Types.ObjectId).toString());

          if (studentIds.length > 0) {
            await NotificationService.notifyNewAssignment(
              (existingAssignment._id as mongoose.Types.ObjectId).toString(),
              courseId,
              existingAssignment.title,
              existingAssignment.dueDate,
              studentIds
            );
            console.log(`✅ Sent assignment activation notifications to ${studentIds.length} students in course ${courseId}`);
          }
        }
      } catch (notifErr) {
        console.error("Error sending notification:", notifErr);
      }
    }

    // Populate teacher name
    const teacher = await User.findById(existingAssignment.createdBy).select("name");
    const assignmentWithTeacher = {
      ...existingAssignment.toObject(),
      teacherName: teacher?.name || "Unknown",
    };

    return res.status(200).json({
      message: "Update assignment successfully",
      data: assignmentWithTeacher,
    });
  } catch (err: unknown) {
    console.error("Error updating assignment:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: "Server error", error: errorMessage });
  }
};

// XOÁ BÀI TẬP
export const deleteAssignmentController = async (req: Request, res: Response) => {
  try {
    const { courseId, idOrTitle } = req.params;

    if (!courseId || !idOrTitle) {
      return res.status(400).json({
        message: "Missing courseId or assignment id/title.",
      });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrTitle);

    const assignment = isObjectId
      ? await Assignment.findOne({ _id: idOrTitle, courseId })
      : await Assignment.findOne({ title: idOrTitle, courseId });

    if (!assignment) {
      return res.status(404).json({
        message: "No exercises found in this course.",
      });
    }

    const failedDeletes: string[] = [];

    // Xóa file trên Cloudinary
    if (assignment.fileUrls && assignment.fileUrls.length > 0) {
      for (const fileUrl of assignment.fileUrls) {
        try {
          await deleteFileFromCloudinary(fileUrl);
        } catch (err) {
          console.warn(`Unable to delete files on Cloudinary: ${fileUrl}`, err);
          failedDeletes.push(fileUrl);
        }
      }
    }

    // Nếu có lỗi khi xóa file, KHÔNG xóa bài tập
    if (failedDeletes.length > 0) {
      return res.status(500).json({
        message: "Some files cannot be deleted on Cloudinary. The assignment has not been deleted from the system.",
        failedFiles: failedDeletes,
      });
    }

    // Xóa bài tập trong DB
    await Assignment.deleteOne({ _id: assignment._id });

    return res.status(200).json({
      message: `Deleted assignment "${assignment.title}" in the course "${courseId}" with all attachments.`,
    });
  } catch (error: unknown) {
    console.error("Error when deleting assignment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Server error.",
      error: errorMessage,
    });
  }
};

//Lấy danh sách bt active (student)
export const getActiveAssignmentsController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { search, limit = "20", page = "1" } = req.query;

    if (!courseId) {
      return res.status(400).json({ message: "Missing courseId in request." });
    }

    // Chỉ lấy các assignment 'active' trong đúng khóa học
    const enrollmentCheck = await ensureStudentEnrollment(req, courseId);
    if (!enrollmentCheck.allowed) {
      return res.status(enrollmentCheck.status || 403).json({ message: enrollmentCheck.message || "Không có quyền truy cập." });
    }

    const query: { [key: string]: unknown } = {
      courseId,
      status: "active",
    };

    // Tìm kiếm theo tiêu đề
    if (search && typeof search === "string" && search.trim()) {
      query.title = { $regex: search.trim(), $options: "i" };
    }

    // Phân trang
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    // Truy vấn
    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .sort({ dueDate: 1 }) // sắp xếp gần hạn lên đầu
        .skip(skip)
        .limit(limitNum)
        .select("title courseId description status dueDate maxScore fileUrls createdBy createdAt updatedAt")
        .populate("courseId", "name")
        .populate("createdBy", "name"),
      Assignment.countDocuments(query),
    ]);

    const assignmentsFormatted = assignments.map((assignment) => {
      const course =
        assignment.courseId && typeof (assignment.courseId as { _id?: string; name?: string }).name === "string"
          ? (assignment.courseId as { _id?: string; name?: string })
          : undefined;

      return {
        _id: assignment._id,
        id: assignment._id,
        title: assignment.title,
        courseId: course?._id || assignment.courseId,
        courseName: course?.name,
        description: assignment.description || "",
        status: assignment.status,
        dueDate: assignment.dueDate,
        isLate: assignment.dueDate && new Date(assignment.dueDate) < new Date(),
        maxScore: assignment.maxScore,
        fileUrls: assignment.fileUrls || [],
        teacherName: (assignment.createdBy as { name?: string })?.name || "Unknown",
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      };
    });

    return res.status(200).json({
      message: "Get a list of active assignments in the successful course.",
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      assignments: assignmentsFormatted,
    });
  } catch (error: unknown) {
    console.error("Error when getting active exercise:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Server error",
      error: errorMessage,
    });
  }
};

const autoUpdateExpiredAssignments = async () => {
  try {
    const now = new Date();

    // Tìm các bài active mà đã quá hạn
    const expiredAssignments = await Assignment.find({
      status: "active",
      dueDate: { $lt: now },
    });

    if (expiredAssignments.length > 0) {
      const expiredIds = expiredAssignments.map((a) => a._id);
      await Assignment.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: "closed" } }
      );
      expiredAssignments.forEach((a) => {
        console.log(`Assignment ${a.title} (expiration: ${a.dueDate.toLocaleString()}) was automatically closed`);
      });
    }
  } catch (err) {
    console.error("Error updating overdue assignment:", err);
  }
};
const autoUpdateReopenedAssignments = async () => {
  try {
    const now = new Date();

    // Tìm các bài đã đóng nhưng now < dueDate (giáo viên đã gia hạn)
    const reopenedAssignments = await Assignment.find({
      status: "closed",
      dueDate: { $gt: now },   // dueDate mới nằm trong tương lai
    });

    if (reopenedAssignments.length > 0) {
      const reopenedIds = reopenedAssignments.map((a) => a._id);

      await Assignment.updateMany(
        { _id: { $in: reopenedIds } },
        { $set: { status: "active" } }
      );

      reopenedAssignments.forEach((a) => {
        console.log(
          `Reopened assignment '${a.title}' because the teacher extended it (new due date: ${a.dueDate.toLocaleString()})`
        );
      });
    }
  } catch (err) {
    console.error("Error while updating extended assignment:", err);
  }
};

//Chạy mỗi 5 phút một lần (300000 ms)
setInterval(() => {
  autoUpdateExpiredAssignments();
  autoUpdateReopenedAssignments()
    ;
}, 1000);

