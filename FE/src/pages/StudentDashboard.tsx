import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import {
  BookOpen,
  FileQuestion,
  CalendarDays,
  Trophy,
  ClipboardList,
  TrendingUp,
  Headphones,
  Mic,
  PenLine,
  BookMarked,
  Award,
  Clock,
  ArrowRight,
  GraduationCap,
  Sparkles,
  ChartLine,
} from "lucide-react";
import axios from "axios";
import type { RootState } from "../redux/store";
import { useQuiz } from "../hooks/useQuiz";
import { getStudentCourses, getStudentCourseStatistics } from "../services/statistics.service";
import type { StudentCourseStatistics } from "../types/statistics.types";
import StudentCard from "../components/ui/StudentCard";

dayjs.locale("vi");

const SAKURA_BG_URL =
  "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1400&auto=format&fit=crop&q=80";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const studentId = user?._id || "";

  // Data states
  const [courseName, setCourseName] = useState<string>("");
  const [statistics, setStatistics] = useState<StudentCourseStatistics | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [weeklySessionsCount, setWeeklySessionsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const { quizzes, attempts, loadStudentQuizzes, loadStudentHistory } = useQuiz();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const BASE = `${apiBaseUrl.replace(/\/$/, "")}/api`;

  const firstName = useMemo(() => {
    const raw = user?.name || "";
    return raw.split(/\s+/).filter(Boolean).pop() || raw || "Học viên";
  }, [user]);

  const hour = dayjs().hour();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const today = dayjs();

  // Load calendar schedule
  const loadDashboardData = async () => {
    try {
      if (studentId) {
        const coursesResponse = await getStudentCourses();
        const coursesData = coursesResponse.data.data || [];
        if (coursesData.length > 0) {
          const studentCourse = coursesData[0];
          setCourseName(studentCourse.name || studentCourse.courseName || "");
          const statsResponse = await getStudentCourseStatistics(studentId, studentCourse._id);
          if (statsResponse.data?.data) {
            setStatistics(statsResponse.data.data);
          }
        }
      }

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${BASE}/calendars`, {
        headers,
        withCredentials: true,
      });
      const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
      const todayYMD = dayjs().format("YYYY-MM-DD");
      const startOfWeekYMD = dayjs().startOf("week").format("YYYY-MM-DD");
      const endOfWeekYMD = dayjs().endOf("week").format("YYYY-MM-DD");

      let weeklyCount = 0;

      const sorted = raw
        .map((it: any) => {
          const date = it.date ?? it.day ?? it.startDate;
          const fmtDate = date ? dayjs(date).format("YYYY-MM-DD") : todayYMD;
          const sessionObj = it.sessionId ?? it.session ?? null;
          const startTime = sessionObj?.startTime ?? it.startTime ?? "00:00";
          const endTime = sessionObj?.endTime ?? it.endTime ?? "00:00";
          const slotNumber = it.slotNumber ?? it.slot ?? 1;
          const name = it.courseId?.courseName || it.courseId?.name || "Chưa xác định";

          let teacher = "Chưa phân công";
          if (it.teacherId && typeof it.teacherId === "object") {
            teacher = it.teacherId.fullName || it.teacherId.name || teacher;
          }

          if (fmtDate >= startOfWeekYMD && fmtDate <= endOfWeekYMD) {
            weeklyCount++;
          }

          return {
            calendarId: it._id || it.id,
            courseName: name,
            slotNumber,
            date: fmtDate,
            startTime,
            endTime,
            teacher,
          };
        })
        .filter((it: any) => it.date >= todayYMD)
        .sort((a: any, b: any) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.slotNumber - b.slotNumber;
        });

      setUpcomingSessions(sorted);
      setWeeklySessionsCount(weeklyCount);
    } catch (err) {
      console.error("❌ Error loading student dashboard data:", err);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        loadStudentQuizzes(),
        studentId ? loadStudentHistory({ studentId }) : Promise.resolve(),
        loadDashboardData(),
      ]);
      if (active) setLoading(false);
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, [studentId]);

  // Derived stats
  const pendingQuizzesCount = useMemo(() => {
    return quizzes.filter((q) => {
      if ("hasAttempted" in q) {
        return !q.hasAttempted;
      }
      return true;
    }).length;
  }, [quizzes]);

  const attendancePercent = useMemo(() => {
    if (statistics?.scoreComponent?.attendanceDetails) {
      return Math.round(statistics.scoreComponent.attendanceDetails.percentage);
    }
    return null;
  }, [statistics]);

  const avgScore = useMemo(() => {
    if (statistics?.finalScore?.finalScore) {
      return statistics.finalScore.finalScore;
    }
    return null;
  }, [statistics]);

  const nextSession = useMemo(() => {
    return upcomingSessions.length > 0 ? upcomingSessions[0] : null;
  }, [upcomingSessions]);

  const rankInfo = useMemo(() => {
    if (statistics?.finalScore) {
      const rank = statistics.finalScore.rank;
      const total = statistics.finalScore.totalStudents;
      return rank && total ? `Hạng ${rank}/${total}` : null;
    }
    return null;
  }, [statistics]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-12 bg-bg-base">
      {/* 🚀 Dynamic Premium Header Banner 🚀 */}
      <div className="relative rounded-[24px] overflow-hidden p-8 sm:p-10 text-white shadow-lg select-none bg-gradient-to-r from-primary-color via-primary-color-hover to-primary-color/80">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-right bg-no-repeat mix-blend-overlay opacity-25 pointer-events-none z-0"
          style={{ backgroundImage: `url('${SAKURA_BG_URL}')` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-transparent to-transparent pointer-events-none z-0"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 uppercase tracking-wider text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Cổng học viên MIRAI
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight m-0 text-white leading-tight">
              {greeting}, <span className="text-orange-200">{firstName}</span>!
            </h1>
            <p className="text-sm text-slate-100/90 max-w-[560px] m-0 font-medium leading-relaxed">
              Chào mừng bạn quay trở lại lớp học. Hôm nay là {today.format("dddd, D [tháng] M, YYYY")}.
              Hãy sẵn sàng cho những kiến thức mới đầy bổ ích nhé!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 md:border-l md:border-white/10 md:pl-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[120px] text-center">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-white/80">
                Tuần học này
              </span>
              <span className="block text-2xl font-black text-white mt-1">
                {weeklySessionsCount} buổi
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[120px] text-center">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-white/80">
                Lớp của tôi
              </span>
              <span className="block text-sm font-extrabold text-orange-200 mt-1.5 truncate max-w-[110px]">
                {courseName || "Chưa tham gia"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📘 Nhóm 1: Trung tâm học tập (Core Hub) 📘 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <GraduationCap className="text-primary-color" size={20} />
          <h2 className="text-lg font-extrabold text-text-main m-0">
            Trung tâm học tập (Core Hub)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Tổng quan */}
          <StudentCard
            title="Tổng quan học tập"
            description="Bảng thông số hoạt động chính của học viên."
            icon={TrendingUp}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Trực quan"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student")}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-border-color pb-2">
                <span className="text-text-secondary font-medium">Trạng thái lớp:</span>
                <span className="font-bold text-emerald-600">Đang học</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Buổi học kế tiếp:</span>
                <span className="font-semibold text-text-main">
                  {nextSession ? `${nextSession.startTime} - ${nextSession.date}` : "Chưa có lịch"}
                </span>
              </div>
            </div>
          </StudentCard>

          {/* Card 2: Lịch học */}
          <StudentCard
            title="Lịch học của tôi"
            description="Theo dõi thời khóa biểu và các slot học."
            icon={CalendarDays}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Hàng tuần"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/schedule")}
          >
            <div className="space-y-2">
              {nextSession ? (
                <>
                  <div className="flex justify-between items-center bg-accent-color/50 p-2.5 rounded-xl border border-primary-color/15">
                    <div className="min-w-0">
                      <span className="block text-[13px] font-bold text-primary-color truncate">
                        {nextSession.courseName}
                      </span>
                      <span className="block text-[10px] text-text-secondary truncate mt-0.5">
                        GV: {nextSession.teacher}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary-color shrink-0">
                      Slot {nextSession.slotNumber}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-secondary/80 font-semibold text-right">
                    Kế tiếp: {dayjs(nextSession.date).format("DD/MM/YYYY")} ({nextSession.startTime})
                  </div>
                </>
              ) : (
                <div className="text-xs text-text-secondary/80 py-4 text-center">Không có lịch học tiếp theo</div>
              )}
            </div>
          </StudentCard>

          {/* Card 3: Thống kê */}
          <StudentCard
            title="Thống kê kết quả"
            description="Xem bảng điểm chuyên cần và điểm thi môn học."
            icon={ChartLine}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Kết quả"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/statistics")}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-base p-2.5 rounded-xl text-center border border-border-color">
                <span className="block text-[10px] font-semibold text-text-secondary uppercase">Chuyên cần</span>
                <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                  {attendancePercent !== null ? `${attendancePercent}%` : "100%"}
                </span>
              </div>
              <div className="bg-bg-base p-2.5 rounded-xl text-center border border-border-color">
                <span className="block text-[10px] font-semibold text-text-secondary uppercase">GPA môn</span>
                <span className="text-base font-bold text-primary-color mt-0.5 block">
                  {avgScore !== null ? avgScore.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </StudentCard>
        </div>
      </section>

      {/* ✏️ Nhóm 2: Luyện tập & Kỹ năng (Skills & Practice) ✏️ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="text-primary-color" size={20} />
          <h2 className="text-lg font-extrabold text-text-main m-0">
            Luyện tập & Kỹ năng (Skills & Practice)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Card 4: Luyện nói AI */}
          <StudentCard
            title="Luyện nói AI"
            description="Hội thoại đàm thoại trực tiếp."
            icon={Mic}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Giọng nói"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/speaking-practice")}
          />

          {/* Card 5: Học chữ Kana */}
          <StudentCard
            title="Chữ cái Kana"
            description="Học bảng chữ cái Hiragana/Katakana."
            icon={PenLine}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Cơ bản"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/kana-practice")}
          />

          {/* Card 6: Ôn từ vựng */}
          <StudentCard
            title="Ôn từ vựng"
            description="Flashcards luyện tập ghi nhớ từ."
            icon={BookMarked}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Từ vựng"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/vocabulary-practice")}
          />

          {/* Card 7: Ôn ngữ pháp */}
          <StudentCard
            title="Ôn ngữ pháp"
            description="Tổng hợp các mẫu câu và bài học."
            icon={BookOpen}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Cấu trúc"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/grammar-practice")}
          />

          {/* Card 8: Luyện nghe */}
          <StudentCard
            title="Luyện nghe"
            description="Luyện nghe hiểu qua các đoạn hội thoại."
            icon={Headphones}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Nghe hiểu"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/listening")}
          />
        </div>
      </section>

      {/* 🏆 Nhóm 3: Kiểm tra & Thành tích (Assessment & Growth) 🏆 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Trophy className="text-primary-color" size={20} />
          <h2 className="text-lg font-extrabold text-text-main m-0">
            Kiểm tra & Thành tích (Assessment & Growth)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 9: Bài kiểm tra */}
          <StudentCard
            title="Bài kiểm tra"
            description="Làm các bài test, quiz đánh giá năng lực."
            icon={FileQuestion}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText={pendingQuizzesCount > 0 ? "Chờ làm" : "Hoàn thành"}
            badgeColorClass={pendingQuizzesCount > 0 ? "bg-accent-color text-primary-color" : "bg-emerald-50 text-emerald-600"}
            onClick={() => navigate("/dashboard/student/quizzes")}
          >
            <div className="bg-accent-color/50 border border-primary-color/15 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-color">Đang chờ bạn thực hiện:</span>
              <span className="text-sm font-black text-primary-color">{pendingQuizzesCount} bài test</span>
            </div>
          </StudentCard>

          {/* Card 10: Bài tập */}
          <StudentCard
            title="Bài tập về nhà"
            description="Làm và nộp bài tập được giao bởi giáo viên."
            icon={ClipboardList}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Hạn nộp"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/assignment")}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-border-color pb-2">
                <span className="text-text-secondary font-medium">Tổng số bài tập:</span>
                <span className="font-semibold text-text-main">
                  {statistics?.scoreComponent?.assignmentDetails?.totalAssignments || 0} bài
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Điểm trung bình bài tập:</span>
                <span className="font-bold text-text-main">
                  {statistics?.scoreComponent?.assignmentDetails?.averageScore?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </StudentCard>

          {/* Card 11: Bảng xếp dạng */}
          <StudentCard
            title="Bảng xếp hạng"
            description="Xem vị trí thi đua của bạn so với cả lớp."
            icon={Trophy}
            iconBgColorClass="bg-accent-color text-primary-color"
            badgeText="Thi đua"
            badgeColorClass="bg-accent-color text-primary-color"
            onClick={() => navigate("/dashboard/student/leaderboard")}
          >
            <div className="bg-accent-color/50 border border-primary-color/15 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-primary-color" size={18} />
                <span className="text-xs font-bold text-primary-color">Thứ hạng của bạn:</span>
              </div>
              <span className="text-sm font-black text-primary-color">{rankInfo || "Hạng --/--"}</span>
            </div>
          </StudentCard>
        </div>
      </section>

      {/* 🕒 Lịch sử kiểm tra và Lịch trình chi tiết (Side Panels) 🕒 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Upcoming Sessions Panel */}
        <div className="bg-surface-base border border-border-color rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-6 pb-2.5 border-b border-border-color">
            <h3 className="text-base font-extrabold text-text-main flex items-center gap-2 m-0">
              <Clock className="text-primary-color" size={18} />
              Chi tiết lịch học sắp tới
            </h3>
            <button
              onClick={() => navigate("/dashboard/student/schedule")}
              className="text-xs text-primary-color hover:underline font-semibold inline-flex items-center gap-0.5 border-0 bg-transparent cursor-pointer"
            >
              Xem lịch đầy đủ <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-text-secondary/85">Đang tải lịch học...</div>
            ) : upcomingSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary/85">Không có lịch học nào sắp tới.</div>
            ) : (
              upcomingSessions.slice(0, 3).map((session, i) => (
                <div
                  key={session.calendarId || i}
                  className="flex items-center justify-between p-4 rounded-xl border border-border-color bg-bg-base hover:bg-surface-base hover:border-primary-color/50 hover:shadow-[0_4px_20px_rgba(185,0,0,0.04)] transition-all duration-200"
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                    <span className="text-xs font-bold text-text-main truncate">
                      {session.courseName}
                    </span>
                    <span className="text-[10px] text-text-secondary truncate">
                      Giảng viên: {session.teacher}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-extrabold text-primary-color">
                      Slot {session.slotNumber} ({session.startTime} - {session.endTime})
                    </span>
                    <span className="text-[10px] text-text-secondary mt-1 font-medium">
                      {dayjs(session.date).format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Attempts Panel */}
        <div className="bg-surface-base border border-border-color rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-6 pb-2.5 border-b border-border-color">
            <h3 className="text-base font-extrabold text-text-main flex items-center gap-2 m-0">
              <Award className="text-primary-color" size={18} />
              Kết quả làm bài kiểm tra gần đây
            </h3>
            <button
              onClick={() => navigate("/dashboard/student/quizzes")}
              className="text-xs text-primary-color hover:underline font-semibold inline-flex items-center gap-0.5 border-0 bg-transparent cursor-pointer"
            >
              Xem lịch sử thi <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-text-secondary/85">Đang tải lịch sử thi...</div>
            ) : attempts.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary/85">Bạn chưa làm bài kiểm tra nào.</div>
            ) : (
              attempts.slice(0, 3).map((attempt, i) => {
                const title = attempt.quizId?.title || "Bài kiểm tra";
                const isPass = attempt.passed;
                return (
                  <div
                    key={attempt._id || i}
                    className="flex items-center justify-between p-4 rounded-xl border border-border-color bg-bg-base hover:bg-surface-base hover:border-primary-color/50 hover:shadow-[0_4px_20px_rgba(185,0,0,0.04)] transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <span className="text-xs font-bold text-text-main truncate">
                        {title}
                      </span>
                      <span className="text-[10px] text-text-secondary font-medium">
                        {dayjs(attempt.completedAt).format("DD/MM/YYYY HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-extrabold text-text-main">
                        {attempt.score.toFixed(1)} điểm
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isPass
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        {isPass ? "Đạt" : "Trượt"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
