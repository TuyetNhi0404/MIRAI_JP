import React, { useEffect, useMemo, useState } from "react";
import ScheduleGrid from "../../components/scheduleStudent/ScheduleGrid";
import dayjs from "dayjs";
import axiosInstance from "../../api/axiosInstance";
import { AxiosError } from "axios";
import type { SessionItem, AttendanceStatus } from "../../types/schedule.types";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  LogIn,
  BookOpen,
  CheckCircle2,
  Hourglass,
  CalendarDays,
} from "lucide-react";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { EmptyState } from "../../components/ui/EmptyState";

interface CourseData {
  _id?: string;
  id?: string;
  courseName?: string;
  name?: string;
}

interface TeacherData {
  fullName?: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
}

interface CalendarRawItem {
  _id?: string;
  id?: string;
  calendarId?: string;
  courseId?: string | CourseData;
  date?: string | Date;
  day?: string | Date;
  startDate?: string | Date;
  sessionId?: {
    startTime?: string;
    endTime?: string;
  };
  session?: {
    startTime?: string;
    endTime?: string;
  };
  startTime?: string;
  endTime?: string;
  slotNumber?: number;
  slot?: number;
  teacherId?: string | TeacherData;
  teacher?: string;
  teacherName?: string;
  instructor?: {
    name?: string;
  };
}

interface AttendanceRawRecord {
  _id?: string;
  calendarId?: string | { _id?: string; id?: string };
  status?: string;
}

interface ProfileResponse {
  data?: {
    _id?: string;
    id?: string;
    userId?: string;
    user?: { _id?: string };
  };
  _id?: string;
  id?: string;
  userId?: string;
  user?: { _id?: string };
}

const toYMD = (d: Date | string): string => {
  const dt = typeof d === "string" ? new Date(d) : d;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getMonday = (d = new Date()): Date => {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const inferSlotNumber = (slot: unknown, startTime?: string | null): number => {
  if (typeof slot === "number" && Number.isFinite(slot) && slot >= 1 && slot <= 5) {
    return slot;
  }
  if (startTime) {
    const h = Number(String(startTime).split(":")[0]);
    if (!Number.isNaN(h) && h < 12) return 1;
    return 4;
  }
  return 1;
};

const normalizeDateYMD = (anyDate: unknown): string => {
  if (!anyDate) {
    return toYMD(new Date());
  }
  const dateStr = String(anyDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return toYMD(new Date());
  }
  return toYMD(d);
};

const courseCache = new Map<string, string>();

const fetchCourseName = async (courseId: string): Promise<string> => {
  if (courseCache.has(courseId)) {
    return courseCache.get(courseId)!;
  }
  try {
    const res = await axiosInstance.get(`/courses/${courseId}`);
    const name = res.data?.courseName || res.data?.name || res.data?.data?.courseName || "Unknown";
    courseCache.set(courseId, name);
    return name;
  } catch {
    return "Unknown";
  }
};

const fetchAllCourses = async (): Promise<Map<string, string>> => {
  try {
    const res = await axiosInstance.get(`/courses`);
    const courses = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : [];

    const map = new Map<string, string>();
    courses.forEach((course: CourseData) => {
      const id = course._id || course.id;
      const name = course.courseName || course.name || "Unknown";
      if (id) {
        map.set(id, name);
        courseCache.set(id, name);
      }
    });
    return map;
  } catch {
    return new Map();
  }
};

const extractTeacherName = (teacherData: unknown): string => {
  if (!teacherData) return "Giáo viên chưa xác định";
  if (typeof teacherData === "string") return "Giáo viên chưa xác định";
  if (typeof teacherData === "object") {
    const teacher = teacherData as TeacherData;
    const candidates = [teacher.fullName, teacher.name, teacher.displayName, teacher.username];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "string" && candidate.trim() && !candidate.includes("@")) {
        return candidate.trim();
      }
    }
    if (teacher.email && typeof teacher.email === "string") {
      const emailParts = teacher.email.split("@");
      if (emailParts[0]) return emailParts[0].trim();
    }
  }
  return "Giáo viên chưa xác định";
};

