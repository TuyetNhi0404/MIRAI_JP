import axiosInstance from "../api/axiosConfig";
import type {
  Notification,
  NotificationResponse,
  UnreadCountResponse,
  CreateGlobalNotificationRequest,
  NotificationByCourse,
  SendNotificationToUserRequest,
  MyCreatedNotificationsResponse,
} from "../types/notification.types";

class NotificationService {
  private readonly NOTIFICATION_ENDPOINT = "/notifications";

  /**
   * Get all notifications for current user
   */
  async getMyNotifications(params?: {
    isRead?: boolean;
    courseId?: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationResponse> {
    const queryParams = new URLSearchParams();
    if (params?.isRead !== undefined) {
      queryParams.append("isRead", String(params.isRead));
    }
    if (params?.courseId) {
      queryParams.append("courseId", params.courseId);
    }
    if (params?.page) {
      queryParams.append("page", String(params.page));
    }
    if (params?.limit) {
      queryParams.append("limit", String(params.limit));
    }

    const response = await axiosInstance.get<NotificationResponse>(
      `${this.NOTIFICATION_ENDPOINT}/my-notifications?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get<UnreadCountResponse>(
      `${this.NOTIFICATION_ENDPOINT}/unread-count`
    );
    return response.data.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await axiosInstance.patch<{
      success: boolean;
      data: Notification;
    }>(`${this.NOTIFICATION_ENDPOINT}/${notificationId}/read`);
    return response.data.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    const response = await axiosInstance.patch<{
      success: boolean;
      data: { modifiedCount: number };
    }>(`${this.NOTIFICATION_ENDPOINT}/mark-all-read`);
    return response.data.data;
  }

  /**
   * Get notifications by course (Teacher only)
   */
  async getNotificationsByCourse(): Promise<NotificationByCourse[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: NotificationByCourse[];
    }>(`${this.NOTIFICATION_ENDPOINT}/by-course`);
    return response.data.data;
  }

  /**
   * Create global notification (Admin only)
   */
  async createGlobalNotification(
    data: CreateGlobalNotificationRequest
  ): Promise<{ count: number }> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: { count: number };
    }>(`${this.NOTIFICATION_ENDPOINT}/global`, data);
    return response.data.data;
  }

  /**
   * Update notification (Admin only)
   */
  async updateNotification(
    notificationId: string,
    data: { title?: string; message?: string }
  ): Promise<Notification> {
    const response = await axiosInstance.put<{
      success: boolean;
      data: Notification;
    }>(`${this.NOTIFICATION_ENDPOINT}/${notificationId}`, data);
    return response.data.data;
  }

  /**
   * Delete notification (Admin only)
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`${this.NOTIFICATION_ENDPOINT}/${notificationId}`);
  }

  /**
   * Send notification to specific user (Admin only)
   */
  async sendNotificationToUser(
    data: SendNotificationToUserRequest
  ): Promise<Notification> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: Notification;
    }>(`${this.NOTIFICATION_ENDPOINT}/send-to-user`, data);
    return response.data.data;
  }

  /**
   * Get all notifications created by admin (Admin only)
   */
  async getMyCreatedNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<MyCreatedNotificationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append("page", String(params.page));
    }
    if (params?.limit) {
      queryParams.append("limit", String(params.limit));
    }

    const response = await axiosInstance.get<MyCreatedNotificationsResponse>(
      `${this.NOTIFICATION_ENDPOINT}/my-created?${queryParams.toString()}`
    );
    return response.data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;



