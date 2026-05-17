import { Router } from "express";
import {
  getStudentCourseStatistics,
  getStudentAssignmentDetails,
  getAllStudentsCourseStatistics,
  getAssignmentStatistics,
  getAllStudentsStatistics,
} from "../controller/statistics.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

// Sinh viên chỉ được xem dữ liệu của chính mình

// Xem thống kê điểm tổng hợp trong một khóa học
// GET /api/statistics/students/:studentId/courses/:courseId
router.get(
  "/students/:studentId/courses/:courseId",
  authorizeRoles("student", "teacher", "admin"),
  getStudentCourseStatistics
);

// Xem thống kê chi tiết từng assignment statistics/students/:studentId/courses/:courseId/assignments
router.get(
  "/students/:studentId/courses/:courseId/assignments",
  authorizeRoles("student", "teacher", "admin"),
  getStudentAssignmentDetails
);

//Teacher + admin

// Thống kê điểm của toàn bộ sinh viên trong khóa học
router.get("/courses/:courseId/students", authorizeRoles("teacher", "admin"), getAllStudentsCourseStatistics);

// Thống kê điểm của sinh viên trong một assignment
router.get("/assignments/:assignmentId/students", authorizeRoles("teacher", "admin"), getAssignmentStatistics);

//admin có thể xem tất cả
// Thống kê tất cả sinh viên trong hệ thống /statistics/all-students
router.get( "/all-students", authorizeRoles("admin"), getAllStudentsStatistics);

export default router;




