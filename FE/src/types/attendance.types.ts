// types/attendance.types.ts

export type AttendanceStatus = 'not_yet' | 'absent' | 'present';

// Export as const object for runtime usage
export const AttendanceStatus = {
  NOT_YET: 'not_yet' as const,
  ABSENT: 'absent' as const,
  PRESENT: 'present' as const,
} as const;


export interface User {
  _id: string;
  name: string;
  email: string;
  username?: string;
}

export interface AttendanceRecord {
  attendanceId: string;
  userId: User;
  name: string;
  username?: string;
  email: string;
  status: AttendanceStatus;
}

export interface AttendanceHistory {
  _id: string;
  userId: string;
  status: AttendanceStatus;
  calendarId: {
    _id: string;
    date: string;
    sessionId: {
      _id: string;
      sessionName: string;
    };
    courseId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAttendancePayload {
  status: AttendanceStatus;
}