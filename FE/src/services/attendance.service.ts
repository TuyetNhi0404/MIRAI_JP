// services/attendance.service.ts
// ✅ Separate service file to avoid import conflicts

import axios, { AxiosError } from 'axios';
import type { AttendanceRecord, AttendanceHistory, UpdateAttendancePayload } from '../types/attendance.types';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const attendanceServiceAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptors
attendanceServiceAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attendanceServiceAPI.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('⚠️ Unauthorized - Token invalid or expired');
    }
    if (error.response?.status === 500) {
      console.error('❌ Server Error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

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
  updateAttendanceStatus: (attendanceId: string, data: UpdateAttendancePayload) => 
    attendanceServiceAPI.put<UpdateAttendanceResponse>(`/attendances/${attendanceId}`, data),

  // Get student's attendance history
  getStudentAttendance: (studentId: string) => 
    attendanceServiceAPI.get<GetHistoryResponse>(`/attendances/student/${studentId}`),
};

export default attendanceServiceAPI;