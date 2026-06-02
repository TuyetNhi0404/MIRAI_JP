import Notification, { INotification } from "../model/notification.model";
import Enrollment from "../model/enrollment.model";
import mongoose from "mongoose";

interface CreateNotificationData {
    recipientId: string;
    recipientRole: "student" | "teacher" | "admin";
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    courseId?: string;
    createdBy?: string;
}

class NotificationService {
    // Create a single notification
    async createNotification(data: CreateNotificationData): Promise<INotification> {
        try {
            const notification = await Notification.create(data);
            return notification;
        } catch (err: any) {
            throw new Error(`Error creating notification: ${err.message}`);
        }
    }

    // Create notification for new assignment
    async notifyNewAssignment(
        assignmentId: string,
        courseId: string,
        assignmentTitle: string,
        dueDate: Date,
        studentIds: string[]
    ): Promise<void> {
        try {
            const notifications = studentIds.map((studentId) => ({
                recipientId: studentId,
                recipientRole: "student" as const,
                type: "assignment_created",
                title: "New Assignment",
                message: `A new assignment "${assignmentTitle}" has been posted. Due: ${dueDate.toLocaleDateString()}`,
                relatedEntityType: "assignment",
                relatedEntityId: assignmentId,
                courseId: courseId,
                isRead: false,
            }));

            await Notification.insertMany(notifications);
        } catch (err: any) {
            throw new Error(`Error creating assignment notifications: ${err.message}`);
        }
    }

    // Create notification for approaching deadline
    async notifyApproachingDeadline(
        assignmentId: string,
        courseId: string,
        assignmentTitle: string,
        dueDate: Date,
        studentIds: string[]
    ): Promise<void> {
        try {
            const notifications = studentIds.map((studentId) => ({
                recipientId: studentId,
                recipientRole: "student" as const,
                type: "assignment_deadline",
                title: "Assignment Deadline Approaching",
                message: `Reminder: Assignment "${assignmentTitle}" is due on ${dueDate.toLocaleDateString()}`,
                relatedEntityType: "assignment",
                relatedEntityId: assignmentId,
                courseId: courseId,
                isRead: false,
            }));

            await Notification.insertMany(notifications);
        } catch (err: any) {
            throw new Error(`Error creating deadline notifications: ${err.message}`);
        }
    }

    // Create notification for graded assignment
    async notifyAssignmentGraded(
        assignmentId: string,
        courseId: string,
        assignmentTitle: string,
        studentId: string,
        score: number
    ): Promise<void> {
        try {
            await Notification.create({
                recipientId: studentId,
                recipientRole: "student",
                type: "assignment_graded",
                title: "Assignment Graded",
                message: `Your assignment "${assignmentTitle}" has been graded. Score: ${score}`,
                relatedEntityType: "assignment",
                relatedEntityId: assignmentId,
                courseId: courseId,
                isRead: false,
            });
        } catch (err: any) {
            throw new Error(`Error creating graded notification: ${err.message}`);
        }
    }



