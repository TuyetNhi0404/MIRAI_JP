import { Router } from "express";
import {
  getCourseStudents,
  getCourseTeachers,
  deleteCourseMember,
  getDeletedCourseStudents,
  transferStudent,
  addCourseMember,
} from "../controller/courseMember.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

// Lấy danh sách STUDENT trong course
router.get("/:courseId/lists", authorizeRoles("admin", "teacher"), getCourseStudents);

// Lấy danh sách TEACHER trong course
router.get("/:courseId/teachers", authorizeRoles("admin"), getCourseTeachers);
// Thêm thành viên vào khóa học (dùng để restore student)
router.post("/members", authorizeRoles("admin"), addCourseMember);
// Xóa thành viên khỏi khóa học
router.delete("/:courseId/members/:memberId", authorizeRoles("admin"), deleteCourseMember);
// Lấy danh sách STUDENT đã bị xóa khỏi course
router.get( "/:courseId/lists/deleted", authorizeRoles("admin"), getDeletedCourseStudents);

// Chuyển lớp cho STUDENT
router.post("/:studentId/transfer",authorizeRoles("admin"), transferStudent);

export default router;