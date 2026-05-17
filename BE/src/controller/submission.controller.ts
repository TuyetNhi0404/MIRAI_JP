import { Request, Response } from "express";
import { Submission, ISubmission } from "../model/submission.model";
import { Assignment, IAssignment } from "../model/assignment.model";
import { uploadToCloudinary } from "../service/cloundinary.service";
import mongoose, { Schema, FilterQuery } from "mongoose";
import multer from "multer";
import NotificationService from "../service/notification.service";
import { StatisticsService } from "../service/statistics.service";

// Interface for populated assignment
interface PopulatedAssignment {
  _id: mongoose.Types.ObjectId;
  title: string;
  courseId: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name?: string };
  createdBy: mongoose.Types.ObjectId | { name?: string; email?: string };
  dueDate: Date;
  [key: string]: unknown;
}

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { note } = req.body;
    const studentId = new mongoose.Types.ObjectId(req.id);


    const assignment = await Assignment.findById(assignmentId)
      .populate("courseId", "name")
      .populate("teacherId", "name email");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const now = new Date();
    if (now > assignment.dueDate) {
      return res.status(400).json({ message: "The submission deadline has passed and no new submissions are possible.." });
    }

    const existingSubmission = await Submission.findOne({ assignmentId, studentId });

    let fileUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      fileUrls = await uploadToCloudinary(req.files);
    } else if (req.file) {
      fileUrls = await uploadToCloudinary(req.file);
    }

    const status = now > assignment.dueDate ? "late" : "submitted";

    let submission;
    if (existingSubmission) {
      existingSubmission.files = fileUrls.length > 0 ? fileUrls : existingSubmission.files;
      existingSubmission.note = note || existingSubmission.note;
      existingSubmission.submittedAt = now;
      existingSubmission.status = status;
      await existingSubmission.save();
      submission = existingSubmission;
    } else {
      submission = await Submission.create({
        assignmentId,
        studentId,
        files: fileUrls,
        note: note || "",
        status,
        submittedAt: now,
      });
    }

    // populate thông tin cần thiết
    const populatedSubmission = await Submission.findById(submission._id)
      .populate({
        path: "assignmentId",
        select: "title courseId teacherId dueDate",
        populate: [
          { path: "courseId", select: "name" },
          { path: "teacherId", select: "name email" },
        ],
      })
      .populate("studentId", "name email");

    return res.status(existingSubmission ? 200 : 201).json({
      message: existingSubmission
        ? "The post has been successfully resubmitted."
        : "Submission successful.",
      submission: populatedSubmission,
    });
  } catch (error: unknown) {
    console.error("Error submitting assignment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Error submitting assignment",
      error: errorMessage,
    });
  }
};

export const getMySubmission = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const studentId = new mongoose.Types.ObjectId(req.id);

    const submission = await Submission.findOne({
      assignmentId,
      studentId,
    })
      .populate({
        path: "assignmentId",
        select: "title courseId teacherId dueDate",
        populate: [
          { path: "courseId", select: "name" },
          { path: "teacherId", select: "name email" },
        ],
      })
      .populate("studentId", "name email");

    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    return res.json(submission);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Error fetching submission",
      error: errorMessage,
    });
  }
};

//Get tất cả submission của 1 sinh viên
export const getSubmissionsInCourseController = async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const studentId = req.params.studentId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid Course ID" });
    }

    // Lấy tất cả assignment trong khóa học
    const assignments = await Assignment.find({ courseId }).select("_id title dueDate");
    if (!assignments.length) {
      return res.status(404).json({ message: "There are no exercises in this course." });
    }

    const assignmentIds = assignments.map(a => a._id);
    const query: FilterQuery<ISubmission> = { assignmentId: { $in: assignmentIds } };

    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }
      query.studentId = studentId;
    }

    const submissions = await Submission.find(query)
      .populate({
        path: "assignmentId",
        select: "title dueDate courseId",
        populate: {
          path: "courseId",
          select: "name",
        },
      })
      .populate("studentId", "name email")
      .populate("gradedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Get list of successful submissions",
      total: submissions.length,
      submissions,
    });
  } catch (error: unknown) {
    console.error("Error getting list of submissions:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Server error",
      error: errorMessage,
    });
  }
};

//Lấy tất cả submission trong assignment
export const getAllSubmissionsOfAssignment = async (req: Request, res: Response) => {
  try {
    const assignmentId = req.params.assignmentId as string;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid Assignment ID" });
    }

    // kiểm tra assignment có tồn tại không
    const assignment = await Assignment.findById(assignmentId)
      .populate("courseId", "name")
      .populate("teacherId", "name email");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment does not exist" });
    }

    // lấy danh sách submissions
    const submissions = await Submission.find({ assignmentId })
      .populate({
        path: "assignmentId",
        select: "title dueDate courseId teacherId",
        populate: [
          { path: "courseId", select: "name" },
          { path: "teacherId", select: "name email" },
        ],
      })
      .populate("studentId", "name email avatar")
      .populate("gradedBy", "name email")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      message: "Get the list of successful assignment submissions",
      total: submissions.length,
      assignment: {
        id: assignment._id,
        title: assignment.title,
        course: assignment.courseId,
      },
      submissions,
    });
  } catch (error: unknown) {
    console.error("Error getAllSubmissionsOfAssignment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Error while retrieving submission list",
      error: errorMessage,
    });
  }
};


