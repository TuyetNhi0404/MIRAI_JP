// types/statistics.types.ts - Based on actual API response

// ============= API Response Wrapper =============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

// ============= Student & Course Info =============
export interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

export interface CourseInfo {
  id: string;
  name: string;
}

// ============= Weight Configuration =============
export interface WeightConfiguration {
  attendance: number;
  assignment: number;
  quiz: number;
}

// ============= Final Score Object =============
export interface FinalScoreData {
  _id: string;
  courseId: string;
  studentId: string;
  
  // Actual scores
  finalScore: number;
  attendanceScore: number;
  assignmentScore: number;
  quizScore: number;
  
  // Grade info
  grade: string;
  passed: boolean;
  rank: number;
  totalStudents: number;
  
  // Configuration
  weights: WeightConfiguration;
  
  // Timestamps
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// ============= Details Objects =============
export interface AttendanceDetails {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
}

export interface AssignmentDetails {
  totalAssignments: number;
  gradedAssignments: number;
  averageScore: number;
}

export interface QuizDetails {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  bestScore: number;
}

// ============= Score Component Object =============
export interface ScoreComponentData {
  _id: string;
  courseId: string;
  studentId: string;
  
  // Scores
  attendanceScore: number;
  assignmentScore: number;
  quizScore: number;
  
  // Details
  attendanceDetails: AttendanceDetails;
  assignmentDetails: AssignmentDetails;
  quizDetails: QuizDetails;
  
  // Timestamps
  lastCalculated: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// ============= Overview Statistics =============
export interface OverviewStatistics {
  totalCourses: number;
  averageFinalScore: number;
  averageAttendanceScore: number;
  averageAssignmentScore: number;
  averageQuizScore: number;
  passRate: number;
}

// ============= MAIN: Student Course Statistics =============
export interface StudentCourseStatistics {
  student: StudentInfo;
  course: CourseInfo;
  finalScore: FinalScoreData;
  scoreComponent: ScoreComponentData;
  overview: OverviewStatistics;
}

// ============= Course Summary for List =============
export interface StudentCourseSummary {
  _id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  homeroomTeacher?: string;
  enrolledCount?: number;
  capacity?: number;
  session?: number;
}

// ============= Assignment Details (nếu cần) =============
export interface AssignmentDetail {
  _id: string;
  title: string;
  score?: number;
  maxScore?: number;
  submittedAt?: string;
  gradedAt?: string;
}

export interface StudentAssignmentDetails {
  student: StudentInfo;
  course: CourseInfo;
  assignments: AssignmentDetail[];
  summary: {
    totalAssignments: number;
    gradedAssignments: number;
    averageScore: number;
  };
}

// ============= Utility Functions =============
export function getFinalScore(statistics: StudentCourseStatistics | null): number {
  if (!statistics?.finalScore) return 0;
  return statistics.finalScore.finalScore || 0;
}

export function getGrade(statistics: StudentCourseStatistics | null): string {
  if (!statistics?.finalScore) return 'N/A';
  return statistics.finalScore.grade || 'N/A';
}

export function isPassed(statistics: StudentCourseStatistics | null): boolean {
  if (!statistics?.finalScore) return false;
  return statistics.finalScore.passed || false;
}

export function getRank(statistics: StudentCourseStatistics | null): number | null {
  if (!statistics?.finalScore) return null;
  return statistics.finalScore.rank || null;
}

export function getTotalStudents(statistics: StudentCourseStatistics | null): number | null {
  if (!statistics?.finalScore) return null;
  return statistics.finalScore.totalStudents || null;
}

export function getAttendanceScore(statistics: StudentCourseStatistics | null): number {
  if (!statistics?.scoreComponent) return 0;
  return statistics.scoreComponent.attendanceScore || 0;
}

export function getAssignmentScore(statistics: StudentCourseStatistics | null): number {
  if (!statistics?.scoreComponent) return 0;
  return statistics.scoreComponent.assignmentScore || 0;
}

export function getQuizScore(statistics: StudentCourseStatistics | null): number {
  if (!statistics?.scoreComponent) return 0;
  return statistics.scoreComponent.quizScore || 0;
}

export function getWeights(statistics: StudentCourseStatistics | null): WeightConfiguration | null {
  if (!statistics?.finalScore?.weights) return null;
  return statistics.finalScore.weights;
}

export function getAttendanceDetails(statistics: StudentCourseStatistics | null): AttendanceDetails | null {
  if (!statistics?.scoreComponent?.attendanceDetails) return null;
  return statistics.scoreComponent.attendanceDetails;
}

export function getAssignmentDetails(statistics: StudentCourseStatistics | null): AssignmentDetails | null {
  if (!statistics?.scoreComponent?.assignmentDetails) return null;
  return statistics.scoreComponent.assignmentDetails;
}

export function getQuizDetails(statistics: StudentCourseStatistics | null): QuizDetails | null {
  if (!statistics?.scoreComponent?.quizDetails) return null;
  return statistics.scoreComponent.quizDetails;
}

export function getLastCalculated(statistics: StudentCourseStatistics | null): string | null {
  if (!statistics?.scoreComponent?.lastCalculated) return null;
  return statistics.scoreComponent.lastCalculated;
}

// ============= Type Guards =============
export function isValidStatistics(data: unknown): data is StudentCourseStatistics {
  if (!data || typeof data !== 'object') return false;
  const stats = data as Partial<StudentCourseStatistics>;
  return !!(stats.student && stats.course && stats.finalScore && stats.scoreComponent);
}