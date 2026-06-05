import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ScheduleGrid from "../../components/scheduleStudent/ScheduleGrid";
import dayjs from "dayjs";
import axios, { AxiosError } from "axios";
import type { SessionItem, AttendanceStatus } from "../../types/schedule.types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const PRIMARY_ORANGE = "#FF5722";
const LIGHT_ORANGE = "#B90000";

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
    console.warn("[normalize] No date provided");
    return toYMD(new Date());
  }
  
  const dateStr = String(anyDate);
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.warn("[normalize] Invalid date:", anyDate);
    return toYMD(new Date());
  }
  
  return toYMD(d);
};

const rawBase = import.meta.env.VITE_API_BASE_URL || "";
const BASE = rawBase ? rawBase.replace(/\/$/, "") : "http://localhost:5000/api";

const courseCache = new Map<string, string>();

const fetchCourseName = async (courseId: string): Promise<string> => {
  if (courseCache.has(courseId)) {
    return courseCache.get(courseId)!;
  }

  try {
    const res = await axios.get(`${BASE}/courses/${courseId}`, {
      withCredentials: true,
    });
    const name = res.data?.courseName || res.data?.name || res.data?.data?.courseName || "Unknown";
    courseCache.set(courseId, name);
    return name;
  } catch {
    return "Unknown";
  }
};