//Chấm điểm và feedback assingment
export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    const teacherId = new mongoose.Types.ObjectId(req.id);

    const submission = await Submission.findById(submissionId)
      .populate({
        path: "assignmentId",
        select: "title courseId createdBy",
        populate: {
          path: "courseId",
          select: "name teacherId",
        },
      })
      .populate("studentId", "name email");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }
    // Check if this is the first time grading (not re-grading)
    const isFirstTimeGrading = !submission.gradedAt;

    const assignment = submission.assignmentId as unknown as PopulatedAssignment;

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Get createdBy as ObjectId (could be populated or not)
    const createdById = assignment.createdBy instanceof mongoose.Types.ObjectId
      ? assignment.createdBy
      : (assignment.createdBy as { _id?: mongoose.Types.ObjectId })?._id || assignment.createdBy as mongoose.Types.ObjectId;

    //chỉ giáo viên tạo assignment mới được chấm bài
    if (createdById.toString() !== teacherId.toString()) {
      return res.status(403).json({
        message: "You do not have permission to grade this submission",
      });
    }

    // Chấm điểm
    submission.score = score;
    submission.feedback = feedback;
    submission.status = "graded";
    submission.gradedBy = teacherId;
    submission.gradedAt = new Date();

    await submission.save();

    const populated = await submission.populate("gradedBy", "name email");

    // ✅ Tự động tính lại điểm sau khi chấm bài
    try {
      const assignment = submission.assignmentId as unknown as PopulatedAssignment;
      const courseIdObj = assignment.courseId instanceof mongoose.Types.ObjectId
        ? assignment.courseId
        : (assignment.courseId as { _id: mongoose.Types.ObjectId })._id;
      const courseId = courseIdObj.toString();
      
      const studentIdObj = submission.studentId instanceof mongoose.Types.ObjectId
        ? submission.studentId
        : (submission.studentId as { _id: mongoose.Types.ObjectId })._id;
      const studentId = studentIdObj.toString();
      
      // Gọi hàm tính điểm tự động (không await để không chặn response)
      StatisticsService.refreshStudentScoresAsync(courseId, studentId).catch((err: unknown) => {
        console.error("Error refreshing scores after grading:", err);
      });
    } catch (scoreErr) {
      console.error("Error refreshing scores:", scoreErr);
      // Không fail nếu tính điểm lỗi
    }

    // ✅ SEND NOTIFICATION TO STUDENT (only on first grading, not re-grading)
    if (isFirstTimeGrading) {
      try {
        const assignment = submission.assignmentId as unknown as PopulatedAssignment;
        const assignmentId = assignment._id.toString();
        
        const courseIdObj = assignment.courseId instanceof mongoose.Types.ObjectId
          ? assignment.courseId
          : (assignment.courseId as { _id: mongoose.Types.ObjectId })._id;
        const courseId = courseIdObj.toString();
        
        const studentIdObj = submission.studentId instanceof mongoose.Types.ObjectId
          ? submission.studentId
          : (submission.studentId as { _id: mongoose.Types.ObjectId })._id;
        const studentId = studentIdObj.toString();
        
        await NotificationService.notifyAssignmentGraded(
          assignmentId,
          courseId,
          assignment.title,
          studentId,
          score
        );
      } catch (notifErr) {
        console.error("Error sending grade notification:", notifErr);
        // Don't fail the grading if notification fails
      }
    }

    return res.json({
      message: "Submission graded successfully",
      submission: populated,
    });
  } catch (error: unknown) {
    console.error("Error grading submission:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Error grading submission",
      error: errorMessage,
    });
  }
};



export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { note } = req.body;
    const studentId = new mongoose.Types.ObjectId(req.id);

    const submission = await Submission.findById(submissionId)
      .populate({
        path: "assignmentId",
        populate: { path: "courseId", select: "name" },
      });
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    const assignment = submission.assignmentId as unknown as PopulatedAssignment;
    const now = new Date();

    const studentIdObj = submission.studentId instanceof mongoose.Types.ObjectId
      ? submission.studentId
      : (submission.studentId as { _id: mongoose.Types.ObjectId })._id;

    if (studentIdObj.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "You do not have permission to edit this post" });
    }
    if (now > assignment.dueDate) {
      return res.status(400).json({ message: "The deadline for submission has passed and the paper cannot be edited." });
    }

    let fileUrls: string[] = submission.files;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      fileUrls = await uploadToCloudinary(req.files);
    } else if (req.file) {
      fileUrls = await uploadToCloudinary(req.file);
    }

    submission.files = fileUrls;
    submission.note = note || submission.note;
    submission.submittedAt = now;
    submission.status = "submitted";
    await submission.save();

    const populated = await Submission.findById(submission._id)
      .populate({
        path: "assignmentId",
        select: "title dueDate teacherId courseId",
        populate: [
          { path: "courseId", select: "name" },
          { path: "teacherId", select: "name email" },
        ],
      })
      .populate("studentId", "name email");

    return res.status(200).json({
      message: "Submission updated successfully.",
      submission: populated,
    });
  } catch (error: unknown) {
    console.error("Error updating submission:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Error updating submission",
      error: errorMessage,
    });
  }
};
