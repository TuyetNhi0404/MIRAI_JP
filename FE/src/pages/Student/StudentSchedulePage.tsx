import React, { useEffect, useState } from "react";
import ScheduleGrid from "../../components/scheduleStudent/ScheduleGrid";
import dayjs from "dayjs";
import axiosInstance from "../../api/axiosInstance";
import { AxiosError } from "axios";
import type { SessionItem, AttendanceStatus } from "../../types/schedule.types";
import { ChevronLeft, ChevronRight, Calendar, Info, LogIn } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const loadSchedule = async () => {
    setLoading(true);
    setAuthRequired(false);
    try {
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

  const goNextWeek = () =>
    setWeekStart((s) => {
      const next = new Date(s);
      next.setDate(s.getDate() + 7);
      return getMonday(next);
    });

  const weekStartString = dayjs(weekStart).format("DD/MM/YYYY");
  const weekEndString = dayjs(weekStart).add(6, "day").format("DD/MM/YYYY");

  return (
    <PageLayout
      title="Lịch học của tôi"
      subtitle="Xem và theo dõi lịch học, lịch chuyên cần của bạn theo từng tuần"
      extra={
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevWeek}
            className="p-2 border border-border-color rounded-xl bg-surface-base hover:bg-accent-color hover:border-primary-color text-text-main hover:text-primary-color transition active:scale-95 shrink-0"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="relative shrink-0">
            <div className="!flex !flex-row !flex-nowrap !items-center gap-2 border border-transparent rounded-xl px-4 py-1.5 bg-primary-color hover:bg-primary-color-hover text-white cursor-pointer transition whitespace-nowrap shadow-sm">
              <Calendar size={16} className="text-white/90 shrink-0" />
              <span className="text-sm font-bold text-white select-none">
                {weekStartString} – {weekEndString}
              </span>
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
            className="p-2 border border-border-color rounded-xl bg-surface-base hover:bg-accent-color hover:border-primary-color text-text-main hover:text-primary-color transition active:scale-95 shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      }
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
            <ScheduleGrid items={items} weekStart={toYMD(weekStart)} />
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
                  <strong className="text-text-secondary font-extrabold uppercase">CHƯA HỌC</strong>: Ca học chưa bắt đầu hoặc giáo viên chưa ghi nhận điểm danh.
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
