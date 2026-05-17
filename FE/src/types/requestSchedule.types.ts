export type RequestStatus = "pending" | "accepted" | "rejected";

export type Teacher = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type Course = {
  _id: string;
  name: string;
  codeName?: string;
};

export type Session = {
  _id: string;
  sessionName: string;
  startTime: string;
  endTime: string;
};

export type Calendar = {
  _id: string;
  courseId: Course;
  sessionId: Session;
  teacherId: Teacher;
  date: string;
  note?: string;
  status: RequestStatus | string;
};

export type RequestSchedule = {
  _id: string;
  calendarId: Calendar;
  createdBy: Teacher;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type RequestScheduleStats = {
  pending: number;
  accepted: number;
  rejected: number;
};
