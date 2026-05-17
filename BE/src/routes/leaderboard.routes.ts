import { Router } from "express";
import {
  getCourseLeaderboard,
  getGlobalLeaderboard,
  compareCoursesTopStudents,
  getStudentRankInCourse,
  getTopByComponent,
} from "../controller/leaderboard.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import { UserRole } from "../enum/user.enum";
const router = Router();
router.use(verifyToken);
// ✅ Lấy leaderboard của một khóa học (tất cả role đều xem được)
router.get("/course/:courseId",getCourseLeaderboard);

// ✅ Lấy top students toàn hệ thống (chỉ admin)
router.get("/global",authorizeRoles(UserRole.ADMIN),getGlobalLeaderboard);

// ✅ So sánh top 1 các khóa học (admin/teacher)
router.get("/compare-courses",authorizeRoles(UserRole.ADMIN, UserRole.TEACHER),compareCoursesTopStudents);

// ✅ Xem rank của một student trong khóa học (admin/teacher/student chính họ)
router.get("/student/:studentId/course/:courseId",getStudentRankInCourse);

// ✅ Top students theo component (tất cả role đều xem được)
router.get("/course/:courseId/component/:component",getTopByComponent);

export default router;