import { Router } from "express";
import RequestScheduleController from "../controller/requestSchedule.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

// Teacher tạo request đổi lịch
router.post("/", authorizeRoles("teacher"), RequestScheduleController.createRequest);
// Teacher xem tất cả request của mình
router.get("/me", authorizeRoles("teacher"), RequestScheduleController.getMyRequests);
// Teacher xem request theo calendarId
// router.get("/calendar/:calendarId", authorizeRoles("teacher"), RequestScheduleController.getRequestsByCalendar);

// Admin xem tất cả request
router.get("/", authorizeRoles("admin"), RequestScheduleController.getAllRequests);
// Admin accept request
router.patch("/:requestId/accept", authorizeRoles("admin"), RequestScheduleController.acceptRequest);
// Admin reject request
router.patch("/:requestId/reject", authorizeRoles("admin"), RequestScheduleController.rejectRequest);

export default router;
