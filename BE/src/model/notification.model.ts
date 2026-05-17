import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    recipientId?: mongoose.Types.ObjectId; // For individual notifications
    recipientIds?: mongoose.Types.ObjectId[]; // For global notifications (array of users)
    recipientRole: "student" | "teacher" | "admin" | "all";
    type: "assignment_created" | "assignment_deadline" | "assignment_graded" | "quiz_created" | "forum_question" | "forum_comment" | "forum_post_approved" | "forum_post_rejected" | "reply_comment" | "enrollment_request" | "enrollment_response" | "schedule_request" | "schedule_response" | "forum_post_pending" | "forum_post_like" | "forum_post_dislike" | "global_announcement";
    title: string;
    message: string;
    relatedEntityType?: "assignment" | "course" | "forum" | "global";
    relatedEntityId?: mongoose.Types.ObjectId;
    courseId?: mongoose.Types.ObjectId;
    isRead: boolean;
    readBy?: mongoose.Types.ObjectId[]; // Track who has read this (for global notifications)
    createdBy?: mongoose.Types.ObjectId;
    metadata?: {
        quizId?: string;
        commentId?: string;
        replyId?: string;
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        recipientIds: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        recipientRole: {
            type: String,
            enum: ["student", "teacher", "admin", "all"],
            required: true,
        },
        type: {
            type: String,
            enum: [
                "assignment_created",
                "assignment_deadline",
                "assignment_graded",
                "quiz_created",
                "forum_question",
                "forum_comment",
                "forum_post_approved",
                "forum_post_rejected",
                "reply_comment",
                "enrollment_request",
                "enrollment_response",
                "schedule_request",
                "schedule_response",
                "forum_post_pending",
                "forum_post_like",
                "forum_post_dislike",
                "global_announcement",
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        relatedEntityType: {
            type: String,
            enum: ["assignment", "course", "forum", "global"],
        },
        relatedEntityId: {
            type: Schema.Types.ObjectId,
        },
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            index: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readBy: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, courseId: 1, createdAt: -1 });

export default mongoose.model<INotification>("Notification", NotificationSchema);