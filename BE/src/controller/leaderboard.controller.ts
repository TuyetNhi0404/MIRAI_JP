import { Request, Response } from "express";
import { LeaderboardService } from "../service/leaderboard.service";

/**
 * GET /api/leaderboard/course/:courseId
 * Lấy top students của một khóa học
 */
export const getCourseLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!courseId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter: courseId",
      });
      return;
    }

    const leaderboard = await LeaderboardService.getCourseLeaderboard(courseId, limit);

    res.status(200).json({
      success: true,
      message: "Successfully retrieved course leaderboard.",
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('❌ Error in getCourseLeaderboard controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving course leaderboard.",
    });
  }
};

/**
 * GET /api/leaderboard/global
 * Lấy top students toàn hệ thống (chỉ admin)
 */
export const getGlobalLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const userRole = req.role || "";

    // Chỉ admin mới xem được
    if (userRole !== "admin") {
      res.status(403).json({
        success: false,
        message: "Only admins can view the global leaderboard.",
      });
      return;
    }

    const leaderboard = await LeaderboardService.getGlobalLeaderboard(limit);

    res.status(200).json({
      success: true,
      message: "Successfully retrieved global leaderboard.",
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('❌ Error in getGlobalLeaderboard controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving global leaderboard.",
    });
  }
};

/**
 * GET /api/leaderboard/compare-courses
 * So sánh top 1 của các khóa học (admin/teacher)
 */
export const compareCoursesTopStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.role || "";

    // Chỉ admin/teacher mới xem được
    if (!["admin", "teacher"].includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Access denied.",
      });
      return;
    }

    const comparison = await LeaderboardService.compareCoursesTopStudents();

    res.status(200).json({
      success: true,
      message: "Successfully compared top students across courses.",
      data: comparison,
    });
  } catch (error: any) {
    console.error('❌ Error in compareCoursesTopStudents controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error comparing courses top students.",
    });
  }
};

/**
 * GET /api/leaderboard/student/:studentId/course/:courseId
 * Lấy vị trí của student trong leaderboard khóa học
 */
export const getStudentRankInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, courseId } = req.params;
    const userRole = req.role || "";
    const userId = req.id || "";

    if (!studentId || !courseId) {
      res.status(400).json({
        success: false,
        message: "Missing parameter: studentId or courseId",
      });
      return;
    }

    // Kiểm tra quyền: student chỉ xem rank của chính mình
    if (userRole === "student" && userId !== studentId) {
      res.status(403).json({
        success: false,
        message: "Access denied.",
      });
      return;
    }

    const rankInfo = await LeaderboardService.getStudentRankInCourse(studentId, courseId);

    res.status(200).json({
      success: true,
      message: "Successfully retrieved ranking information.",
      data: rankInfo,
    });
  } catch (error: any) {
    console.error('❌ Error in getStudentRankInCourse controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving student ranking.",
    });
  }
};

/**
 * GET /api/leaderboard/course/:courseId/component/:component
 * Lấy top students theo component (attendance/assignment/quiz)
 */
export const getTopByComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, component } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!courseId || !component) {
      res.status(400).json({
        success: false,
        message: "Missing parameter: courseId or component.",
      });
      return;
    }

    if (!["attendance", "assignment", "quiz"].includes(component)) {
      res.status(400).json({
        success: false,
        message: "Component must be attendance, assignment, or quiz.",
      });
      return;
    }

    const leaderboard = await LeaderboardService.getTopByComponent(
      courseId,
      component as "attendance" | "assignment" | "quiz",
      limit
    );

    res.status(200).json({
      success: true,
      message: `Successfully retrieved top ${component}`,
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('❌ Error in getTopByComponent controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving leaderboard",
    });
  }
};