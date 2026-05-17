// src/types/enrollment.types.ts

export interface CVInfo {
  name: string;
  email: string;
  birthday?: string;
  phone?: string;
  education?: {
    institution: string;
    period: string;
    major: string;
    gpa: string;
  };
  experience?: string;
  skills?: string[];
  certifications?: string[];
  projects?: {
    name: string;
    description: string;
  }[];
}

export interface EnrollmentRequest {
  courseId: string;
  cvInfo: CVInfo;
  file?: File;
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
  cvBirthday?: string;
  cvPhone?: string;
  cvEducation?: {
    institution: string;
    period: string;
    major: string;
    gpa: string;
  };
  cvExperience?: string;
  cvSkills?: string[];
  cvCertifications?: string[];
  cvProjects?: {
    name: string;
    description: string;
  }[];
  cvFileUrl?: string;
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

export interface CVUploadAPIResponse {
  success: boolean;
  message: string;
  data: CVInfo;
}