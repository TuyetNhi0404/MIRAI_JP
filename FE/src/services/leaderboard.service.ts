// services/leaderboard.service.ts
import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  CourseLeaderboardData,
  StudentRankData,
  ApiResponse,
  ApiError,
} from '../types/leaderboard.types';

// ============= BASE AXIOS INSTANCE =============
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const leaderboardAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ============= REQUEST INTERCEPTOR =============
leaderboardAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============= RESPONSE INTERCEPTOR =============
leaderboardAPI.interceptors.response.use(
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

// ============= USER API =============

export const getCurrentUser = async (): Promise<{ id: string; _id: string; name: string; email: string; role: string } | null> => {
  try {
    // Thử endpoint profile trước
    const response = await leaderboardAPI.get('/profile');
    const user = response.data.data || response.data;
    
    console.log('✅ Fetched current user from API:', user);
    
    // Đảm bảo có cả id và _id
    if (user._id && !user.id) {
      user.id = user._id;
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error fetching current user:', error);
    return null;
  }
};

// ============= COURSE API =============

export const getStudentCourse = async (): Promise<string | null> => {
  try {
    const response = await leaderboardAPI.get('/courses/student/courses');
    const courses = response.data.data;
    
    if (courses && courses.length > 0) {
      return courses[0]._id; // Lấy course đầu tiên
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching student course:', error);
    return null;
  }
};

// ============= LEADERBOARD API =============

export const getCourseLeaderboard = async (
  limit: number = 10
): Promise<AxiosResponse<ApiResponse<CourseLeaderboardData>>> => {
  // Tự động lấy courseId của student
  const courseId = await getStudentCourse();
  
  if (!courseId) {
    throw new Error('Bạn chưa tham gia khóa học nào');
  }
  
  return leaderboardAPI.get(`/leaderboards/course/${courseId}`, {
    params: { limit }
  });
};


export const getStudentRank = async (
  studentId: string,
  courseId: string
): Promise<AxiosResponse<ApiResponse<StudentRankData>>> => {
  return leaderboardAPI.get(`/leaderboards/student/${studentId}/course/${courseId}`);
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
      return 'Không tìm thấy dữ liệu leaderboard.';
    }
    if (axiosError.response?.status === 403) {
      return 'Bạn không có quyền truy cập leaderboard này.';
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


export const formatScore = (score: number): string => {
  return score.toFixed(2);
};

export const getGradeColor = (grade: string): string => {
  const gradeColors: Record<string, string> = {
    'A+': '#4caf50',
    'A': '#66bb6a',
    'B+': '#8bc34a',
    'B': '#9ccc65',
    'C+': '#fdd835',
    'C': '#ffeb3b',
    'D+': '#ff9800',
    'D': '#ff5722',
    'F': '#f44336',
  };
  return gradeColors[grade] || '#9e9e9e';
};


export const getRankIcon = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export default leaderboardAPI;