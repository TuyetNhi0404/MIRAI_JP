// src/api/course.axios.ts
import axiosInstance from "./axiosInstance";
import type {
  Course,
  HomeroomTeacher,
  CourseWithStudents,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListResponse,
  AvailableCoursesResponse,
  TeacherCoursesResponse,
} from "../types/course.types";

export const courseApi = {
  // Public endpoints
  getAllCourses: () =>
    axiosInstance.get<CourseListResponse>("/courses"),

  getAvailableCourses: (params?: { page?: number; limit?: number; q?: string }) =>
    axiosInstance.get<AvailableCoursesResponse>("/courses/available", { params }),

  getCourseById: (id: string) =>
    axiosInstance.get<{ data: Course }>(`/courses/${id}`),

  // Protected endpoints (Admin only)
  createCourse: (data: CreateCourseRequest) =>
    axiosInstance.post<{ message: string; data: Course }>("/courses", data),

  updateCourse: (id: string, data: UpdateCourseRequest) =>
    axiosInstance.patch<{ message: string; data: Course }>(`/courses/${id}`, data),

  deleteCourse: (id: string) =>
    axiosInstance.delete<{ message: string }>(`/courses/${id}`),

  // Enrolled students (Teacher/Admin)
  getEnrolledStudents: (courseId: string) =>
    axiosInstance.get<CourseWithStudents>(`/courses/${courseId}/enrolled-students`),

  // Homeroom teachers list
  getHomeroomTeachers: () =>
    axiosInstance.get<{ data: HomeroomTeacher[]; total: number }>("/courses/homeroom-teachers/list"),

  // ✅ NEW: Teacher's courses (courses where teacher is homeroom teacher)
  getTeacherCourses: () =>
    axiosInstance.get<TeacherCoursesResponse>("/courses/teacher/courses"),
};