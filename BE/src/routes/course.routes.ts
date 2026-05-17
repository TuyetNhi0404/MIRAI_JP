// routes/course.routes.ts
import { Router } from "express";

import {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  listAvailableCourses,
  getHomeroomTeacherList,
  listStudentCourses,
  getStudentCourse,
  listTeacherCourses,
  getClassMembers,
} from "../controller/course.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
const router = Router();

// ============= PUBLIC ENDPOINTS (Không cần đăng nhập) =============
router.get("/available", listAvailableCourses);
router.get("/", listCourses);
router.get("/:id", getCourse);

// ============= PROTECTED ENDPOINTS (Cần đăng nhập) =============
router.post("/", verifyToken, authorizeRoles("admin"), createCourse);
router.patch("/:id", verifyToken, authorizeRoles("admin"), updateCourse);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCourse);
// ============= HOMEROOM TEACHER / MANAGERS ENDPOINTS =============
// ✅ FIXED: Thêm quyền admin để frontend có thể gọi
router.get(
  "/homeroom-teachers/list",
  verifyToken,
  authorizeRoles("teacher", "admin"), // ✅ Thêm "admin"
  getHomeroomTeacherList
);  
//student xem khóa học của mình
router.get("/student/courses", verifyToken, authorizeRoles("student"), listStudentCourses);
//student xem khóa học của mình (lấy 1 course nếu student đã ghi danh)
router.get("/student/course/:courseId", verifyToken, authorizeRoles("student"), getStudentCourse);
// Teacher xem tất cả các khóa học mà mình dạy 
router.get('/teacher/courses', verifyToken, authorizeRoles("teacher"), listTeacherCourses);
// Teacher xem danh sách các sinh viên có trong khóa học của mình 
router.get('/teacher/courses/:courseId/members', verifyToken, authorizeRoles("teacher"), getClassMembers);
export default router;
