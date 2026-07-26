// services/attendance.service.ts
// ✅ Separate service file to avoid import conflicts

import axiosInstance from '../api/axiosInstance';
import { AxiosError } from 'axios';
import type { AttendanceRecord, AttendanceHistory, UpdateAttendancePayload } from '../types/attendance.types';

const attendanceServiceAPI = axiosInstance;

// Response type interfaces
interface GetStudentsResponse {
  message: string;
  students: AttendanceRecord[];
}

interface UpdateAttendanceResponse {
  message: string;
  data: AttendanceRecord;
}

interface GetHistoryResponse {
  message: string;
  data: AttendanceHistory[];
}

// ============= ATTENDANCE SERVICE =============
export const attendanceService = {
  // Get students for a calendar (with auto-sync)
  getStudentsForCalendar: (calendarId: string) => 
    attendanceServiceAPI.get<GetStudentsResponse>(`/attendances/${calendarId}/students`),

  // Update attendance status
  updateAttendanceStatus: (calendarId: string, userId: string, data: UpdateAttendancePayload) => 
    attendanceServiceAPI.put<UpdateAttendanceResponse>(`/attendances/calendar/${calendarId}/user/${userId}`, data),

  // Get student's attendance history
  getStudentAttendance: (studentId: string) => 
    attendanceServiceAPI.get<GetHistoryResponse>(`/attendances/student/${studentId}`),
};

export default attendanceServiceAPI;