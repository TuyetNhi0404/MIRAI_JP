export interface TransformedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

// ==================== BACKEND RESPONSE TYPES ====================
// These are the raw types from API before transformation

export interface BackendCourse {
  _id: string;
  name: string;
  description?: string;
  status?: "not_yet" | "in_progress" | "complete";
  startDate: string;
  endDate?: string;
  homeroomTeacher?: string;
  createdAt: string;
}

export interface BackendAssignment {
  _id: string;
  title: string;
  courseId: string | { _id: string; name?: string };
  courseName?: string;
  description?: string;
  status: string;
  dueDate: string;
  isLate?: boolean;
  maxScore: number;
  fileUrls?: string[];
  teacherName?: string;
  createdBy?: { name?: string };
  createdAt: string;
  updatedAt: string;
}

// Course
export interface Course {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  status: "not_yet" | "in_progress" | "complete";
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

// Enrolled Course
export interface EnrolledCourse {
  _id: string;
  name: string;
  description: string;
  status: "not_yet" | "in_progress" | "complete";
  startDate: string;
  endDate: string;
  homeroomTeacher: string;
  createdAt: string;
}

// Assignment
export interface Assignment {
  _id: string;
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  description: string;
  status: "active" | "closed";
  dueDate: string;
  isLate: boolean;
  maxScore: number;
  fileUrls: string[];
  teacherName: string;
  createdAt: string;
  updatedAt: string;
}

// Assignment List Response
export interface AssignmentListResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  assignments: Assignment[];
}

// Submission
export interface Submission {
  _id: string;
  assignmentId: {
    _id: string;
    title: string;
    courseId: {
      _id: string;
      name: string;
    };
    teacherId?: {
      _id: string;
      name: string;
      email: string;
    };
    dueDate: string;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  files: string[];
  note?: string;
  submittedAt: string;
  status: "submitted" | "late" | "not_submitted" | "graded";
  score?: number | null;
  feedback?: string;
  gradedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backend Submission (from API - before transformation)
export interface BackendSubmission {
  _id: string;
  assignmentId: {
    _id: string;
    title: string;
    courseId: {
      _id: string;
      name: string;
    };
    teacherId?: {
      _id: string;
      name: string;
      email: string;
    };
    dueDate: string;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  files: string[]; // URLs from backend
  note?: string;
  submittedAt: string;
  status: "submitted" | "late" | "not_submitted" | "graded";
  score?: number | null;
  feedback?: string;
  gradedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// Submission Response
export interface SubmissionResponse {
  message: string;
  submission: Submission;
}

// Assignment with Submission
export interface AssignmentWithSubmission extends Assignment {
  submission?: Submission | null;
}

// Query Params
export interface SubmissionQueryParams {
  courseId?: string;
  search?: string;
  page?: number;
  limit?: number;
}