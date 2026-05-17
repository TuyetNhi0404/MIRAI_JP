
export interface Course {
  _id: string;
  name: string;
  codeName?: string;
  description?: string | null;
  status: string;
  homeroomTeacher?: string;
  homeroomTeacherId?: string;
  capacity?: number;
  session?: number;
  createdAt?: string;
}

export interface Session {
  _id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  courseId?: string;
}

export interface CourseCalendar {
  _id: string;
  courseId: string | PopulatedCourse;
  date: string | Date;
  sessionId: string | PopulatedSession;
  teacherId: string | PopulatedTeacher;
  status: "not_yet" | "in_progress" | "completed";
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PopulatedCourse {
  _id: string;
  name: string;
  codeName?: string;
}

interface PopulatedSession {
  _id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
}

interface PopulatedTeacher {
  _id: string;
  name: string;
  email: string;
}

export type RequestStatus = "pending" | "accepted" | "rejected";

export interface RequestSchedule {
  _id: string;
  calendarId: string | CourseCalendar;  
  createdBy: string | PopulatedTeacher; 
  reason: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherScheduleView {
  calendarId: string;
  courseId: string;
  courseName: string;
  date: string;
  sessionId: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName?: string;
  status: "not_yet" | "in_progress" | "completed";
  note?: string;
  request?: {
    _id: string;
    status: RequestStatus;
    reason?: string;
  } | null;
}

export interface ScheduleStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

export interface CreateRequestPayload {
  calendarId: string;
  reason: string;
}