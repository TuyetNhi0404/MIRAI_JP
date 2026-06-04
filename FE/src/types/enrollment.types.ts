// src/types/enrollment.types.ts

export interface EnrollmentRequest {
  courseId: string;
  studentName: string;
  studentEmail: string;
}

export interface Enrollment {
  _id: string;
  studentName: string;
  studentEmail: string;
  courseId: string | {
    _id: string;
    name: string;
    managerName?: string;
    startDate?: Date;
    endDate?: Date;
  };
  status: "pending" | "approved" | "rejected";
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  _id: string;
  name: string;
  description?: string;
  managerName?: string;
  image?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
  enrolledCount?: number;
}

export type CourseReference = string | {
  _id: string;
  name: string;
  managerName?: string;
  startDate?: Date;
  endDate?: Date;
};

export interface EnrollmentAPIResponse {
  success: boolean;
  message: string;
  data: Enrollment;
}

export interface EnrollmentsListAPIResponse {
  success: boolean;
  message: string;
  count: number;
  data: Enrollment[];
}
