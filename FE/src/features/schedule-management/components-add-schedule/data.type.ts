export interface User {
  id: string; 
  name: string;
  email: string;
  password: string; 
  role: "admin" | "teacher" | "student";
  status: "pending" | "active" | "inactive";
  createdAt: string;
}

export interface Course {
  id: string; // courseId
  courseName: string;
  description?: string | null;
  status: "active" | "inactive";
  createdBy: string | null; 
  createdAt: string; 
}

export interface CourseMember {
  courseId: string;
  userId: string;
  enrolledAt: string;
}

export interface Session {
  id: string;
  sessionName: string;
  startTime: string; 
  endTime: string;  
}

export interface CourseCalendar {
  id: string;
  courseId: string;
  date: string; 
  sessionId: string;
  teacherId: string;
  status: "scheduled" | "completed" | "cancelled";
}