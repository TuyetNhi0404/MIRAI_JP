import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import axiosInstance from '../api/axiosInstance';

import type {
  User,
  Course,
  CreateCourseData,
  UpdateCourseData,
  Session,
  CreateSessionData,
  UpdateSessionData,
  Calendar,
  CreateCalendarData,
  UpdateCalendarData,
  CalendarWeekParams,
  CalendarWeekResponse,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  PaginationParams,
  ApiResponse,
} from '../types/schedule.types';
const scheduleManagementAPI = axiosInstance;

export const courseAPI = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Course[]>>> => 
    scheduleManagementAPI.get('/courses'),
    
  getAvailable: (params?: PaginationParams): Promise<AxiosResponse<ApiResponse<Course[]>>> => 
    scheduleManagementAPI.get('/courses/available', { params }),
    
  getById: (id: string): Promise<AxiosResponse<ApiResponse<Course>>> => 
    scheduleManagementAPI.get(`/courses/${id}`),
    
  getHomeroomTeachers: (): Promise<AxiosResponse<ApiResponse<User[]>>> => 
    scheduleManagementAPI.get('/courses/homeroom-teachers/list'),
    
  create: (data: CreateCourseData): Promise<AxiosResponse<ApiResponse<Course>>> => 
    scheduleManagementAPI.post('/courses', data),
    
  update: (id: string, data: UpdateCourseData): Promise<AxiosResponse<ApiResponse<Course>>> => 
    scheduleManagementAPI.patch(`/courses/${id}`, data),
    
  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> => 
    scheduleManagementAPI.delete(`/courses/${id}`),
};
export const sessionAPI = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Session[]>>> => 
    scheduleManagementAPI.get('/sessions'),
  
  getByCourse: (courseId: string): Promise<AxiosResponse<ApiResponse<Session[]>>> => 
    scheduleManagementAPI.get(`/sessions?courseId=${courseId}`),
    
  create: (data: CreateSessionData): Promise<AxiosResponse<ApiResponse<Session>>> => 
    scheduleManagementAPI.post('/sessions', data),
    
  update: (sessionId: string, data: UpdateSessionData): Promise<AxiosResponse<ApiResponse<Session>>> => 
    scheduleManagementAPI.put(`/sessions/${sessionId}`, data),
    
  delete: (sessionId: string): Promise<AxiosResponse<ApiResponse<void>>> => 
    scheduleManagementAPI.delete(`/sessions/${sessionId}`),
};
export const calendarAPI = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Calendar[]>>> => 
    scheduleManagementAPI.get('/calendars'),
    
  getByWeek: (params?: CalendarWeekParams): Promise<AxiosResponse<CalendarWeekResponse>> => 
    scheduleManagementAPI.get('/calendars/week', { params }),
    
  create: (data: CreateCalendarData): Promise<AxiosResponse<ApiResponse<Calendar>>> => 
    scheduleManagementAPI.post('/calendars', data),
  
  update: (calendarId: string, data: UpdateCalendarData): Promise<AxiosResponse<ApiResponse<Calendar>>> => 
    scheduleManagementAPI.patch(`/calendars/${calendarId}`, data),
    
  delete: (calendarId: string): Promise<AxiosResponse<ApiResponse<void>>> => 
    scheduleManagementAPI.delete(`/calendars/${calendarId}`),
};
export const userAPI = {
  getAll: (): Promise<AxiosResponse<ApiResponse<User[]>>> => 
    scheduleManagementAPI.get('/admin/users'),
    
  getById: (id: string): Promise<AxiosResponse<ApiResponse<User>>> => 
    scheduleManagementAPI.get(`/admin/users/${id}`),
    
  create: (data: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<AxiosResponse<ApiResponse<User>>> => 
    scheduleManagementAPI.post('/admin/users', data),
    
  update: (id: string, data: Partial<Omit<User, '_id' | 'createdAt' | 'updatedAt'>>): Promise<AxiosResponse<ApiResponse<User>>> => 
    scheduleManagementAPI.put(`/admin/users/${id}`, data),
    
  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> => 
    scheduleManagementAPI.delete(`/admin/users/${id}`),
};
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => 
    scheduleManagementAPI.post('/auth/login', credentials),
    
  register: (data: RegisterData): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => 
    scheduleManagementAPI.post('/auth/register', data),
    
  logout: (): Promise<AxiosResponse<ApiResponse<void>>> => 
    scheduleManagementAPI.post('/auth/logout'),
    
  getCurrentUser: (): Promise<AxiosResponse<ApiResponse<User>>> => 
    scheduleManagementAPI.get('/auth/me'),
};

export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  return 'An unexpected error occurred';
};

export const isCourseAvailable = (course: Course): boolean => {
  return (
    course.status === 'not_yet' &&
    (course.enrolledCount ?? 0) < (course.capacity ?? 0) &&
    (!course.endDate || new Date(course.endDate) >= new Date())
  );
};

export const formatDateForAPI = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const getCurrentWeekRange = (): { startDate: string; endDate: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    startDate: formatDateForAPI(monday),
    endDate: formatDateForAPI(sunday),
  };
};

export default scheduleManagementAPI;