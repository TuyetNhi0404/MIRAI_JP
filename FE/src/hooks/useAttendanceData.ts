import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { attendanceService } from '../services/attendance.service';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance.types';

interface UseAttendanceDataReturn {
  students: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  fetchStudents: (calendarId: string) => Promise<void>;
  updateStatus: (attendanceId: string, status: AttendanceStatus) => Promise<void>;
  updating: boolean;
}

interface ErrorResponse {
  message?: string;
}

export function useAttendanceData(): UseAttendanceDataReturn {
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (calendarId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching attendance data for calendar:', calendarId);

      const response = await attendanceService.getStudentsForCalendar(calendarId);

      const studentsData = response.data?.students || [];

      console.log('✅ Extracted students:', studentsData);

      setStudents(studentsData);
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const errorMessage = 
        axiosError.response?.data?.message || 
        axiosError.message || 
        'Failed to fetch attendance data';
      
      setError(errorMessage);
      console.error('❌ Error fetching attendance:', {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (attendanceId: string, status: AttendanceStatus) => {
    try {
      setUpdating(true);
      setError(null);

      console.log('🔄 Updating attendance:', { attendanceId, status });

      await attendanceService.updateAttendanceStatus(attendanceId, { status });

      setStudents(prev => 
        prev.map((student: AttendanceRecord) => 
          student.attendanceId === attendanceId 
            ? { ...student, status } 
            : student
        )
      );
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const errorMessage = 
        axiosError.response?.data?.message || 
        axiosError.message || 
        'Failed to update attendance';
      
      setError(errorMessage);
      console.error('❌ Error updating attendance:', {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });
      throw err; 
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    students,
    loading,
    error,
    fetchStudents,
    updateStatus,
    updating,
  };
}