const fetchMyAttendance = async (): Promise<Map<string, AttendanceStatus>> => {
  try {
    const profileRes = await axiosInstance.get<ProfileResponse>(`/profile`);
    const data = profileRes.data?.data || profileRes.data;
    const userId = data?._id || data?.id || data?.userId || data?.user?._id;
    if (!userId) {
      return new Map();
    }

    const attendanceRes = await axiosInstance.get(`/attendances/student/${userId}`);
    const attendanceData = attendanceRes.data?.data || attendanceRes.data || [];
    const attendanceMap = new Map<string, AttendanceStatus>();

    if (!Array.isArray(attendanceData)) return new Map();

    attendanceData.forEach((record: AttendanceRawRecord) => {
      let calendarId: string | null = null;
      if (record.calendarId) {
        if (typeof record.calendarId === "string") {
          calendarId = record.calendarId;
        } else if (typeof record.calendarId === "object" && record.calendarId !== null) {
          calendarId = record.calendarId._id || record.calendarId.id || null;
        }
      }
      const rawStatus = record.status || "not_yet";
      const statusLower = String(rawStatus).toLowerCase().trim();
      let status: AttendanceStatus = "not_yet";
      if (statusLower === "present" || statusLower === "attended") {
        status = "present";
      } else if (statusLower === "absent" || statusLower === "missing") {
        status = "absent";
      }
      if (calendarId) {
        attendanceMap.set(String(calendarId), status);
      }
    });
    return attendanceMap;
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    return new Map();
  }
};

