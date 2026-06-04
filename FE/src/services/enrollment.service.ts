// src/services/enrollment.service.ts
import axiosInstance from "../api/axiosInstance";
import type {
  EnrollmentRequest,
  EnrollmentAPIResponse,
  EnrollmentsListAPIResponse,
} from "../types/enrollment.types";

export const enrollmentService = {
  // Đăng ký khóa học
  async enrollCourse(data: EnrollmentRequest): Promise<EnrollmentAPIResponse> {
    const response = await axiosInstance.post<EnrollmentAPIResponse>(
      "/enrollments",
      data
    );
    return response.data;
  },

  // Lấy tất cả đơn đăng ký (Admin)
  async getAllEnrollments(status?: string): Promise<EnrollmentsListAPIResponse> {
    const params = status ? { status } : {};
    const response = await axiosInstance.get<EnrollmentsListAPIResponse>(
      "/enrollments",
      { params }
    );
    return response.data;
  },

  // Duyệt đơn đăng ký
  async approveEnrollment(enrollmentId: string): Promise<EnrollmentAPIResponse> {
    const response = await axiosInstance.patch<EnrollmentAPIResponse>(
      `/enrollments/${enrollmentId}/approve`
    );
    return response.data;
  },

  // Từ chối đơn đăng ký
  async rejectEnrollment(enrollmentId: string): Promise<EnrollmentAPIResponse> {
    const response = await axiosInstance.patch<EnrollmentAPIResponse>(
      `/enrollments/${enrollmentId}/reject`
    );
    return response.data;
  },

  // Lấy đơn đăng ký của sinh viên
  async getMyEnrollments(): Promise<EnrollmentsListAPIResponse> {
    const response = await axiosInstance.get<EnrollmentsListAPIResponse>(
      "/enrollments/my"
    );
    return response.data;
  },
};
