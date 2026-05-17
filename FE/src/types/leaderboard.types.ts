// types/leaderboard.types.ts

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface LeaderboardStudent {
  rank: number;
  student: StudentInfo;
  finalScore: number;
  grade: string;
  attendanceScore?: number;
  assignmentScore?: number;
  quizScore?: number;
}

export interface LeaderboardStatistics {
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export interface CourseLeaderboardData {
  courseId: string;
  courseName: string;
  topStudents: LeaderboardStudent[];
  statistics: LeaderboardStatistics | null;
  lastUpdated: Date | string;
}

export interface StudentRankData {
  student: StudentInfo;
  course: {
    id: string;
    name: string;
  };
  rank: number;
  totalStudents: number;
  finalScore: number;
  grade: string;
  percentile: number;
  attendanceScore: number;
  assignmentScore: number;
  quizScore: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

export interface CurrentUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string; 
}

