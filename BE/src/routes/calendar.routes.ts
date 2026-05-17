import { Router } from "express";
import {
  createCalendar,
  getAllCalendars,
  deleteCalendar,
  updateCalendar,
} from "../controller/calendar.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import { getByWeek } from "../controller/calendar.controller";

const router = Router();
router.use(verifyToken);
//Tạo lịch học (Admin)
router.post("/", authorizeRoles("admin"), createCalendar);

router.get("/week", authorizeRoles("admin", "teacher", "student"), getByWeek);

//Xem toàn bộ lịch học
router.get("/", authorizeRoles("admin", "teacher", "student"), getAllCalendars);
//Cập nhật trạng thái lịch học
router.patch("/:calendarId", authorizeRoles("admin"), updateCalendar);
// Xóa lịch học
router.delete("/:calendarId", authorizeRoles("admin"), deleteCalendar);

export default router;
