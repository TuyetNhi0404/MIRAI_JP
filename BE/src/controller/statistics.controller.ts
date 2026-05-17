import { Request, Response } from "express";
import { StatisticsService } from "../service/statistics.service";

//Lấy thống kê điểm tổng hợp của một sinh viên trong khóa học
export async function getStudentCourseStatistics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { studentId, courseId } = req.params;
    // Sử dụng req.user để phù hợp với yêu cầu, fallback về req.role/req.id nếu không có
    const userRole = req.user?.role || req.role || "";
    const userId = req.user?.id || req.id || "";

    if (!studentId || !courseId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter studentId or courseId.",
      });
      return;
    }

    const statistics = await StatisticsService.getStudentCourseStatistics(
      studentId,
      courseId,
      userRole,
      userId
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    res.status(403).json({
      success: false,
      message: error.message || "Error retrieving course statistics.",
    });
  }
}

//Lấy thống kê chi tiết từng assignment của một sinh viên
export async function getStudentAssignmentDetails(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { studentId, courseId } = req.params;
    const userRole = req.user?.role || req.role || "";
    const userId = req.user?.id || req.id || "";

    if (!studentId || !courseId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter studentId or courseId.",
      });
      return;
    }

    const details = await StatisticsService.getStudentAssignmentDetails(
      studentId,
      courseId,
      userRole,
      userId
    );

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("A") ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Error retrieving assignment details.",
    });
  }
}

// Lấy thống kê điểm của tất cả sinh viên trong khóa học (Teacher/Admin)
export async function getAllStudentsCourseStatistics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { courseId } = req.params;
    const userRole = req.user?.role || req.role || "";
    const userId = req.user?.id || req.id || "";

    if (!courseId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter courseId.",
      });
      return;
    }

    const statistics = await StatisticsService.getAllStudentsCourseStatistics(
      courseId,
      userRole,
      userId
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("Access denied") ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Error retrieving course statistics.",
    });
  }
}

//Lấy thống kê điểm của sinh viên trong một assignment (Teacher/Admin)
export async function getAssignmentStatistics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { assignmentId } = req.params;
    const userRole = req.user?.role || req.role || "";
    const userId = req.user?.id || req.id || "";

    if (!assignmentId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter assignmentId.",
      });
      return;
    }

    const statistics = await StatisticsService.getAssignmentStatistics(
      assignmentId,
      userRole,
      userId
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("Access denied") ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Error retrieving assignment statistics.",
    });
  }
}

//Lấy thống kê tất cả sinh viên trong hệ thống (chỉ Admin)
export async function getAllStudentsStatistics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userRole = req.user?.role || req.role || "";

    const statistics = await StatisticsService.getAllStudentsStatistics(userRole);

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("Only admin") ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Error retrieving system-wide statistics.",
    });
  }
}

