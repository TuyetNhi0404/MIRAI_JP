
import { Router } from "express";
import {
  getStudentsForCalendar,
  updateAttendanceStatus,
  getAttendanceByStudent
} from "../controller/attendance.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import { UserRole } from "../enum/user.enum";
const router = Router();
router.use(verifyToken);

// ✅ admin/teacher xem danh sách attendance của 1 buổi
router.get("/:calendarId/students", verifyToken, authorizeRoles(UserRole.ADMIN, UserRole.TEACHER), getStudentsForCalendar);
// ✅ admin/teacher cập nhật trạng thái điểm danh của 1 học viên trong buổi
router.put("/calendar/:calendarId/user/:userId", verifyToken, authorizeRoles(UserRole.ADMIN, UserRole.TEACHER), updateAttendanceStatus);
// ✅ student xem lịch sử điểm danh của mình
router.get("/student/:studentId", verifyToken, authorizeRoles(UserRole.ADMIN, UserRole.STUDENT), getAttendanceByStudent);

export default router;