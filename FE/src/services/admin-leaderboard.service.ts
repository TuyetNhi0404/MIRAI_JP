import axios from 'axios';
import type { 
  Course, 
  CourseLeaderboardData, 
  GlobalLeaderboardData, 
  CourseComparisonData,
  ApiResponse 
} from '../types/admin-leaderboard.types';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('⚠️ Unauthorized - Token invalid or expired');
    }
    if (error.response?.status === 403) {
      console.error('🚫 Forbidden - Insufficient permissions');
    }
    return Promise.reject(error);
  }
);

export const adminLeaderboardService = {
  // Lấy danh sách courses
  async getCourses(): Promise<Course[]> {
    const response = await api.get<ApiResponse<Course[]>>('/courses');
    return response.data.data || [];
  },

  // Lấy leaderboard của một course
  async getCourseLeaderboard(courseId: string, limit: number = 10): Promise<CourseLeaderboardData> {
    const response = await api.get<ApiResponse<CourseLeaderboardData>>(
      `/leaderboards/course/${courseId}`,
      { params: { limit } }
    );
    return response.data.data;
  },

  // Lấy global leaderboard
  async getGlobalLeaderboard(limit: number = 10): Promise<GlobalLeaderboardData> {
    const response = await api.get<ApiResponse<GlobalLeaderboardData>>(
      '/leaderboards/global',
      { params: { limit } }
    );
    return response.data.data;
  },

  // So sánh top 1 các courses
  async getCourseComparison(): Promise<CourseComparisonData> {
    const response = await api.get<ApiResponse<CourseComparisonData>>(
      '/leaderboards/compare-courses'
    );
    return response.data.data;
  },
};

// Helper functions
export const formatScore = (score: number): string => score.toFixed(2);

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