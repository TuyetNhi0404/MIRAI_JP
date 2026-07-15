// src/AppRouter.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";

import DashboardLayout from "./layout/DashboardLayout";
import { Spin } from "antd";
import { brandColors } from "./theme/theme";

const MiraiJpCenter = lazy(() => import("./pages/GetStart"));
const RegisterForm = lazy(() => import("./components/enrollment/RegisterForm").then(m => ({ default: m.default })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));

// 🌿 Student pages
const StudentSchedulePage = lazy(() => import("./pages/Student/StudentSchedulePage"));
const SubmissionPage = lazy(() => import("./pages/Student/SubmissionPage"));
const StudentQuizzesPage = lazy(() => import("./pages/Student/StudentQuizzesPage"));
const TakeQuizPage = lazy(() => import("./pages/Student/TakeQuizPage"));
const ViewResultPage = lazy(() => import("./pages/Student/ViewResultPage"));
const ListeningListPage = lazy(() => import("./features/listening/pages/ListeningListPage"));
const ListeningDetailPage = lazy(() => import("./features/listening/pages/ListeningDetailPage"));

// 🌿 Admin pages
const AccountManagement = lazy(() => import("./pages/Admin/AccountManagement"));
const CoursesPage = lazy(() => import("./pages/Admin/CoursesPage"));
const CourseFormPage = lazy(() => import("./pages/Admin/CourseFormPage"));
const EnrolledStudentsPage = lazy(() => import("./pages/Admin/EnrolledStudentsPage"));
const EnrollmentRequestsPage = lazy(() => import("./pages/Admin/EnrollmentRequestsPage"));
const RequestSchedulePage = lazy(() => import("./pages/Admin/RequestSchedulePage"));
const ListeningManagePage = lazy(() => import("./features/listening/admin/ListeningManagePage"));
const ListeningFormPage = lazy(() => import("./features/listening/admin/ListeningFormPage"));

// 🌿 Teacher pages
const AssignmentsPage = lazy(() => import("./pages/Teacher/AssignmentsPage"));
const ScheduleManagementPage = lazy(() => import("./pages/Admin/Schedule-management"));
const TeacherSchedule = lazy(() => import("./pages/Teacher/ScheduleTeacherPage"));
const AddSchedulePage = lazy(() => import("./pages/Admin/Schedule-management/schedule.add"));
const QuestionBankPage = lazy(() => import("./pages/Teacher/QuestionBankPage"));
const ChapterQuestionsPage = lazy(() => import("./pages/Teacher/ChapterQuestionsPage"));
const TeacherSubmissionsPage = lazy(() => import("./pages/Teacher/TeacherSubmissionsPage"));
const ManageScheduleWithAttendance = lazy(() => import("./pages/Admin/AttendanceManagement"));
const QuizzesPage = lazy(() => import("./pages/Teacher/QuizzesPage"));
const StudentStatisticsDashboard = lazy(() => import("./pages/Student/StudentStatistics"));
const Leaderboard = lazy(() => import("./pages/Student/CourseLeaderboard").then(m => ({ default: m.Leaderboard })));
const AdminLeaderboard = lazy(() => import("./pages/Admin/AdminLeaderboard"));
const AdminHome = lazy(() => import("./pages/Admin/AdminHome"));
const KanaPracticePage = lazy(() => import("./pages/Student/KanaPracticePage"));
const TeacherCoursesPage = lazy(() => import("./pages/Teacher/TeacherCoursesPage"));
const TeacherCourseStudentsPage = lazy(() => import("./pages/Teacher/TeacherCourseStudentsPage"));
const VocabularyManagement = lazy(() => import("./pages/Admin/VocabularyManagement"));
const VocabularyPracticePage = lazy(() => import("./pages/Student/VocabularyPracticePage"));
const SpeakingPracticePage = lazy(() => import("./features/speaking/SpeakingPracticePage"));
const AdminGrammarManagement = lazy(() => import("./pages/Admin/AdminGrammarManagement"));
const StudentGrammarPractice = lazy(() => import("./pages/Student/StudentGrammarPractice"));
const TeacherQuizManagement = lazy(() => import("./pages/Teacher/TeacherQuizManagement"));

