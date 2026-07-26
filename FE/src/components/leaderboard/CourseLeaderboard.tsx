import React, { useState, useEffect } from "react";
import { Trophy, Award, TrendingUp, Users, Target, Crown, Star } from "lucide-react";
import {
  getCourseLeaderboard,
  getStudentRank,
  getCurrentUser,
  getStudentCourse,
  getErrorMessage,
  formatScore,
  getGradeColor,
  getRankIcon,
} from "../../services/leaderboard.service";
import type { CourseLeaderboardData, StudentRankData, CurrentUser } from "../../types/leaderboard.types";
import { PageLayout } from "../ui/PageLayout";
import { BaseCard } from "../ui/BaseCard";
import { EmptyState } from "../ui/EmptyState";

const CourseLeaderboard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<CourseLeaderboardData | null>(null);
  const [studentRankData, setStudentRankData] = useState<StudentRankData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchLeaderboard();
    }
  }, [limit, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error("❌ Error fetching current user:", err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCourseLeaderboard(limit);
      setLeaderboardData(response.data.data);

      if (currentUser && currentUser.role === "student") {
        try {
          const courseId = await getStudentCourse();
          if (courseId) {
            const studentId = currentUser._id || currentUser.id;
            if (studentId) {
              const rankResponse = await getStudentRank(studentId, courseId);
              setStudentRankData(rankResponse.data.data);
            }
          }
        } catch (err) {
          console.error("Could not fetch student rank:", err);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUser = (studentId: string): boolean => {
    if (!currentUser || currentUser.role !== "student") return false;
    const currentUserId = currentUser._id || currentUser.id;
    return studentId === currentUserId;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-primary-color)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[var(--color-text-secondary)] font-medium">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  if (error || !leaderboardData) {
    return (
      <PageLayout title="Bảng xếp hạng" subtitle="Xem xếp hạng học tập của lớp học">
        <BaseCard>
          <EmptyState
            title="Chưa có dữ liệu xếp hạng"
            description={error || "Hãy tham gia khóa học học tập để xem bảng xếp hạng lớp học."}
            icon={Trophy}
          />
        </BaseCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Bảng xếp hạng"
      subtitle={leaderboardData.courseName}
      extra={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Hiển thị:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-sm font-semibold text-[var(--color-text-main)] bg-[var(--color-surface-base)] border border-[var(--color-border-color)] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-color)]/20"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      }
    >
      {/* 1. Performance Card */}
      {studentRankData && (
        <BaseCard className="border-2 border-[var(--color-primary-color)] bg-gradient-to-r from-[var(--color-surface-base)] to-[var(--color-accent-color)]/20 !p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--color-primary-color)]/20">
            <Star className="text-[var(--color-primary-color)] fill-[var(--color-primary-color)] shrink-0" size={16} />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider m-0">Thành tích của bạn</h2>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch gap-3">
            {/* Left side: Main Stats (Rank, Score, Percentile) */}
            <div className="flex-1 grid grid-cols-3 gap-2.5">
              <div className="text-center p-2.5 bg-[var(--color-accent-color)]/50 rounded-xl border border-[var(--color-primary-color)]/15 flex flex-col justify-center items-center">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] block">Xếp hạng</span>
                <span className="text-xl font-black text-[var(--color-primary-color)] leading-none my-1">{getRankIcon(studentRankData.rank)}</span>
                <span className="text-[9px] text-[var(--color-text-secondary)]/70 block">{studentRankData.rank}/{studentRankData.totalStudents} học viên</span>
              </div>

              <div className="text-center p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100 flex flex-col justify-center items-center">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] block">Điểm trung bình</span>
                <span className="text-xl font-black text-emerald-600 leading-none my-1">{formatScore(studentRankData.finalScore)}</span>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white inline-block mt-0.5"
                  style={{ backgroundColor: getGradeColor(studentRankData.grade) }}
                >
                  Học lực: {studentRankData.grade}
                </span>
              </div>

              <div className="text-center p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col justify-center items-center">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] block">Vượt trội</span>
                <span className="text-xl font-black text-indigo-600 leading-none my-1">{formatScore(studentRankData.percentile)}%</span>
                <span className="text-[9px] text-[var(--color-text-secondary)]/70 block">Cao hơn {(100 - studentRankData.percentile).toFixed(0)}%</span>
              </div>
            </div>

            {/* Right side: Detailed Sub-scores */}
            <div className="lg:w-72 p-3 bg-white/90 rounded-xl border border-slate-200 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Chi tiết các đầu điểm
              </span>
              <div className="grid grid-cols-3 gap-1 text-center divide-x divide-slate-150">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block">Chuyên cần</span>
                  <span className="text-xs font-black text-[var(--color-primary-color)] mt-0.5 block">{formatScore(studentRankData.attendanceScore)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block">Bài tập</span>
                  <span className="text-xs font-black text-emerald-600 mt-0.5 block">{formatScore(studentRankData.assignmentScore)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block">Bài thi</span>
                  <span className="text-xs font-black text-orange-600 mt-0.5 block">{formatScore(studentRankData.quizScore)}</span>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>
      )}

      {/* 2. Overview Stats */}
      {leaderboardData.statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BaseCard className="flex items-center gap-3 !p-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-color)] flex items-center justify-center text-[var(--color-primary-color)] shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase truncate">Sĩ số</span>
              <span className="text-xs font-black text-slate-800">{leaderboardData.statistics.totalStudents} học viên</span>
            </div>
          </BaseCard>

          <BaseCard className="flex items-center gap-3 !p-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase truncate">Trung bình lớp</span>
              <span className="text-xs font-black text-slate-800">{formatScore(leaderboardData.statistics.averageScore)}</span>
            </div>
          </BaseCard>

          <BaseCard className="flex items-center gap-3 !p-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
              <Award size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase truncate">Cao nhất</span>
              <span className="text-xs font-black text-slate-800">{formatScore(leaderboardData.statistics.highestScore)}</span>
            </div>
          </BaseCard>

          <BaseCard className="flex items-center gap-3 !p-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Target size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase truncate">Đạt chuẩn</span>
              <span className="text-xs font-black text-slate-800">{leaderboardData.statistics.passRate.toFixed(1)}%</span>
            </div>
          </BaseCard>
        </div>
      )}

      {/* 3. Leaderboard Grid */}
      <BaseCard className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary-color)] to-[var(--color-primary-color-hover)] px-6 py-4 flex items-center gap-2.5">
          <Crown className="text-white" size={20} />
          <h2 className="text-base font-bold text-white m-0">Danh sách xếp hạng lớp</h2>
        </div>

        {/* Responsive Layout */}
        <div className="p-6">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-color)] text-left bg-[var(--color-bg-base)]/50">
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Hạng</th>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Học viên</th>
                  <th className="py-3 px-4 text-center text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Điểm tổng kết</th>
                  <th className="py-3 px-4 text-center text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Học lực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-color)]">
                {leaderboardData.topStudents.map((student) => {
                  const current = isCurrentUser(student.student.id);
                  return (
                    <tr
                      key={student.student.id}
                      className={`transition-colors duration-150 hover:bg-[var(--color-bg-base)]/30 ${
                        current ? "bg-[var(--color-accent-color)]/30 border-l-4 border-[var(--color-primary-color)]" : ""
                      }`}
                    >
                      <td className="py-4 px-4 font-bold text-[var(--color-text-main)]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankIcon(student.rank)}</span>
                          {current && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--color-primary-color)] text-white uppercase tracking-wider">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--color-bg-base)] overflow-hidden flex items-center justify-center text-[var(--color-text-secondary)] font-bold border border-[var(--color-border-color)]">
                            {student.student.avatar ? (
                              <img src={student.student.avatar} alt={student.student.name} className="w-full h-full object-cover" />
                            ) : (
                              student.student.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-[var(--color-text-main)] block">
                              {student.student.name}
                              {current && <span className="text-xs text-[var(--color-primary-color)] font-medium ml-1">(Bạn)</span>}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)]/70 block">{student.student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-extrabold text-[var(--color-primary-color)]">{formatScore(student.finalScore)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: getGradeColor(student.grade) }}
                        >
                          {student.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based List View */}
          <div className="block md:hidden space-y-4">
            {leaderboardData.topStudents.map((student) => {
              const current = isCurrentUser(student.student.id);
              return (
                <div
                  key={student.student.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    current
                      ? "border-[var(--color-primary-color)] bg-gradient-to-br from-[var(--color-surface-base)] to-[var(--color-accent-color)]/20 shadow-sm"
                      : "border-[var(--color-border-color)] bg-[var(--color-surface-base)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-[var(--color-primary-color)]">{getRankIcon(student.rank)}</span>
                      <div className="w-9 h-9 rounded-full bg-[var(--color-bg-base)] overflow-hidden flex items-center justify-center text-[var(--color-text-secondary)] font-bold border border-[var(--color-border-color)]">
                        {student.student.avatar ? (
                          <img src={student.student.avatar} alt={student.student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.student.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[var(--color-text-main)] block">
                          {student.student.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-secondary)]/70 block">{student.student.email}</span>
                      </div>
                    </div>

                    {current && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--color-primary-color)] text-white uppercase tracking-wider shrink-0">
                        Bạn
                      </span>
                    )}
                  </div>

                  <hr className="border-[var(--color-border-color)] my-2.5" />

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]/70 block">Điểm tổng kết</span>
                      <span className="text-base font-extrabold text-[var(--color-primary-color)]">{formatScore(student.finalScore)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]/70 block text-right">Học lực</span>
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white inline-block mt-0.5"
                        style={{ backgroundColor: getGradeColor(student.grade) }}
                      >
                        {student.grade}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BaseCard>

      {/* 4. Last Updated Timestamp */}
      <div className="text-center p-3 bg-[var(--color-bg-base)]/50 rounded-xl border border-[var(--color-border-color)]">
        <span className="text-xs text-[var(--color-text-secondary)] font-medium">
          Cập nhật lần cuối: {new Date(leaderboardData.lastUpdated).toLocaleString("vi-VN")}
        </span>
      </div>
    </PageLayout>
  );
};

export default CourseLeaderboard;