const fetchAllCourses = async (): Promise<Map<string, string>> => {
  try {
    const res = await axios.get(`${BASE}/courses`, {
      withCredentials: true,
    });
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
    const candidates = [
      teacher.fullName,
      teacher.name,
      teacher.displayName,
      teacher.username,
    ];
    
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
    const profileRes = await axios.get<ProfileResponse>(`${BASE}/profile`, { 
      withCredentials: true 
    });
    
    const data = profileRes.data?.data || profileRes.data;
    const userId = data?._id || data?.id || data?.userId || data?.user?._id;
    
    if (!userId) {
      console.warn("⚠️ Cannot get userId from profile for attendance");
      return new Map();
    }

    console.log(`👤 Fetching attendance for userId: ${userId}`);

    const attendanceRes = await axios.get(`${BASE}/attendances/student/${userId}`, { 
      withCredentials: true 
    });
    
    const attendanceData = attendanceRes.data?.data || attendanceRes.data || [];
    const attendanceMap = new Map<string, AttendanceStatus>();
    
    if (!Array.isArray(attendanceData)) {
      console.warn("⚠️ Attendance data is not an array:", attendanceData);
      return new Map();
    }

    attendanceData.forEach((record: AttendanceRawRecord, index: number) => {
      console.log(`\n[Attendance ${index + 1}] Processing:`, record);
      
      let calendarId: string | null = null;
      
      if (record.calendarId) {
        if (typeof record.calendarId === 'string') {
          calendarId = record.calendarId;
        } else if (typeof record.calendarId === 'object' && record.calendarId !== null) {
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
      
      if (calendarId && typeof calendarId === 'string') {
        attendanceMap.set(String(calendarId), status);
        console.log(`  ✓ [Attendance ${index + 1}] Mapped: calendarId=${calendarId}, status=${status}`);
      } else {
        console.warn(`  ⊗ [Attendance ${index + 1}] Invalid - missing calendarId:`, {
          recordId: record._id,
          calendarId: record.calendarId,
          calendarIdType: typeof record.calendarId,
          status: record.status
        });
      }
    });
    
    return attendanceMap;
  } catch (error) {
    const err = error as AxiosError;
    console.error(" Failed to fetch attendance:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    return new Map();
  }
};

const StudentSchedulePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday());
  const [items, setItems] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const loadSchedule = async () => {
    setLoading(true);
    setAuthRequired(false);

    try {
      
      const attendanceMap = await fetchMyAttendance();
      const res = await axios.get(`${BASE}/calendars`, {
        withCredentials: true,
      });

      const raw: CalendarRawItem[] = Array.isArray(res?.data?.data) ? res.data.data : [];
      console.log(` Received ${raw.length} calendar items`);

      console.log("\n Step 3: Fetching courses...");
      const courseIds = [...new Set(
        raw
          .map((it) => {
            if (typeof it.courseId === 'object' && it.courseId !== null) {
              return (it.courseId as CourseData)._id || (it.courseId as CourseData).id;
            }
            return it.courseId;
          })
          .filter(Boolean)
      )] as string[];

      let courseMap = new Map<string, string>();
      if (courseIds.length > 0) {
        courseMap = await fetchAllCourses();
      }

      const mapped: SessionItem[] = await Promise.all(
        raw.map(async (it, idx) => {
          console.log(`\n[Calendar ${idx + 1}/${raw.length}] Processing:`, {
            _id: it._id,
            date: it.date,
            courseId: it.courseId
          });

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
                const cachedName = courseMap.get(String(courseId)) || await fetchCourseName(String(courseId));
                if (cachedName !== "Chưa xác định") courseName = cachedName;
              }
            } else if (typeof it.courseId === "string") {
              courseId = it.courseId;
              const cachedName = courseMap.get(courseId) || await fetchCourseName(courseId);
              if (cachedName !== "Chưa xác định") courseName = cachedName;
            }
          }

          const calendarId = String(it._id || it.id || it.calendarId || "");
          console.log(`  → calendarId: ${calendarId}`);
          
          let attendanceStatus: AttendanceStatus = "not_yet";
          if (calendarId) {
            const mappedStatus = attendanceMap.get(calendarId);
            if (mappedStatus) {
              attendanceStatus = mappedStatus;
            } else {
              console.log(`   No attendance found, using default: not_yet`);
            }
          }

          const attendance = {
            status: attendanceStatus,
            state: attendanceStatus,
            s: attendanceStatus,
          };

          let teacher: string = "Giáo viên chưa xác định";
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

          const sessionItem: SessionItem = {
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

          console.log(`   Mapped session:`, {
            calendarId,
            courseName,
            date,
            slot: slotNumber,
            attendance: attendanceStatus
          });

          return sessionItem;
        })
      );

      const sorted = mapped.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return (a.slotNumber ?? 0) - (b.slotNumber ?? 0);
      });

      console.log(`\n✅ Total mapped sessions: ${sorted.length}`);
      console.table(sorted.map(s => ({
        date: s.date,
        course: s.courseName,
        slot: s.slotNumber,
        attendance: s.attendance?.status
      })));
      
      setItems(sorted);

    } catch (err) {
      const e = err as AxiosError;
      console.error(" Error loading schedule:", {
        status: e.response?.status,
        message: e.message,
        data: e.response?.data
      });
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
    <Box
      p={{ xs: 2, md: 4 }}
      sx={{
        backgroundColor: "#fafafa",
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily: "Inter, Roboto, sans-serif",
      }}
    >
      <Box maxWidth="1400px" mx="auto">
        <Box display="flex" alignItems="center" mb={{ xs: 2, sm: 3 }}>
          <Typography
            variant={isMobile ? "h6" : "h4"}
            sx={{
              fontWeight: 800,
              color: "#222",
              letterSpacing: "0.5px",
              fontSize: { xs: "1.1rem", sm: "2.125rem" },
              whiteSpace: "nowrap",
            }}
          >
            LỊCH HỌC CỦA TÔI
          </Typography>
        </Box>

        {authRequired && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: "#fff3e0",
              border: "1px solid #ffe0b2",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Vui lòng đăng nhập để xem lịch học của bạn.
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                onClick={() => {
                  window.location.href = "/login";
                }}
                sx={{ backgroundColor: PRIMARY_ORANGE }}
              >
                Đăng nhập
              </Button>
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body1"
            sx={{ color: "#555", mb: 1, fontWeight: 500, fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Chọn tuần:
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1.5 }}
            flexWrap="nowrap"
            sx={{
              overflowX: "auto",
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              onClick={goPrevWeek}
              sx={{
                borderColor: "#ccc",
                color: "#444",
                minWidth: { xs: "36px", sm: "auto" },
                px: { xs: 1, sm: 2 },
                "&:hover": { borderColor: "#999", backgroundColor: "#f5f5f5" },
              }}
            >
              <ChevronLeft size={isMobile ? 18 : 20} />
            </Button>

            <Box
              onClick={() => {
                const input = document.querySelector('input[type="date"]') as HTMLInputElement;
                input?.showPicker?.();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, sm: 1 },
                border: "1px solid #ccc",
                borderRadius: 1,
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                backgroundColor: "#fff",
                cursor: "pointer",
                flexShrink: 0,
                "&:hover": { borderColor: "#999" },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#222",
                  fontWeight: 500,
                  fontSize: { xs: "0.8rem", sm: "1rem" },
                  whiteSpace: "nowrap",
                }}
              >
                {weekStartString} – {weekEndString}
              </Typography>
              <TextField
                type="date"
                size="small"
                value={dayjs(weekStart).format("YYYY-MM-DD")}
                onChange={(e) => handleDatePick(e.target.value)}
                sx={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
              />
            </Box>

            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              onClick={goNextWeek}
              sx={{
                borderColor: "#ccc",
                color: "#444",
                minWidth: { xs: "36px", sm: "auto" },
                px: { xs: 1, sm: 2 },
                "&:hover": { borderColor: "#999", backgroundColor: "#f5f5f5" },
              }}
            >
              <ChevronRight size={isMobile ? 18 : 20} />
            </Button>
          </Stack>
        </Box>

        {loading ? (
          <Box
            sx={{
              minHeight: 420,
              backgroundColor: "#fff",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="center" gap={2} p={{ xs: 3, sm: 6 }}>
              <CircularProgress sx={{ color: PRIMARY_ORANGE }} size={isMobile ? 30 : 40} />
              <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary">
                Đang tải lịch học...
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              minHeight: 420,
              backgroundColor: "#fff",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              p: 0,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <ScheduleGrid items={items} weekStart={toYMD(weekStart)} slotColor={LIGHT_ORANGE} />
            
            {items.length === 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  padding: { xs: 3, sm: 4 },
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 10,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Chưa có lịch học
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ mt: 3, px: { xs: 2, sm: 0 } }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Chú thích điểm danh:
          </Typography>
          <Box
            component="ul"
            sx={{
              listStyle: "disc",
              paddingLeft: { xs: 3, sm: 4 },
              margin: 0,
              "& li": { marginBottom: 1, paddingLeft: 0.5 },
            }}
          >
            <li>
              <Typography variant="body2" sx={{ color: "#333", lineHeight: 1.6, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                <strong style={{ color: "#4caf50" }}>(CÓ MẶT)</strong>: Bạn đã tham gia lớp học.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ color: "#333", lineHeight: 1.6, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                <strong style={{ color: "#f44336" }}>(VẮNG MẶT)</strong>: Bạn đã vắng mặt trong lớp học.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ color: "#333", lineHeight: 1.6, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                <strong style={{ color: "#757575" }}>(CHƯA HỌC)</strong>: Điểm danh chưa được ghi nhận.
              </Typography>
            </li>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default StudentSchedulePage;
