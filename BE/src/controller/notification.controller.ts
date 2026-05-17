import { Request, Response } from "express";
import NotificationService from "../service/notification.service";

class NotificationController {
    // Get all notifications for the current user
    async getMyNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            const { isRead, courseId, page = 1, limit = 20 } = req.query;

            const filters: any = {};
            if (isRead !== undefined) {
                filters.isRead = isRead === "true";
            }
            if (courseId) {
                filters.courseId = courseId;
            }

            const result = await NotificationService.getUserNotifications(
                userId,
                filters,
                Number(page),
                Number(limit)
            );

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error fetching notifications",
            });
        }
    }

    // Get notifications grouped by course (for teachers)
    async getNotificationsByCourse(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;
            const userRole = (req as any).user?.role || (req as any).role;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            if (userRole !== "teacher") {
                res.status(403).json({
                    success: false,
                    message: "Only teachers can access this endpoint",
                });
                return;
            }

            const result = await NotificationService.getNotificationsByCourse(userId);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error fetching notifications by course",
            });
        }
    }

    // Mark a notification as read
    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: "Notification ID is required",
                });
                return;
            }

            const notification = await NotificationService.markAsRead(id, userId);

            res.status(200).json({
                success: true,
                message: "Notification marked as read",
                data: notification,
            });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Error marking notification as read",
            });
        }
    }

    // Mark all notifications as read
    async markAllAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            const result = await NotificationService.markAllAsRead(userId);

            res.status(200).json({
                success: true,
                message: "All notifications marked as read",
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error marking all notifications as read",
            });
        }
    }

    // Get unread notification count
    async getUnreadCount(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            const count = await NotificationService.getUnreadCount(userId);

            res.status(200).json({
                success: true,
                data: { count },
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error fetching unread count",
            });
        }
    }

    // Create global notification (Admin only)
    async createGlobalNotification(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;
            const userRole = (req as any).user?.role || (req as any).role;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            if (userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    message: "Only admins can create global notifications",
                });
                return;
            }

            const { title, message, targetRole, courseIds } = req.body;

            if (!title || !message) {
                res.status(400).json({
                    success: false,
                    message: "Title and message are required",
                });
                return;
            }

            const result = await NotificationService.createGlobalNotification(
                { title, message, targetRole, courseIds },
                userId
            );

            res.status(201).json({
                success: true,
                message: "Global notification created successfully",
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error creating global notification",
            });
        }
    }

    // Update notification (Admin only)
    async updateNotification(req: Request, res: Response): Promise<void> {
        try {
            const userRole = (req as any).user?.role || (req as any).role;
            const { id } = req.params;
            const { title, message } = req.body;

            if (userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    message: "Only admins can update notifications",
                });
                return;
            }

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: "Notification ID is required",
                });
                return;
            }

            const notification = await NotificationService.updateNotification(id, {
                title,
                message,
            });

            res.status(200).json({
                success: true,
                message: "Notification updated successfully",
                data: notification,
            });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Error updating notification",
            });
        }
    }

    // Delete notification (Admin only)
    async deleteNotification(req: Request, res: Response): Promise<void> {
        try {
            const userRole = (req as any).user?.role || (req as any).role;
            const { id } = req.params;

            if (userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    message: "Only admins can delete notifications",
                });
                return;
            }

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: "Notification ID is required",
                });
                return;
            }

            await NotificationService.deleteNotification(id);

            res.status(200).json({
                success: true,
                message: "Notification deleted successfully",
            });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Error deleting notification",
            });
        }
    }
    // Send notification to specific user (Admin only)
    async sendToUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;
            const userRole = (req as any).user?.role || (req as any).role;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            if (userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    message: "Only admins can send notifications to specific users",
                });
                return;
            }

            const { recipientUserId, title, message } = req.body;

            if (!recipientUserId || !title || !message) {
                res.status(400).json({
                    success: false,
                    message: "recipientUserId, title, and message are required",
                });
                return;
            }

            const notification = await NotificationService.sendNotificationToUser(
                { userId: recipientUserId, title, message },
                userId
            );

            res.status(201).json({
                success: true,
                message: "Notification sent to user successfully",
                data: notification,
            });
        } catch (err: any) {
            res.status(err.message.includes("not found") ? 404 : 500).json({
                success: false,
                message: err.message || "Error sending notification to user",
            });
        }
    }
    // Get all notifications created by admin (Admin only)
    async getMyCreatedNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || (req as any).id;
            const userRole = (req as any).user?.role || (req as any).role;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found",
                });
                return;
            }

            if (userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    message: "Only admins can view created notifications",
                });
                return;
            }

            const { page = 1, limit = 20 } = req.query;

            const result = await NotificationService.getAdminNotifications(
                userId,
                Number(page),
                Number(limit)
            );

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({
                success: false,
                message: err.message || "Error fetching created notifications",
            });
        }
    }
}

export default new NotificationController();