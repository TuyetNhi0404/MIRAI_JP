export interface Notification {
  _id: string;
  recipientId?: string;
  recipientIds?: string[];
  recipientRole: "student" | "teacher" | "admin" | "all";
  type: 
    | "assignment_created" 
    | "assignment_deadline" 
    | "assignment_graded" 
    | "quiz_created"
    | "forum_question" 
    | "forum_comment" 
    | "forum_post_approved"
    | "forum_post_rejected"
    | "forum_pending_post"
    | "forum_post_like"
    | "forum_post_dislike"
    | "reply_comment"
    | "enrollment_request"
    | "enrollment_response"
    | "schedule_request"
    | "schedule_response"
    | "global_announcement";
  title: string;
  message: string;
  relatedEntityType?: "assignment" | "course" | "forum" | "global";
  relatedEntityId?: string;
  courseId?: string;
  isRead: boolean;
  readBy?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    quizId?: string;
    commentId?: string;
    replyId?: string;
    postId?: string;
    postTitle?: string;
    authorName?: string;
    authorId?: string;
    reactorName?: string;
    reactionType?: "like" | "dislike";
    [key: string]: unknown;
  };
}

export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface CreateGlobalNotificationRequest {
  title: string;
  message: string;
  targetRole?: "student" | "teacher" | "all" | "courses";
  courseIds?: string[]; // Gửi đến các khóa học cụ thể (optional, required when targetRole is "courses")
}

export interface NotificationByCourse {
  courseId: string | null;
  courseName: string | null;
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
}

export interface SendNotificationToUserRequest {
  recipientUserId: string;
  title: string;
  message: string;
}

export interface MyCreatedNotification extends Omit<Notification, 'recipientId'> {
  recipientCount: number;
  notificationType: "global" | "individual";
  recipientId?: string | {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface MyCreatedNotificationsResponse {
  success: boolean;
  data: {
    notifications: MyCreatedNotification[];
    total: number;
    page: number;
    totalPages: number;
  };
}

