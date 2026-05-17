import { Router } from "express";
import NotificationController from "../controller/notification.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyToken);

// Student, Teacher & Admin routes
router.get("/my-notifications", authorizeRoles("student", "teacher", "admin"), NotificationController.getMyNotifications);
router.get("/unread-count", authorizeRoles("student", "teacher", "admin"), NotificationController.getUnreadCount);
router.patch("/:id/read", authorizeRoles("student", "teacher", "admin"), NotificationController.markAsRead);
router.patch("/mark-all-read", authorizeRoles("student", "teacher", "admin"), NotificationController.markAllAsRead);

// Teacher-specific routes
router.get("/by-course", authorizeRoles("teacher"), NotificationController.getNotificationsByCourse);

// Admin-only routes
router.post("/global", authorizeRoles("admin"), NotificationController.createGlobalNotification);
router.post("/send-to-user", authorizeRoles("admin"), NotificationController.sendToUser);
router.get("/my-created", authorizeRoles("admin"), NotificationController.getMyCreatedNotifications);
router.put("/:id", authorizeRoles("admin"), NotificationController.updateNotification);
router.delete("/:id", authorizeRoles("admin"), NotificationController.deleteNotification);

export default router;