const PageLoader = () => (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: brandColors.bg,
    }}
  >
    <Spin size="large" />
  </div>
);

const AppRouter = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 🌿 Public routes */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={
                    user.role === "admin"
                      ? "/dashboard/admin"
                      : user.role === "teacher"
                        ? "/dashboard/teacher"
                        : "/dashboard/student"
                  }
                  replace
                />
              ) : (
                <MiraiJpCenter />
              )
            }
          />

          <Route path="/register" element={<RegisterForm />} />

          {/* 🔐 Private routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Admin routes */}
            <Route path="admin" element={<AdminHome />} />
            <Route path="admin/leaderboard" element={<AdminLeaderboard />} />
            <Route path="admin/users" element={<AccountManagement />} />
            <Route path="admin/courses" element={<CoursesPage />} />
            <Route path="admin/courses/new" element={<CourseFormPage />} />
            <Route path="admin/courses/:id/edit" element={<CourseFormPage />} />
            <Route path="admin/courses/:id/students" element={<EnrolledStudentsPage />} />
            <Route path="admin/requests" element={<EnrollmentRequestsPage />} />
            <Route path="admin/schedule-management">
              <Route index element={<ScheduleManagementPage />} />
              <Route path="add" element={<AddSchedulePage />} />
            </Route>
            <Route path="admin/courses/:id/students" element={<EnrolledStudentsPage />} />
            <Route path="admin/request-management" element={<RequestSchedulePage />} />

            <Route path="admin/vocabulary" element={<VocabularyManagement />} />
            <Route path="admin/grammar" element={<AdminGrammarManagement />} />
            <Route path="admin/listening" element={<ListeningManagePage />} />
            <Route path="admin/listening/new" element={<ListeningFormPage />} />
            <Route path="admin/listening/:id/edit" element={<ListeningFormPage />} />

            {/* Teacher routes */}
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/attendance" element={<ManageScheduleWithAttendance />} />
            <Route path="teacher/assignments" element={<AssignmentsPage />} />
            <Route path="teacher/schedule" element={<TeacherSchedule />} />
            <Route path="teacher/courses" element={<TeacherCoursesPage />} />
            <Route path="teacher/courses/:courseId/members" element={<TeacherCourseStudentsPage/>} />
            <Route path="teacher/questions" element={<QuestionBankPage />} />
            <Route path="teacher/questions/:chapterId" element={<ChapterQuestionsPage />} />
            <Route path="teacher/quizzes" element={<QuizzesPage />} />
            <Route path="teacher/grammar" element={<TeacherQuizManagement />} />
            <Route path="teacher/submissions" element={<TeacherSubmissionsPage />} />
            <Route path="teacher/listening" element={<ListeningListPage />} />
            <Route path="teacher/listening/:id" element={<ListeningDetailPage />} />

            {/* Student routes */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/schedule" element={<StudentSchedulePage />} />
            <Route path="student/assignment" element={<SubmissionPage />} />
            <Route path="student/quizzes" element={<StudentQuizzesPage />} />
            <Route path="student/quiz/:quizId" element={<TakeQuizPage />} />
            <Route path="student/quiz/result/:attemptId" element={<ViewResultPage />} />
            <Route path="student/speaking-practice" element={<SpeakingPracticePage />} />
            <Route
              path="student/audit-practice"
              element={<Navigate to="/dashboard/student/speaking-practice" replace />}
            />
            <Route path="student/statistics" element={<StudentStatisticsDashboard />} />
            <Route path="student/leaderboard" element={<Leaderboard />} />
            <Route path="student/kana-practice" element={<KanaPracticePage />} />
            <Route path="student/vocabulary-practice" element={<VocabularyPracticePage />} />
            <Route path="student/grammar-practice" element={<StudentGrammarPractice />} />
            <Route path="student/listening" element={<ListeningListPage />} />
            <Route path="student/listening/:id" element={<ListeningDetailPage />} />
            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard/student" replace />} />
          </Route>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/new" element={<CourseFormPage />} />
            <Route path="courses/:id/edit" element={<CourseFormPage />} />
            <Route path="courses/:id/students" element={<EnrolledStudentsPage />} />
            <Route path="requests" element={<EnrollmentRequestsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRouter;
