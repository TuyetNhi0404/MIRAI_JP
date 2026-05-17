// src/types/course.types.ts
export type CourseStatus = "not_yet" | "in_progress" | "complete";

export interface Course {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  status: CourseStatus;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  homeroomTeacherId: string;
  homeroomTeacher: string;
  session: number;
  capacity: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeroomTeacher {
  _id: string;
  name: string;
  email: string;
}

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

export interface CourseWithStudents {
  course: {
    id: string;
    name: string;
    capacity: number;
    enrolledCount: number;
  };
  totalStudents: number;
  students: EnrolledStudent[];
}

export interface CreateCourseRequest {
  name: string;
  description?: string;
  status?: CourseStatus;
  startDate?: string;
  endDate?: string;
  homeroomTeacherId: string;
  session?: number;
  capacity: number;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  status?: CourseStatus;
  startDate?: string;
  endDate?: string;
  homeroomTeacherId?: string;
  session?: number;
  capacity?: number;
}

export interface CourseListResponse {
  data: Course[];
  total: number;
}

export interface AvailableCoursesResponse {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeacherCoursesResponse {
  data: Course[];
  total: number;
}