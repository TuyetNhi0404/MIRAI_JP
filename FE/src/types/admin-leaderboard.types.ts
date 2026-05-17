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
}

export interface GlobalStudent {
  rank: number;
  student: StudentInfo;
  averageFinalScore: number;
  totalCourses: number;
  passedCourses: number;
  passRate: number;
}

export interface CourseComparison {
  course: {
    id: string;
    name: string;
    status: string;
  };
  topStudent: {
    id: string;
    name: string;
    finalScore: number;
    grade: string;
  };
  statistics: {
    totalStudents: number;
    averageScore: number;
  };
  lastUpdated: string;
}

export interface Course {
  _id: string;
  name: string;
  status: string;
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

export interface GlobalLeaderboardData {
  topStudents: GlobalStudent[];
  totalStudents: number;
  lastUpdated: Date | string;
}

export interface CourseComparisonData {
  courses: CourseComparison[];
  totalCourses: number;
  highestScoreOverall: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}