
import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { courseAPI, sessionAPI, calendarAPI } from '../services/scheduleManagementAPI';
import type { Course, Session, Calendar, User } from '../types/schedule.types';
import type { AxiosResponse } from 'axios';

interface ScheduleData {
  courses: Course[];
  sessions: Session[];
  calendars: Calendar[];
  users: User[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface BackendResponse<T> {
  data: T;
  total?: number;
  message?: string;
}

export function useScheduleData(): ScheduleData {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching schedule data...');

      const [coursesRes, sessionsRes, calendarsRes, teachersRes] = await Promise.all([
        courseAPI.getAll(),
        sessionAPI.getAll(),
        calendarAPI.getAll(),
        courseAPI.getHomeroomTeachers(), 
      ]);

      console.log('📦 Raw API responses:');
      console.log('Courses:', coursesRes.data);
      console.log('Sessions:', sessionsRes.data);
      console.log('Calendars:', calendarsRes.data);
      console.log('Teachers:', teachersRes.data);

      const extractArray = <T,>(response: AxiosResponse<BackendResponse<T[]>>): T[] => {
        const result = response.data;
  
        if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
          return result.data;
        }

        if (Array.isArray(result)) {
          return result;
        }
        
        console.warn('⚠️ Unexpected response structure:', result);
        return [];
      };

      const coursesData = extractArray<Course>(coursesRes);
      const sessionsData = extractArray<Session>(sessionsRes);
      const calendarsData = extractArray<Calendar>(calendarsRes);
      const usersData = extractArray<User>(teachersRes);

      console.log('✅ Extracted data counts:');
      console.log('Courses:', coursesData.length);
      console.log('Sessions:', sessionsData.length);
      console.log('Calendars:', calendarsData.length);
      console.log('Users:', usersData.length);

      setCourses(coursesData);
      setSessions(sessionsData);
      setCalendars(calendarsData);
      setUsers(usersData);
      
      console.log('✅ State updated successfully');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      
      const errorMessage = 
        axiosError.response?.data?.message || 
        axiosError.message || 
        'Failed to fetch data';
        
      setError(errorMessage);
      
      console.error('❌ Error fetching schedule data:', {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        url: axiosError.config?.url,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    courses, 
    sessions, 
    calendars, 
    users, 
    loading, 
    error, 
    refetch: fetchData 
  };
}