// src/types/assignment.types.ts

export interface Course {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  status: "not_yet" | "in_progress" | "complete"; // ✅ Match backend
  startDate: string;
  endDate?: string;
  homeroomTeacher: string;
  homeroomTeacherId: string;
  capacity: number;
  session: number;
  enrolledCount?: number;
  createdAt?: string;
  createdBy?: string;
}

export interface Assignment {
  _id?: string;
  id?: string;
  title: string;
  courseId: string;
  course?: string;
  courseName?: string; // ✅ Added for mobile
  description?: string;
  status: "draft" | "active" | "closed"; // ✅ Fixed to match backend
  dueDate: string;
  maxScore: number;
  fileUrls?: string[];
  createdBy?: string;
  teacherName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentFormData {
  title: string;
  courseId: string;
  course: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  status: "draft" | "active" | "closed"; // ✅ Fixed
}

export interface AssignmentQueryParams {
  courseId?: string; // ✅ Optional for "get all"
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ✅ Mobile API Response
export interface AssignmentListResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  assignments: Assignment[];
}