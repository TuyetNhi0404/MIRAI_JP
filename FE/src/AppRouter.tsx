// src/AppRouter.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";

import DashboardLayout from "./layout/DashboardLayout";
import MiraiJpCenter from "./pages/GetStart";
import RegisterForm from "./components/enrollment/RegisterForm";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";

// 🌿 Student pages
import StudentSchedulePage from "./pages/Student/StudentSchedulePage";
import SubmissionPage from "./pages/Student/SubmissionPage";
import StudentQuizzesPage from "./pages/Student/StudentQuizzesPage";
import TakeQuizPage from "./pages/Student/TakeQuizPage";
import ViewResultPage from "./pages/Student/ViewResultPage";
import ListeningListPage from "./features/listening/pages/ListeningListPage";
import ListeningDetailPage from "./features/listening/pages/ListeningDetailPage";

// 🌿 Admin pages
import AccountManagement from "./pages/Admin/AccountManagement";
import CoursesPage from "./pages/Admin/CoursesPage";
import CourseFormPage from "./pages/Admin/CourseFormPage";
import EnrolledStudentsPage from "./pages/Admin/EnrolledStudentsPage";
import EnrollmentRequestsPage from "./pages/Admin/EnrollmentRequestsPage";
import ForumListPage from "./pages/ForumListPage";
import RequestSchedulePage from "./pages/Admin/RequestSchedulePage";
import BannedUsersPage from "./pages/Admin/BannedUsersPage";
import ListeningManagePage from "./features/listening/admin/ListeningManagePage";
import ListeningFormPage from "./features/listening/admin/ListeningFormPage";

// 🌿 Teacher pages
import AssignmentsPage from "./pages/Teacher/AssignmentsPage";
import ScheduleManagementPage from "./pages/Admin/Schedule-management";
import TeacherSchedule from "./pages/Teacher/ScheduleTeacherPage";
import AddSchedulePage from "./pages/Admin/Schedule-management/schedule.add";
import QuestionBankPage from "./pages/Teacher/QuestionBankPage";
import ChapterQuestionsPage from "./pages/Teacher/ChapterQuestionsPage";
import TeacherSubmissionsPage from "./pages/Teacher/TeacherSubmissionsPage";
import ManageScheduleWithAttendance from "./pages/Admin/AttendanceManagement";
import QuizzesPage from "./pages/Teacher/QuizzesPage";
import InterviewPractice from "./components/AIAudit/interviewPractice";
import StudentStatisticsDashboard from "./pages/Student/StudentStatistics";
import { Leaderboard } from "./pages/Student/CourseLeaderboard";
import AdminLeaderboard from "./pages/Admin/AdminLeaderboard";
import KanaPracticePage from "./pages/Student/KanaPracticePage";
import TeacherCoursesPage from "./pages/Teacher/TeacherCoursesPage";
import TeacherCourseStudentsPage from "./pages/Teacher/TeacherCourseStudentsPage";

const AppRouter = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Router>
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

        {/* 🌼 Forum routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/faq" element={<ForumListPage />} />
        </Route>

        {/* 🔐 Private routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Admin routes */}
          <Route path="admin" element={<AdminLeaderboard />} />
          <Route path="admin/users" element={<AccountManagement />} />
          <Route path="admin/courses" element={<CoursesPage />} />
          <Route path="admin/courses/new" element={<CourseFormPage />} />
          <Route path="admin/courses/:id/edit" element={<CourseFormPage />} />
          <Route path="admin/attendance-management" element={<ManageScheduleWithAttendance />} />
          <Route path="admin/courses/:id/students" element={<EnrolledStudentsPage />} />
          <Route path="admin/requests" element={<EnrollmentRequestsPage />} /> {/* ✅ Thêm route */}
          <Route path="admin/schedule-management">
            <Route index element={<ScheduleManagementPage />} />
            <Route path="add" element={<AddSchedulePage />} />
          </Route>
          <Route path="admin/courses/:id/students" element={<EnrolledStudentsPage />} />
          <Route path="admin/request-management" element={<RequestSchedulePage />} />
          <Route path="admin/banned-users" element={<BannedUsersPage />} />
          <Route path="admin/listening" element={<ListeningManagePage />} />
          <Route path="admin/listening/new" element={<ListeningFormPage />} />
          <Route path="admin/listening/:id/edit" element={<ListeningFormPage />} />

          {/* Teacher routes */}
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="teacher/assignments" element={<AssignmentsPage />} />
          <Route path="teacher/schedule" element={<TeacherSchedule />} />
          <Route path="teacher/courses" element={<TeacherCoursesPage />} />
          <Route path="teacher/courses/:courseId/members" element={<TeacherCourseStudentsPage/>} />
          <Route path="teacher/questions" element={<QuestionBankPage />} />
          <Route path="teacher/questions/:chapterId" element={<ChapterQuestionsPage />} />
          <Route path="teacher/quizzes" element={<QuizzesPage />} />
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
          <Route path="student/audit-practice" element={<InterviewPractice />} />
          <Route path="student/statistics" element={<StudentStatisticsDashboard />} />
          <Route path="student/leaderboard" element={<Leaderboard />} />
          <Route path="student/kana-practice" element={<KanaPracticePage />} />
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
          <Route path="requests" element={<EnrollmentRequestsPage />} /> {/* ✅ Thêm route */}
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRouter;
