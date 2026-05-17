
import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  StudentCourseStatistics,
  StudentAssignmentDetails,
  ApiResponse,
  ApiError,
} from '../types/statistics.types';

// ============= BASE AXIOS INSTANCE =============
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const statisticsAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ============= REQUEST INTERCEPTOR =============
statisticsAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============= RESPONSE INTERCEPTOR =============
statisticsAPI.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('⚠️ Unauthorized - Token invalid or expired');
    }
    if (error.response?.status === 403) {
      console.error('🚫 Forbidden - Insufficient permissions');
    }
    if (error.response?.status === 404) {
      console.error('❌ Not Found:', error.config?.url);
    }
    if (error.response?.status === 500) {
      console.error('❌ Server Error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// ============= TYPES =============
interface CourseData {
  _id: string;
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  homeroomTeacher?: string;
  capacity?: number;
  session?: number;
  enrolledCount?: number;
}


export const getStudentCourseStatistics = (
  studentId: string,
  courseId: string
): Promise<AxiosResponse<ApiResponse<StudentCourseStatistics>>> => 
  statisticsAPI.get(`/statistics/students/${studentId}/courses/${courseId}`);


export const getStudentAssignmentDetails = (
  studentId: string,
  courseId: string
): Promise<AxiosResponse<ApiResponse<StudentAssignmentDetails>>> => 
  statisticsAPI.get(`/statistics/students/${studentId}/courses/${courseId}/assignments`);

export const getStudentCourses = async (): Promise<
  AxiosResponse<ApiResponse<CourseData[]>>
> => {
  try {
    const response = await statisticsAPI.get<ApiResponse<CourseData[]>>(
      '/courses/student/courses'
    );
    return response;
  } catch (error) {
    console.error('❌ Error fetching student courses:', error);
    throw error;
  }
};


export const getStudentCourse = async (
  courseId: string
): Promise<AxiosResponse<ApiResponse<CourseData>>> => {
  try {
    const response = await statisticsAPI.get<ApiResponse<CourseData>>(
      `/courses/student/course/${courseId}`
    );
    return response;
  } catch (error) {
    console.error('❌ Error fetching student course:', error);
    throw error;
  }
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
    if (axiosError.response?.status === 404) {
      return 'Không tìm thấy dữ liệu. Vui lòng kiểm tra lại.';
    }
    if (axiosError.response?.status === 403) {
      return 'Bạn không có quyền truy cập khóa học này.';
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  return 'Đã xảy ra lỗi không xác định';
};

export const formatApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return {
      message: axiosError.response?.data?.message || 'Đã xảy ra lỗi',
      error: axiosError.response?.data?.error,
      statusCode: axiosError.response?.status,
    };
  }
  return {
    message: 'Đã xảy ra lỗi không xác định',
  };
};

export default statisticsAPI;