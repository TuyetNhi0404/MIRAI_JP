import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Award, BookOpen, CheckCircle, Clock, Target, TrendingUp, BarChart3 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getStudentCourseStatistics, getStudentCourses, getErrorMessage } from "../../services/statistics.service";
import type { StudentCourseStatistics } from "../../types/statistics.types";
import type { RootState } from "../../redux/store";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { EmptyState } from "../../components/ui/EmptyState";

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

const StudentStatisticsDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const studentId = user?._id || "";

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<StudentCourseStatistics | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!user || !studentId) {
      setError("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    if (user.role !== "student") {
      setError("Tính năng này chỉ dành cho học sinh.");
      setLoading(false);
      return;
    }
    void loadCourseAndStatistics();
  }, [user, studentId]);

  const loadCourseAndStatistics = async () => {
    if (!studentId) {
      setError("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const coursesResponse = await getStudentCourses();
      const coursesData = coursesResponse.data.data || [];
      if (coursesData.length === 0) {
        setCourse(null);
        setLoading(false);
        return;
      }
      const studentCourse = coursesData[0];
      setCourse(studentCourse);

      try {
        const statsResponse = await getStudentCourseStatistics(studentId, studentCourse._id);
        setStatistics(statsResponse.data.data);
      } catch (statsError) {
        console.error("❌ Error loading statistics:", statsError);
        setError(getErrorMessage(statsError));
      }
    } catch (err) {
      console.error("❌ Error loading course:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status?: string): string => {
    switch (status) {
      case "in_progress":
        return "Đang học";
      case "not_yet":
        return "Chưa bắt đầu";
      case "complete":
        return "Hoàn thành";
      default:
        return "Chưa học";
    }
  };

  const getStatusStyle = (status?: string): string => {
    switch (status) {
      case "in_progress":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "complete":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "not_yet":
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  const getRadarData = () => {
    if (!statistics) return [];
    return [
      { subject: "Điểm danh", score: statistics.scoreComponent.attendanceScore, fullMark: 10 },
      { subject: "Bài tập", score: statistics.scoreComponent.assignmentScore, fullMark: 10 },
      { subject: "Kiểm tra", score: statistics.scoreComponent.quizScore, fullMark: 10 },
    ];
  };

  const getBarData = () => {
    if (!statistics) return [];
    return [
      { name: "Điểm danh", points: statistics.scoreComponent.attendanceScore, weight: statistics.finalScore.weights.attendance },
      { name: "Bài tập", points: statistics.scoreComponent.assignmentScore, weight: statistics.finalScore.weights.assignment },
      { name: "Kiểm tra", points: statistics.scoreComponent.quizScore, weight: statistics.finalScore.weights.quiz },
    ];
  };

  const getPieData = () => {
    if (!statistics) return [];
    return [
      { name: "Điểm danh", value: statistics.finalScore.weights.attendance, color: "#2563eb" },
      { name: "Bài tập", value: statistics.finalScore.weights.assignment, color: "#10b981" },
      { name: "Kiểm tra", value: statistics.finalScore.weights.quiz, color: "#f97316" },
    ];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-primary-color)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[var(--color-text-secondary)] font-medium">Đang tải dữ liệu học tập...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <PageLayout title="Thống kê kết quả học tập" subtitle="Theo dõi tiến độ học tập và điểm số">
        <BaseCard>
          <EmptyState
            title="Bạn chưa tham gia khóa học nào"
            description={error || "Vui lòng liên hệ quản trị viên hoặc giáo viên để đăng ký tham gia lớp học."}
            icon={Target}
          />
        </BaseCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Thống kê kết quả học tập" subtitle="Theo dõi tiến độ học tập và thành tích của bạn">
      {/* 1. Active Course Details */}
      <BaseCard className="bg-gradient-to-r from-[var(--color-surface-base)] to-[var(--color-bg-base)] border-l-4 border-[var(--color-primary-color)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-extrabold text-[var(--color-text-main)] m-0">{course.name}</h2>
            {course.description && <p className="text-xs text-[var(--color-text-secondary)] m-0 leading-relaxed">{course.description}</p>}
            {course.homeroomTeacher && (
              <p className="text-xs text-[var(--color-text-secondary)] m-0">
                <strong>Giáo viên chủ nhiệm:</strong> {course.homeroomTeacher}
              </p>
            )}
          </div>
          <div className="flex flex-col md:items-end gap-1.5 shrink-0">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusStyle(course.status)}`}>
              {getStatusText(course.status)}
            </span>
            {course.startDate && (
              <span className="text-[10px] text-[var(--color-text-secondary)]/70 font-medium">
                Bắt đầu: {new Date(course.startDate).toLocaleDateString("vi-VN")}
              </span>
            )}
            {course.endDate && (
              <span className="text-[10px] text-[var(--color-text-secondary)]/70 font-medium">
                Kết thúc: {new Date(course.endDate).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>
      </BaseCard>

      {statistics && (
        <>
          {/* 2. Final GPA Summary */}
          <BaseCard className="!p-6 bg-gradient-to-br from-[var(--color-primary-color)] to-indigo-750 text-white shadow-md border-0 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
              <Award size={180} />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Award size={32} className="text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white/80 block uppercase tracking-wider">Điểm tổng kết</span>
                  <span className="text-4xl font-black">{statistics.finalScore.finalScore.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center border-t md:border-t-0 md:border-l border-white/25 pt-4 md:pt-0 md:pl-10">
                <div>
                  <span className="text-[10px] font-bold text-white/80 block uppercase tracking-wider">Xếp loại</span>
                  <span className="text-lg font-black block mt-0.5 px-3 py-0.5 rounded-full bg-white text-[var(--color-primary-color)] inline-block">
                    {statistics.finalScore.grade}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-white/80 block uppercase tracking-wider">Trạng thái</span>
                  <span
                    className={`text-xs font-black block mt-1 px-3 py-0.5 rounded-full inline-block ${
                      statistics.finalScore.passed ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {statistics.finalScore.passed ? "Đạt" : "Trượt"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-white/80 block uppercase tracking-wider">Xếp hạng lớp</span>
                  <span className="text-base font-black block mt-1.5">
                    {statistics.finalScore.rank} / {statistics.finalScore.totalStudents}
                  </span>
                </div>
              </div>
            </div>
          </BaseCard>

          {/* 3. Tab Switches */}
          <div className="flex bg-[var(--color-surface-base)] rounded-2xl p-1 shadow-sm border border-[var(--color-border-color)] max-w-md">
            <button
              onClick={() => setTabValue(0)}
              className={`flex-1 py-2.5 text-xs font-extrabold transition flex items-center justify-center gap-2 rounded-xl ${
                tabValue === 0 ? "bg-[var(--color-primary-color)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              }`}
            >
              <BarChart3 size={15} />
              Chi tiết điểm số
            </button>
            <button
              onClick={() => setTabValue(1)}
              className={`flex-1 py-2.5 text-xs font-extrabold transition flex items-center justify-center gap-2 rounded-xl ${
                tabValue === 1 ? "bg-[var(--color-primary-color)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]"
              }`}
            >
              <TrendingUp size={15} />
              Phân tích trực quan
            </button>
          </div>

          {/* Tab 0: Detail cards */}
          {tabValue === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Attendance */}
              <BaseCard className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50/50 flex items-center justify-center text-orange-600 shrink-0">
                      <CheckCircle size={20} />
                    </div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)] m-0">Điểm danh chuyên cần</h3>
                  </div>

                  <div>
                    <span className="text-3xl font-black text-orange-500">
                      {statistics.scoreComponent.attendanceScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]/50 font-bold ml-1">/ 10</span>
                  </div>

                  <hr className="border-[var(--color-border-color)] my-2" />

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Tổng số ca học:</span>
                      <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.attendanceDetails.totalSessions} buổi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Tham gia (Có mặt):</span>
                      <span className="font-bold text-emerald-600">{statistics.scoreComponent.attendanceDetails.presentCount} buổi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Vắng mặt:</span>
                      <span className="font-bold text-red-500">{statistics.scoreComponent.attendanceDetails.absentCount} buổi</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border-color)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Tỷ lệ chuyên cần</span>
                    <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.attendanceDetails.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${statistics.scoreComponent.attendanceDetails.percentage}%` }}
                    ></div>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-[var(--color-text-secondary)]/55 border border-[var(--color-border-color)] rounded px-2 py-0.5 mt-2 bg-[var(--color-bg-base)]">
                    Trọng số: {statistics.finalScore.weights.attendance}%
                  </span>
                </div>
              </BaseCard>

              {/* Card 2: Assignments */}
              <BaseCard className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-color)]/50 flex items-center justify-center text-[var(--color-primary-color)] shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)] m-0">Bài tập về nhà</h3>
                  </div>

                  <div>
                    <span className="text-3xl font-black text-[var(--color-primary-color)]">
                      {statistics.scoreComponent.assignmentScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]/50 font-bold ml-1">/ 10</span>
                  </div>

                  <hr className="border-[var(--color-border-color)] my-2" />

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Tổng số bài giao:</span>
                      <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.assignmentDetails.totalAssignments} bài</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Đã chấm điểm:</span>
                      <span className="font-bold text-[var(--color-primary-color)]">{statistics.scoreComponent.assignmentDetails.gradedAssignments} bài</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Điểm trung bình:</span>
                      <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.assignmentDetails.averageScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border-color)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Tỷ lệ hoàn thành</span>
                    <span className="font-bold text-[var(--color-text-main)]">
                      {statistics.scoreComponent.assignmentDetails.totalAssignments > 0
                        ? ((statistics.scoreComponent.assignmentDetails.gradedAssignments / statistics.scoreComponent.assignmentDetails.totalAssignments) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--color-primary-color)] h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          statistics.scoreComponent.assignmentDetails.totalAssignments > 0
                            ? (statistics.scoreComponent.assignmentDetails.gradedAssignments / statistics.scoreComponent.assignmentDetails.totalAssignments) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-[var(--color-text-secondary)]/55 border border-[var(--color-border-color)] rounded px-2 py-0.5 mt-2 bg-[var(--color-bg-base)]">
                    Trọng số: {statistics.finalScore.weights.assignment}%
                  </span>
                </div>
              </BaseCard>

              {/* Card 3: Quizzes */}
              <BaseCard className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-600 shrink-0">
                      <Target size={20} />
                    </div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)] m-0">Bài kiểm tra & Quizzes</h3>
                  </div>

                  <div>
                    <span className="text-3xl font-black text-emerald-600">
                      {statistics.scoreComponent.quizScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]/50 font-bold ml-1">/ 10</span>
                  </div>

                  <hr className="border-[var(--color-border-color)] my-2" />

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Tổng số đề kiểm tra:</span>
                      <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.quizDetails.totalQuizzes} đề</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Đã thực hiện:</span>
                      <span className="font-bold text-emerald-600">{statistics.scoreComponent.quizDetails.completedQuizzes} đề</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Điểm trung bình:</span>
                      <span className="font-bold text-[var(--color-text-main)]">{statistics.scoreComponent.quizDetails.averageScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border-color)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Tỷ lệ làm bài</span>
                    <span className="font-bold text-[var(--color-text-main)]">
                      {statistics.scoreComponent.quizDetails.totalQuizzes > 0
                        ? ((statistics.scoreComponent.quizDetails.completedQuizzes / statistics.scoreComponent.quizDetails.totalQuizzes) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-secondary-color)] rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          statistics.scoreComponent.quizDetails.totalQuizzes > 0
                            ? (statistics.scoreComponent.quizDetails.completedQuizzes / statistics.scoreComponent.quizDetails.totalQuizzes) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-[var(--color-text-secondary)]/55 border border-[var(--color-border-color)] rounded px-2 py-0.5 mt-2 bg-[var(--color-bg-base)]">
                    Trọng số: {statistics.finalScore.weights.quiz}%
                  </span>
                </div>
              </BaseCard>
            </div>
          )}

          {/* Tab 1: Visual charts */}
          {tabValue === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <BaseCard>
                <h4 className="text-sm font-extrabold text-[var(--color-text-main)] mb-4">Radar biểu đồ phân tích thành tích</h4>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={getRadarData()}>
                      <PolarGrid stroke="var(--color-border-color)" />
                      <PolarAngleAxis dataKey="subject" stroke="var(--color-text-secondary)" style={{ fontSize: "12px", fontWeight: "bold" }} />
                      <PolarRadiusAxis stroke="var(--color-border-color)" style={{ fontSize: "11px" }} />
                      <Radar name="Điểm số" dataKey="score" stroke="var(--color-primary-color)" fill="var(--color-primary-color)" fillOpacity={0.15} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-base)", border: "1px solid var(--color-border-color)", borderRadius: "8px", color: "var(--color-text-main)", fontSize: "12px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </BaseCard>

              {/* Weight Breakdown Pie Chart */}
              <BaseCard>
                <h4 className="text-sm font-extrabold text-[var(--color-text-main)] mb-4">Cơ cấu tỷ trọng điểm tổng kết</h4>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="var(--color-primary-color)"
                        dataKey="value"
                        style={{ fontSize: "11px", fontWeight: "bold" }}
                      >
                        {getPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-base)", border: "1px solid var(--color-border-color)", borderRadius: "8px", color: "var(--color-text-main)", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </BaseCard>

              {/* Bar Chart comparing weight vs point */}
              <BaseCard className="lg:col-span-2">
                <h4 className="text-sm font-extrabold text-[var(--color-text-main)] mb-4">So sánh điểm thành phần và Trọng số</h4>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getBarData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-color)" />
                      <XAxis dataKey="name" stroke="var(--color-text-secondary)" style={{ fontSize: "12px", fontWeight: "bold" }} />
                      <YAxis stroke="var(--color-text-secondary)" style={{ fontSize: "11px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-base)", border: "1px solid var(--color-border-color)", borderRadius: "8px", color: "var(--color-text-main)", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "bold" }} />
                      <Bar dataKey="points" name="Điểm thực tế (Thang 10)" fill="var(--color-primary-color)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="weight" name="Trọng số (%)" fill="var(--color-secondary-color)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BaseCard>
            </div>
          )}
        </>
      )}

      {/* Footer metadata timestamp */}
      <div className="flex items-center justify-end gap-1.5 text-[var(--color-text-secondary)]/60 text-xs">
        <Clock size={14} />
        <span>
          Tính toán lần cuối:{" "}
          {statistics
            ? new Date(statistics.scoreComponent.lastCalculated).toLocaleString("vi-VN")
            : "Chưa cập nhật"}
        </span>
      </div>
    </PageLayout>
  );
};

export default StudentStatisticsDashboard;