    // Get user notifications with filters and pagination
    async getUserNotifications(
        userId: string,
        filters: any = {},
        page: number = 1,
        limit: number = 20
    ): Promise<{ notifications: any[]; total: number; page: number; totalPages: number }> {
        try {
            // Query for both individual notifications and global notifications that include this user
            const query: any = {
                $or: [
                    { recipientId: userId, ...filters },
                    { recipientIds: userId, ...filters }
                ]
            };

            const skip = (page - 1) * limit;

            const [notifications, total] = await Promise.all([
                Notification.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("courseId", "name")
                    .lean(),
                Notification.countDocuments(query),
            ]);

            // For global notifications, check if user has read it
            const notificationsWithReadStatus = notifications.map((notif: any) => {
                if (notif.recipientIds && notif.recipientIds.length > 0) {
                    // This is a global notification
                    const hasRead = notif.readBy?.some((id: any) => id.toString() === userId);
                    return { ...notif, isRead: hasRead || false };
                }
                return notif;
            });

            return {
                notifications: notificationsWithReadStatus,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        } catch (err: any) {
            throw new Error(`Error fetching notifications: ${err.message}`);
        }
    }

    // Get notifications grouped by course (for teachers)
    async getNotificationsByCourse(userId: string): Promise<any[]> {
        try {
            const notifications = await Notification.aggregate([
                { $match: { recipientId: new mongoose.Types.ObjectId(userId) } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$courseId",
                        notifications: { $push: "$$ROOT" },
                        unreadCount: {
                            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
                        },
                        totalCount: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "courses",
                        localField: "_id",
                        foreignField: "_id",
                        as: "course",
                    },
                },
                { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        courseId: "$_id",
                        courseName: "$course.name",
                        notifications: 1,
                        unreadCount: 1,
                        totalCount: 1,
                    },
                },
            ]);

            return notifications;
        } catch (err: any) {
            throw new Error(`Error fetching notifications by course: ${err.message}`);
        }
    }

    // Mark notification as read
    async markAsRead(notificationId: string, userId: string): Promise<INotification> {
        try {
            const notification = await Notification.findById(notificationId);

            if (!notification) {
                const error: any = new Error("Notification not found");
                error.statusCode = 404;
                throw error;
            }

            // Check if this is a global notification (has recipientIds array)
            if (notification.recipientIds && notification.recipientIds.length > 0) {
                // Check if user is in the recipients list
                const isRecipient = notification.recipientIds.some(
                    (id) => id.toString() === userId
                );

                if (!isRecipient) {
                    const error: any = new Error("Unauthorized");
                    error.statusCode = 403;
                    throw error;
                }

                // Add user to readBy array if not already there
                if (!notification.readBy) {
                    notification.readBy = [];
                }

                const alreadyRead = notification.readBy.some(
                    (id) => id.toString() === userId
                );

                if (!alreadyRead) {
                    notification.readBy.push(new mongoose.Types.ObjectId(userId));
                    await notification.save();
                }

                return notification;
            } else {
                // Individual notification
                if (notification.recipientId?.toString() !== userId) {
                    const error: any = new Error("Unauthorized");
                    error.statusCode = 403;
                    throw error;
                }

                notification.isRead = true;
                await notification.save();
                return notification;
            }
        } catch (err: any) {
            throw err;
        }
    }

    // Mark all notifications as read
    async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
        try {
            // Mark individual notifications as read
            const individualResult = await Notification.updateMany(
                { recipientId: userId, isRead: false },
                { isRead: true }
            );

            // Mark global notifications as read by adding user to readBy array
            const globalNotifications = await Notification.find({
                recipientIds: userId,
                $or: [
                    { readBy: { $exists: false } },
                    { readBy: { $ne: userId } }
                ]
            });

            let globalCount = 0;
            for (const notif of globalNotifications) {
                if (!notif.readBy) {
                    notif.readBy = [];
                }
                const alreadyRead = notif.readBy.some(id => id.toString() === userId);
                if (!alreadyRead) {
                    notif.readBy.push(new mongoose.Types.ObjectId(userId));
                    await notif.save();
                    globalCount++;
                }
            }

            return { modifiedCount: individualResult.modifiedCount + globalCount };
        } catch (err: any) {
            throw new Error(`Error marking all as read: ${err.message}`);
        }
    }

    // Get unread notification count
    async getUnreadCount(userId: string): Promise<number> {
        try {
            // Count individual unread notifications
            const individualCount = await Notification.countDocuments({
                recipientId: userId,
                isRead: false,
            });

            // Count global notifications not read by this user
            const globalCount = await Notification.countDocuments({
                recipientIds: userId,
                $or: [
                    { readBy: { $exists: false } },
                    { readBy: { $ne: userId } }
                ]
            });

            return individualCount + globalCount;
        } catch (err: any) {
            throw new Error(`Error fetching unread count: ${err.message}`);
        }
    }

    // Create global notification (Admin)
    async createGlobalNotification(
        data: { title: string; message: string; targetRole?: string; courseIds?: string[] },
        adminId: string
    ): Promise<{ count: number }> {
        try {
            // Import User model dynamically to avoid circular dependency
            const User = require("../model/user.model").default || require("../model/user.model").User;
            const Course = require("../model/course.model").Course;

            let recipientIds: string[] = [];  // ← Changed from userIds to recipientIds

            // ✅ NEW: If specific courses are selected
            if (data.courseIds && data.courseIds.length > 0) {
                // Convert courseIds strings to ObjectIds
                const courseObjectIds = data.courseIds.map((id: string) => new mongoose.Types.ObjectId(id));

                // Get all users (teachers and students) enrolled in the selected courses
                const courses = await Course.find({
                    _id: { $in: courseObjectIds },
                }).select("members");

                const users = new Set<string>();
                courses.forEach((c: any) => {
                    c.members?.filter((m: any) => !m.deletedAt)
                             .forEach((m: any) => users.add(m.userId.toString()));
                });

                recipientIds = Array.from(users);

                if (recipientIds.length === 0) {
                    console.warn("⚠️ No users found in selected courses");
                    return { count: 0 };
                }
            } else {
                // ✅ EXISTING: Send to all courses (all users except admins)
                const query: any = { role: { $ne: "admin" } };

                if (data.targetRole && data.targetRole !== "all") {
                    query.role = data.targetRole;
                }

                const users = await User.find(query).select("_id");
                recipientIds = users.map((user: any) => user._id.toString());
            }

            if (recipientIds.length === 0) {
                return { count: 0 };
            }

            // Create ONE notification with array of recipient IDs
            const notification = await Notification.create({
                recipientIds: recipientIds,  // ← Changed variable name
                recipientRole: "all",
                type: "global_announcement",
                title: data.title,
                message: data.message,
                relatedEntityType: "global",
                createdBy: adminId,
                isRead: false,
                readBy: [],
            });

            return { count: recipientIds.length };  // ← Changed variable name
        } catch (err: any) {
            throw new Error(`Error creating global notification: ${err.message}`);
        }
    }

    // Update notification (Admin)
    async updateNotification(
        notificationId: string,
        data: { title?: string; message?: string }
    ): Promise<INotification> {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                data,
                { new: true, runValidators: true }
            );

            if (!notification) {
                const error: any = new Error("Notification not found");
                error.statusCode = 404;
                throw error;
            }

            return notification;
        } catch (err: any) {
            throw err;
        }
    }

    // Delete notification (Admin)
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            const result = await Notification.findByIdAndDelete(notificationId);

            if (!result) {
                const error: any = new Error("Notification not found");
                error.statusCode = 404;
                throw error;
            }
        } catch (err: any) {
            throw err;
        }
    }


    // Notify admin when teacher creates schedule change request
    async notifyScheduleRequest(data: {
        teacherId: string;
        teacherName: string;
        calendarId: string;
        reason: string;
        requestId: string;
    }): Promise<void> {
        try {
            const User = require("../model/user.model").default || require("../model/user.model").User;

            const admins = await User.find({ role: "admin" }).select("_id");

            if (admins.length === 0) {
                console.warn("⚠️ No admins found to notify for schedule request");
                return;
            }

            // Create notification for each admin
            const notifications = admins.map((admin: any) => ({
                recipientId: admin._id,
                recipientRole: "admin",
                type: "global_announcement", // or create a new type "schedule_request"
                title: "Schedule Change Request",
                message: `${data.teacherName} requested a schedule change. Reason: ${data.reason}`,
                relatedEntityType: "global",
                relatedEntityId: data.requestId,
                createdBy: data.teacherId,
                isRead: false,
            }));

            await Notification.insertMany(notifications);
        } catch (err: any) {
            throw new Error(`Error creating schedule request notification: ${err.message}`);
        }
    }

    // Notify teacher when admin approves/rejects their request
    async notifyScheduleResponse(data: {
        teacherId: string;
        status: "accepted" | "rejected";
        requestId: string;
    }): Promise<void> {
        try {
            const message = data.status === "accepted"
                ? "Your schedule change request has been approved"
                : "Your schedule change request has been rejected";

            await Notification.create({
                recipientId: data.teacherId,
                recipientRole: "teacher",
                type: "global_announcement",
                title: "Schedule Request Response",
                message: message,
                relatedEntityType: "global",
                relatedEntityId: data.requestId,
                isRead: false,
            });
        } catch (err: any) {
            throw new Error(`Error creating schedule response notification: ${err.message}`);
        }
    }
    // Notify admins when student requests course enrollment
    async notifyEnrollmentRequest(data: {
        studentName: string;
        studentEmail: string;
        courseName: string;
        enrollmentId: string;
    }): Promise<void> {
        try {
            const User = require("../model/user.model").default || require("../model/user.model").User;

            const admins = await User.find({ role: "admin" }).select("_id");

            if (admins.length === 0) {
                console.warn("⚠️ No admins found to notify for enrollment request");
                return;
            }

            const notifications = admins.map((admin: any) => ({
                recipientId: admin._id,
                recipientRole: "admin",
                type: "global_announcement",
                title: "New Enrollment Request",
                message: `${data.studentName} (${data.studentEmail}) requested to enroll in "${data.courseName}"`,
                relatedEntityType: "global",
                relatedEntityId: data.enrollmentId,
                isRead: false,
            }));

            await Notification.insertMany(notifications);
        } catch (err: any) {
            throw new Error(`Error creating enrollment request notification: ${err.message}`);
        }
    }
    // Notify student when enrollment is approved/rejected
    async notifyEnrollmentResponse(data: {
        studentEmail: string;
        courseName: string;
        status: "approved" | "rejected";
        enrollmentId: string;
    }): Promise<void> {
        try {
            const User = require("../model/user.model").default || require("../model/user.model").User;

            // Find student by email
            const student = await User.findOne({ email: data.studentEmail }).select("_id role");

            if (!student) {
                console.warn(`⚠️ Student not found for email: ${data.studentEmail}`);
                return;
            }

            const message = data.status === "approved"
                ? `Your enrollment request for "${data.courseName}" has been approved! Welcome to the course.`
                : `Your enrollment request for "${data.courseName}" has been rejected.`;

            await Notification.create({
                recipientId: student._id,
                recipientRole: student.role || "student",
                type: "global_announcement",
                title: "Enrollment Request Response",
                message: message,
                relatedEntityType: "global",
                relatedEntityId: data.enrollmentId,
                isRead: false,
            });
        } catch (err: any) {
            throw new Error(`Error creating enrollment response notification: ${err.message}`);
        }
    }

    // Notify students in a course about a new quiz
    async notifyNewQuiz({
        courseId,
        quizId,
        quizTitle,
        dueDate,
    }: {
        courseId: string;
        quizId: string;
        quizTitle: string;
        dueDate?: Date;
    }): Promise<void> {
        try {
            // 1️⃣ Get all active students in this course from Course
            const Course = require("../model/course.model").Course;
            const course = await Course.findById(courseId).select("members").lean();
            const studentIds = (course?.members || [])
                .filter((m: any) => m.role === "student" && !m.deletedAt)
                .map((m: any) => m.userId.toString());

            if (studentIds.length === 0) {
                console.warn(`⚠️ No active students found in course ${courseId} for quiz notification`);
                return;
            }

            // 2️⃣ Build notification message
            const message = dueDate
                ? `A new quiz "${quizTitle}" has been created. Due date: ${dueDate.toLocaleString()}.`
                : `A new quiz "${quizTitle}" has been created.`;

            // 3️⃣ Create notifications for each student
            const notifications = studentIds.map((studentId: string) => ({
                recipientId: studentId,
                recipientRole: "student" as const,
                type: "quiz_created",
                title: "New Quiz",
                message,
                metadata: {
                    quizId,
                    courseId,
                    dueDate,
                },
            }));

            await Notification.insertMany(notifications);
        } catch (error) {
            console.error("❌ Error notifying students about new quiz:", error);
            throw error;
        }
    }

    // Send notification to specific user (Admin)
    async sendNotificationToUser(data: {
        userId: string;
        title: string;
        message: string;
    }, adminId: string): Promise<INotification> {
        try {
            const User = require("../model/user.model").default || require("../model/user.model").User;

            // Verify user exists and get their role
            const user = await User.findById(data.userId).select("role");

            if (!user) {
                throw new Error("User not found");
            }

            const notification = await Notification.create({
                recipientId: data.userId,
                recipientRole: user.role,
                type: "global_announcement",
                title: data.title,
                message: data.message,
                relatedEntityType: "global",
                createdBy: adminId,
                isRead: false,
            });

            return notification;
        } catch (err: any) {
            throw new Error(`Error sending notification to user: ${err.message}`);
        }
    }
    // Get all notifications created by admin
    async getAdminNotifications(
        adminId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ notifications: any[]; total: number; page: number; totalPages: number }> {
        try {
            const skip = (page - 1) * limit;

            const [notifications, total] = await Promise.all([
                Notification.find({ createdBy: adminId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("recipientId", "name email role")
                    .lean(),
                Notification.countDocuments({ createdBy: adminId }),
            ]);

            // Format notifications to show recipient info
            const formattedNotifications = notifications.map((notif: any) => {
                // For global notifications (recipientIds array)
                if (notif.recipientIds && notif.recipientIds.length > 0) {
                    return {
                        ...notif,
                        recipientCount: notif.recipientIds.length,
                        notificationType: "global",
                    };
                }
                // For individual notifications
                return {
                    ...notif,
                    recipientCount: 1,
                    notificationType: "individual",
                };
            });

            return {
                notifications: formattedNotifications,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        } catch (err: any) {
            throw new Error(`Error fetching admin notifications: ${err.message}`);
        }
    }

}

export default new NotificationService();