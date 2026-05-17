
export interface User {
  _id: string;
  id?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
  updatedAt: string;
}

export type CourseStatus = 'not_yet' | 'in_progress' | 'complete';

export interface Course {
  _id: string;
  id?: string;
  name?: string;
  courseName?: string;
  codeName?: string;
  description?: string;
  status: 'not_yet' | 'in_progress' | 'completed';
  startDate?: Date | string;
  endDate?: Date | string;
  managerId?: string;
  managerName?: string;
  capacity?: number;
  session?: number;
  enrolledCount?: number;
  createdBy?: string;
  createdAt?: Date | string;
}

export interface CreateCourseData {
  name: string;
  description?: string;
  status?: CourseStatus;
  startDate?: string;
  endDate?: string;
  homeroomTeacherId: string;
  session?: number;
  capacity: number;
}

export type UpdateCourseData = Partial<CreateCourseData>;

export interface Session {
  _id: string;
  courseId: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  createdAt?: Date | string;
}

export interface CreateSessionData {
  courseId: string;
  sessionName: string;
  startTime: string;
  endTime: string;
}

export type UpdateSessionData = Partial<CreateSessionData>;

export type AttendanceStatus = "present" | "absent" | "not_yet";

export interface Attendance {
  status?: AttendanceStatus;
  state?: AttendanceStatus;
  s?: AttendanceStatus;
  attended?: boolean;
  isPresent?: boolean;
}

export interface AttendanceRecord {
  _id?: string;
  calendarId: string | { _id: string };
  studentId: string | { _id: string };
  status: AttendanceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionItem {
  calendarId: string | number | null;
  courseId: string | number | null;
  courseName: string;
  slotNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  teacher?: string | PopulatedTeacher;
  attendance?: Attendance | null;
  room?: string;
}

export type CalendarStatus = 'not_yet' | 'in_progress' | 'completed';

export interface PopulatedCourse {
  _id: string;
  name: string;
  codeName?: string;
  courseName?: string;
}

export interface PopulatedSession {
  _id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
}

export interface PopulatedTeacher {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  username?: string;
  displayName?: string;
}

export interface RequestInfo {
  _id: string;
  status: string;
  reason?: string;
}

export interface Calendar {
  _id: string;
  courseId: string | PopulatedCourse;
  sessionId: string | PopulatedSession;
  teacherId: string | PopulatedTeacher;
  date: string;
  note?: string;
  status: CalendarStatus;
  course?: PopulatedCourse;
  session?: PopulatedSession;
  teacher?: PopulatedTeacher;
  request?: RequestInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarData {
  courseId: string;
  sessionId: string;
  teacherId: string;
  date: string;
  note?: string;
}

export type UpdateCalendarData = Partial<CreateCalendarData>;

export interface CalendarWeekParams {
  startDate?: string;
  endDate?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'teacher' | 'student';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  message?: string;
  data: T;
  total?: number;
  pagination?: Pagination;
  details?: string;
}

export interface CalendarWeekResponse {
  message: string;
  count: number;
  data: Calendar[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  statusCode?: number;
}

export interface Enrollment {
  _id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped';
}

export interface RequestSchedule {
  _id: string;
  calendarId: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}