const StudentSchedulePage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday());
  const [items, setItems] = useState<SessionItem[]>([]);
  const [sessionsList, setSessionsList] = useState<{ _id: string; sessionName: string; startTime: string; endTime: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const loadSchedule = async () => {
    setLoading(true);
    setAuthRequired(false);
    try {
      try {
        const sessionsRes = await axiosInstance.get(`/sessions`);
        const sessionsData = Array.isArray(sessionsRes.data?.data) ? sessionsRes.data.data : [];
        setSessionsList(sessionsData);
      } catch (sessErr) {
        console.error("Failed to load sessions:", sessErr);
      }

      const attendanceMap = await fetchMyAttendance();
      const res = await axiosInstance.get(`/calendars`);
      const raw: CalendarRawItem[] = Array.isArray(res?.data?.data) ? res.data.data : [];

      const courseIds = [
        ...new Set(
          raw
            .map((it) => {
              if (typeof it.courseId === "object" && it.courseId !== null) {
                return (it.courseId as CourseData)._id || (it.courseId as CourseData).id;
              }
              return it.courseId;
            })
            .filter(Boolean)
        ),
      ] as string[];

      let courseMap = new Map<string, string>();
      if (courseIds.length > 0) {
        courseMap = await fetchAllCourses();
      }

      const mapped: SessionItem[] = await Promise.all(
        raw.map(async (it) => {
          const date = normalizeDateYMD(it.date ?? it.day ?? it.startDate);
          const sessionObj = it.sessionId ?? it.session ?? null;
          const startTime = sessionObj?.startTime ?? it.startTime ?? "00:00";
          const endTime = sessionObj?.endTime ?? it.endTime ?? "00:00";
          const slotNumber = inferSlotNumber(it.slotNumber ?? it.slot ?? null, startTime);

          let courseName = "Khóa học không xác định";
          let courseId: string | number | null = null;

          if (it.courseId) {
            if (typeof it.courseId === "object" && it.courseId !== null) {
              const courseObj = it.courseId as CourseData;
              courseId = courseObj._id || courseObj.id || null;
              courseName = courseObj.courseName || courseObj.name || "Chưa xác định";

              if (courseName === "Chưa xác định" && courseId) {
                const cachedName = courseMap.get(String(courseId)) || (await fetchCourseName(String(courseId)));
                if (cachedName !== "Chưa xác định") courseName = cachedName;
              }
            } else if (typeof it.courseId === "string") {
              courseId = it.courseId;
              const cachedName = courseMap.get(courseId) || (await fetchCourseName(courseId));
              if (cachedName !== "Chưa xác định") courseName = cachedName;
            }
          }

          const calendarId = String(it._id || it.id || it.calendarId || "");
          let attendanceStatus: AttendanceStatus = "not_yet";
          if (calendarId) {
            const mappedStatus = attendanceMap.get(calendarId);
            if (mappedStatus) attendanceStatus = mappedStatus;
          }

          const attendance = {
            status: attendanceStatus,
            state: attendanceStatus,
            s: attendanceStatus,
          };

          let teacher = "Giáo viên chưa xác định";
          if (it.teacherId && typeof it.teacherId === "object") {
            teacher = extractTeacherName(it.teacherId);
          }
          if (teacher === "Giáo viên chưa xác định" || teacher.startsWith("Teacher ")) {
            const alt = it.teacher || it.teacherName || it.instructor?.name;
            if (alt && typeof alt === "string" && !alt.includes("@")) {
              teacher = alt.trim();
            } else if (alt && typeof alt === "object") {
              teacher = extractTeacherName(alt);
            }
          }

          const sObj = sessionObj && typeof sessionObj === "object" ? (sessionObj as Record<string, unknown>) : null;
          const sessionName = (sObj?.sessionName as string | undefined) ?? `Slot ${slotNumber}`;

          return {
            calendarId,
            courseId,
            courseName,
            slotNumber,
            date,
            startTime: String(startTime).trim(),
            endTime: String(endTime).trim(),
            teacher,
            attendance,
            sessionName,
          };
        })
      );

      const sorted = mapped.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return (a.slotNumber ?? 0) - (b.slotNumber ?? 0);
      });
      setItems(sorted);
    } catch (err) {
      const e = err as AxiosError;
      console.error("Error loading schedule:", e);
      if (e.response?.status === 401) {
        setAuthRequired(true);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, []);

  const handleDatePick = (value: string) => {
    if (!value) return;
    const picked = new Date(value + "T00:00:00");
    setWeekStart(getMonday(picked));
  };

  const goPrevWeek = () =>
    setWeekStart((s) => {
      const prev = new Date(s);
      prev.setDate(s.getDate() - 7);
      return getMonday(prev);
    });

  const goCurrentWeek = () => setWeekStart(getMonday(new Date()));

  const goNextWeek = () =>
    setWeekStart((s) => {
      const next = new Date(s);
      next.setDate(s.getDate() + 7);
      return getMonday(next);
    });

  const weekStartString = dayjs(weekStart).format("DD/MM/YYYY");
  const weekEndString = dayjs(weekStart).add(6, "day").format("DD/MM/YYYY");

  const weekStats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const sessionsThisWeek = items.filter(
      (it) => it.date >= dayjs(weekStart).format("YYYY-MM-DD") && it.date <= dayjs(weekStart).add(6, "day").format("YYYY-MM-DD")
    ).length;
    const todaySessions = items.filter((it) => it.date === today).length;
    const attended = items.filter((it) => it.attendance?.status === "present").length;
    const attendanceRate = items.length > 0 ? Math.round((attended / items.length) * 100) : 0;
    return { sessionsThisWeek, todaySessions, attendanceRate, totalSessions: items.length };
  }, [items, weekStart]);

  return (
    <PageLayout
      title=""
      subtitle=""
    >
      {authRequired && (
        <BaseCard className="border-l-4 border-amber-500 bg-amber-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-amber-800">Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.</h4>
            <p className="text-xs text-text-secondary">Vui lòng đăng nhập lại để xem thời khóa biểu cá nhân của bạn.</p>
          </div>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
          >
            <LogIn size={14} />
            Đăng nhập
          </button>
        </BaseCard>
      )}

      {loading ? (
        <BaseCard className="flex items-center justify-center min-h-[420px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-color border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-text-secondary font-bold">Đang tải lịch học...</span>
          </div>
        </BaseCard>
      ) : (
        <div className="space-y-6">
          <BaseCard className="!p-4 relative">
            {/* Header bar: Week navigation on left + inline stat chips filling to the right edge */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 w-full">
              {/* Left: Week navigation controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={goCurrentWeek}
                  className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary-color text-text-main hover:text-primary-color transition text-xs font-bold shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
                >
                  Hôm nay
                </button>
                <button
                  onClick={goPrevWeek}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary-color text-text-main hover:text-primary-color transition shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="relative">
                  <div className="h-9 px-4 rounded-full bg-primary-color hover:bg-primary-color/90 text-white cursor-pointer select-none whitespace-nowrap text-xs font-bold shadow-xs flex items-center gap-2 transition shrink-0">
                    <Calendar size={14} className="text-white/90 shrink-0" />
                    <span>{weekStartString} – {weekEndString}</span>
                  </div>
                  <input
                    type="date"
                    value={dayjs(weekStart).format("YYYY-MM-DD")}
                    onChange={(e) => handleDatePick(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                </div>
                <button
                  onClick={goNextWeek}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary-color text-text-main hover:text-primary-color transition shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Right: Stat badges spanning nicely to the right edge */}
              <div className="flex items-center gap-2 flex-wrap justify-start xl:justify-end flex-1">
                <div className="h-9 px-3.5 rounded-full bg-red-50/80 border border-red-200/70 text-xs flex items-center gap-2 shrink-0">
                  <CalendarDays size={15} className="text-red-500 shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Tuần này:</span>
                  <span className="font-bold text-red-700 text-xs">{weekStats.sessionsThisWeek} ca</span>
                </div>
                <div className="h-9 px-3.5 rounded-full bg-blue-50/80 border border-blue-200/70 text-xs flex items-center gap-2 shrink-0">
                  <BookOpen size={15} className="text-blue-500 shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Hôm nay:</span>
                  <span className="font-bold text-blue-700 text-xs">{weekStats.todaySessions} ca</span>
                </div>
                <div className="h-9 px-3.5 rounded-full bg-emerald-50/80 border border-emerald-200/70 text-xs flex items-center gap-2 shrink-0">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Chuyên cần:</span>
                  <span className="font-bold text-emerald-700 text-xs">{weekStats.attendanceRate}%</span>
                </div>
                <div className="h-9 px-3.5 rounded-full bg-amber-50/80 border border-amber-200/70 text-xs flex items-center gap-2 shrink-0">
                  <Hourglass size={15} className="text-amber-500 shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Tổng ca:</span>
                  <span className="font-bold text-amber-700 text-xs">{weekStats.totalSessions}</span>
                </div>
              </div>
            </div>

            <ScheduleGrid items={items} weekStart={toYMD(weekStart)} sessionsList={sessionsList} />
            {items.length === 0 && (
              <div className="absolute inset-0 bg-surface-base/95 flex items-center justify-center rounded-2xl z-10 p-6">
                <EmptyState title="Không có lịch học" description="Bạn không có bất kỳ ca học nào được xếp lịch trong tuần này." icon={Calendar} />
              </div>
            )}
          </BaseCard>

          {/* Guidelines info card */}
          <BaseCard className="bg-bg-base/50 border border-border-color">
            <div className="flex items-center gap-2 mb-3">
              <Info className="text-primary-color" size={16} />
              <h4 className="text-sm font-bold text-text-main m-0">Chú thích điểm danh</h4>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-text-secondary pl-0 list-none">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                <span>
                  <strong className="text-emerald-600 font-extrabold uppercase">CÓ MẶT</strong>: Bạn đã tham gia đầy đủ và được giáo viên điểm danh.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0"></span>
                <span>
                  <strong className="text-red-600 font-extrabold uppercase">VẮNG MẶT</strong>: Bạn đã vắng mặt hoặc không tham gia học ca này.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0"></span>
                <span>
                  <strong className="text-text-secondary font-extrabold uppercase">CHƯA HỌC</strong>: Ca học chưa bắt đầu hoặc giáo viên chưa ghi nhận điểm danh. Nếu đã quá 24 giờ mà chưa điểm danh, hệ thống tự động tính là <strong className="text-red-600">Vắng mặt</strong>.
                </span>
              </li>
            </ul>
          </BaseCard>
        </div>
      )}
    </PageLayout>
  );
};

export default StudentSchedulePage;
