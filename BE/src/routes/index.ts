import { Application } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import courseRoutes from "./course.routes";
import quizRoutes from "./quiz.routes";
import feedbackRoutes from "./feedback.routes";
import assignmentRoutes from "./assignment.route";
import enrollmentRouter from "./enrollment.routes";
import profileRoutes from "./profile.routes";
import sessionRoutes from "./session.routes";
import calendarRoutes from "./calendar.routes";
import requestScheduleRoutes from "./requestSchedule.routes";
import chapterRoutes from "./chapter.routes";
import questionRoutes from "./question.routes";
import notificationRoutes from "./notification.routes";
import courseMemberRoutes from "./courseMember.routes";
import attendanceRoutes from "./attendance.routes";
import submitAssignmentRouter from "./submission.routes";
import forumRoutes from "./forum.routes";
import statisticsRoutes from "./statistics.routes";
import speechRouter from "./speech.routes";
import auditRouter from "./audit.routes";
import leaderboardRouter from "./leaderboard.routes";
import vocabularyRouter from "./vocabulary.routes";
import listeningRoutes from "./listening.routes";


export default function route(app: Application): void {
  app.use("/api/courses", courseRoutes);
  app.use("/api/enrollments", enrollmentRouter);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/sessions", sessionRoutes);
  app.use("/api/calendars", calendarRoutes);
  app.use("/api/chapters", chapterRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/feedbacks", feedbackRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/request-schedules", requestScheduleRoutes);
  app.use("/api/course-members", courseMemberRoutes);
  app.use("/api/attendances", attendanceRoutes);
  app.use("/api/submissions", submitAssignmentRouter);
  app.use("/api/forum", forumRoutes);
  app.use("/api/statistics", statisticsRoutes);
  app.use("/api/speech", speechRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/leaderboards", leaderboardRouter);
  app.use("/api/vocabulary", vocabularyRouter);
  app.use("/api/listening", listeningRoutes);

  
  // app.use("/api/forum", forumRouter);
  app.use("/api/notifications", notificationRoutes);
}
