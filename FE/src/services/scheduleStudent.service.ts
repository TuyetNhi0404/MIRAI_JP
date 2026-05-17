import type { SessionItem } from "../types/schedule.types";
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 10000, withCredentials: true });

interface CourseData {
  _id?: string;
  id?: string;
  courseName?: string;
  name?: string;
  title?: string;
  courseId?: string;
  data?: {
    courseName?: string;
  };
}

interface UserData {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

interface TeacherData extends UserData {
  teacherName?: string;
  instructorName?: string;
}

interface CourseMember {
  courseId?: string | CourseData;
}

interface ProfileData extends UserData {
  courses?: CourseData[];
  enrolledCourses?: CourseData[];
  myCourses?: CourseData[];
  enrollments?: Array<{
    course?: CourseData | string;
    courseId?: CourseData | string;
    courseData?: CourseData;
  }>;
  courseIds?: string[];
}

interface AttendanceRecord {
  calendarId?: string | { _id?: string };
  status?: string;
}

interface SessionData {
  startTime?: string;
  endTime?: string;
}

interface RoomData {
  roomName?: string;
}

interface CalendarItem {
  _id?: string;
  calendarId?: string;
  courseId?: string | CourseData;
  courseName?: string;
  course?: CourseData;
  sessionId?: SessionData;
  session?: SessionData;
  startTime?: string;
  endTime?: string;
  teacherId?: string | TeacherData;
  teacher?: string;
  teacherName?: string;
  date?: string | Date;
  startDate?: string | Date;
  day?: string | Date;
  slotNumber?: number;
  room?: string | RoomData;
  roomName?: string;
}

interface UpdateAttendancePayload {
  status: "present" | "absent";
}

// ============= UTILS =============
export const toYMD = (d: Date | string | number): string => {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const buildAuthHeaders = (): Record<string, string> => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token");
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (e) {
    console.error("[schedule.service] Lỗi khi đọc token:", e);
  }
  return {};
};

function handleError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    console.groupCollapsed("[schedule.service] API Error");
    console.error("message:", err.message);
    console.error("url:", err.config?.url);
    console.error("method:", err.config?.method);
    if (err.response) {
      console.error("status:", err.response.status);
      console.error("response:", err.response.data);
    }
    console.groupEnd();
  } else {
    console.error("[schedule.service] Unknown error:", err);
  }
  throw err;
}

const courseCache = new Map<string, string>();
const teacherCache = new Map<string, string>();

export const getCourseById = async (courseId: string): Promise<string> => {
  if (courseCache.has(courseId)) return courseCache.get(courseId)!;

  try {
    const res = await api.get<CourseData>(`/courses/${courseId}`, { 
      headers: buildAuthHeaders() 
    });
    const data = res.data as CourseData;
    const courseName = data?.courseName || 
                       data?.name || 
                       "Unknown";
    courseCache.set(courseId, courseName);
    return courseName;
  } catch (err) {
    console.warn(`Failed to fetch course ${courseId}:`, err);
    return "Unknown";
  }
};

export const getAllCourses = async (): Promise<Map<string, string>> => {
  try {
    const res = await api.get<CourseData[] | { data: CourseData[] }>("/courses", { 
      headers: buildAuthHeaders() 
    });
    
    let courses: CourseData[] = [];
    if (Array.isArray(res.data)) {
      courses = res.data;
    } else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray(res.data.data)) {
      courses = res.data.data;
    }
    
    const map = new Map<string, string>();
    courses.forEach((course) => {
      const id = course._id || course.id;
      const name = course.courseName || course.name || "Unknown";
      if (id) {
        map.set(id, name);
        courseCache.set(id, name);
      }
    });
    return map;
  } catch (err) {
    console.warn("Failed to fetch all courses:", err);
    return new Map();
  }
};

// ============= TEACHERS =============
export const getTeacherById = async (teacherId: string): Promise<string> => {
  if (teacherCache.has(teacherId)) return teacherCache.get(teacherId)!;

  try {
    const res = await api.get<UserData | { data: UserData }>(`/users/${teacherId}`, { 
      headers: buildAuthHeaders() 
    });
    
    let userData: UserData;
    if ('data' in res.data && res.data.data) {
      userData = res.data.data;
    } else {
      userData = res.data as UserData;
    }

    const name = 
      userData?.fullName ||
      userData?.name ||
      userData?.displayName ||
      (userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}`.trim() 
        : null) ||
      userData?.username ||
      "Unknown Teacher";
    
    teacherCache.set(teacherId, name);
    return name;
  } catch (err) {
    console.warn(`Failed to fetch teacher ${teacherId}:`, err);
    return "Unknown Teacher";
  }
};

const extractTeacherName = (teacherObj: unknown): string | null => {
  if (!teacherObj || typeof teacherObj !== "object") return null;
  
  const teacher = teacherObj as TeacherData;
  
  if (teacher.fullName) return teacher.fullName.trim();

  const fields: Array<keyof TeacherData> = [
    "name", 
    "displayName", 
    "teacherName", 
    "instructorName"
  ];
  
  for (const f of fields) {
    const v = teacher[f];
    if (typeof v === "string" && v.trim() && !v.includes("@")) {
      return v.trim();
    }
  }

  if (teacher.firstName && teacher.lastName) {
    return `${teacher.firstName} ${teacher.lastName}`.trim();
  }
  
  if (teacher.username && !teacher.username.includes("@")) {
    return teacher.username.trim();
  }

  return null;
};

export const getMyCourseSet = async (): Promise<{ 
  ids: Set<string>; 
  names: Set<string> 
}> => {
  try {
    const profileRes = await api.get<{ data?: ProfileData } | ProfileData>("/profile", { 
      headers: buildAuthHeaders() 
    });
    
    const profile: ProfileData = 'data' in profileRes.data && profileRes.data.data 
      ? profileRes.data.data 
      : (profileRes.data as ProfileData);
    
    const userId = profile._id || profile.id;
    if (!userId) return { ids: new Set(), names: new Set() };

    try {
      const memberRes = await api.get<CourseMember[] | { data: CourseMember[] }>("/course-members/my-courses", { 
        headers: buildAuthHeaders(),
        params: { userId, role: "student" }
      });
      
      let members: CourseMember[] = [];
      if (Array.isArray(memberRes.data)) {
        members = memberRes.data;
      } else if (memberRes.data && 'data' in memberRes.data && Array.isArray(memberRes.data.data)) {
        members = memberRes.data.data;
      }
      
      const ids = new Set<string>();
      const names = new Set<string>();
      
      members.forEach((member) => {
        const courseData = typeof member.courseId === 'object' 
          ? member.courseId as CourseData
          : null;
        const courseId = courseData?._id || member.courseId;
        const courseName = courseData?.courseName || courseData?.name;
        
        if (courseId) ids.add(String(courseId));
        if (courseName) names.add(String(courseName));
      });
      return { ids, names };
    } catch {
      const ids = new Set<string>();
      const names = new Set<string>();
      
      const addCourse = (c: CourseData) => {
        const id = c._id || c.id || c.courseId;
        const name = c.courseName || c.name || c.title;
        if (id) ids.add(String(id));
        if (name) names.add(String(name));
      };
      
      const courseFields = ["courses", "enrolledCourses", "myCourses"] as const;
      
      courseFields.forEach(field => {
        const fieldValue = profile[field];
        if (Array.isArray(fieldValue)) {
          fieldValue.forEach(addCourse);
        }
      });
      
      if (Array.isArray(profile?.enrollments)) {
        profile.enrollments.forEach((e) => {
          const c = e.course || e.courseId || e.courseData;
          if (typeof c === "object" && c !== null) {
            addCourse(c as CourseData);
          } else if (typeof c === "string") {
            ids.add(c);
          }
        });
      }
      
      if (Array.isArray(profile?.courseIds)) {
        profile.courseIds.forEach((id) => ids.add(String(id)));
      }
      
      return { ids, names };
    }
  } catch (err) {
    console.warn("Could not fetch /profile:", err);
    return { ids: new Set(), names: new Set() };
  }
};

const fetchMyAttendance = async (studentId?: string): Promise<Map<string, string>> => {
  try {
    let userId = studentId;
    if (!userId) {
      const profileRes = await api.get<UserData | { data: UserData }>("/profile", { 
        headers: buildAuthHeaders() 
      });
      
      if ('data' in profileRes.data && profileRes.data.data) {
        userId = profileRes.data.data._id;
      } else {
        userId = (profileRes.data as UserData)._id;
      }
    }
    if (!userId) return new Map();

    const attendanceRes = await api.get<AttendanceRecord[] | { data: AttendanceRecord[] }>(
      `/attendances/student/${userId}`, 
      { headers: buildAuthHeaders() }
    );
    
    let attendanceData: AttendanceRecord[] = [];
    if (Array.isArray(attendanceRes.data)) {
      attendanceData = attendanceRes.data;
    } else if (attendanceRes.data && 'data' in attendanceRes.data && Array.isArray(attendanceRes.data.data)) {
      attendanceData = attendanceRes.data.data;
    }
    
    const attendanceMap = new Map<string, string>();
    
    attendanceData.forEach((record) => {
      const calendarIdObj = record.calendarId;
      const calendarId = typeof calendarIdObj === 'object' 
        ? calendarIdObj?._id 
        : calendarIdObj;
      const status = record.status || "not_yet";
      if (calendarId) {
        attendanceMap.set(String(calendarId), status);
      }
    });
    
    return attendanceMap;
  } catch (err) {
    console.warn("⚠️ Failed to fetch attendance:", err);
    return new Map();
  }
};

export const getCalendarsByStudent = async (
  studentId?: string
): Promise<{ weekStart: string; weekEnd: string; items: SessionItem[] }> => {
  try {
    let userId = studentId;
    if (!userId) {
      const profileRes = await api.get<{ data?: ProfileData } | ProfileData>("/profile", { 
        headers: buildAuthHeaders() 
      });
      
      const profile: ProfileData = 'data' in profileRes.data && profileRes.data.data 
        ? profileRes.data.data 
        : (profileRes.data as ProfileData);
      
      userId = profile._id || profile.id;
      if (!userId) return { weekStart: "", weekEnd: "", items: [] };
    }

    const memberRes = await api.get<CourseMember[] | { data: CourseMember[] }>("/course-members/my-courses", { 
      headers: buildAuthHeaders(),
      params: { userId, role: "student" }
    });
    
    let myCourses: CourseMember[] = [];
    if (Array.isArray(memberRes.data)) {
      myCourses = memberRes.data;
    } else if (memberRes.data && 'data' in memberRes.data && Array.isArray(memberRes.data.data)) {
      myCourses = memberRes.data.data;
    }
    
    const myCourseIds = new Set(
      myCourses.map((m) => {
        const courseData = typeof m.courseId === 'object' 
          ? m.courseId as CourseData
          : null;
        return courseData?._id || m.courseId;
      })
    );

    const attendanceMap = await fetchMyAttendance(userId);

    const res = await api.get<CalendarItem[] | { data: CalendarItem[] }>("/calendars", { 
      headers: buildAuthHeaders() 
    });
    
    let rawItems: CalendarItem[] = [];
    if (Array.isArray(res.data)) {
      rawItems = res.data;
    } else if (res.data && 'data' in res.data && Array.isArray(res.data.data)) {
      rawItems = res.data.data;
    }

    const filteredRaw = rawItems.filter(it => {
      const courseData = typeof it.courseId === 'object' 
        ? it.courseId as CourseData
        : null;
      const cid = courseData?._id || it.courseId;
      return cid && myCourseIds.has(String(cid));
    });

    const items: SessionItem[] = await Promise.all(
      filteredRaw.map(async (cal) => {
        const courseData = typeof cal.courseId === 'object' 
          ? cal.courseId as CourseData
          : null;
        const courseId = courseData?._id || cal.courseId || "";
        const courseName = courseData?.courseName || 
                          courseData?.name || 
                          cal.courseName || 
                          cal.course?.courseName || 
                          await getCourseById(String(courseId));

        const sessionObj = cal.sessionId ?? cal.session ?? null;
        const startTime = String(sessionObj?.startTime ?? cal.startTime ?? "09:00").trim();
        const endTime = String(sessionObj?.endTime ?? cal.endTime ?? "17:00").trim();

        let teacher: string | undefined = undefined;
        if (cal.teacherId) {
          if (typeof cal.teacherId === "object") {
            const teacherData = cal.teacherId as TeacherData;
            teacher = extractTeacherName(teacherData) || 
                     await getTeacherById(teacherData._id || teacherData.id || '');
          } else if (typeof cal.teacherId === "string") {
            teacher = await getTeacherById(cal.teacherId);
          }
        }
        if (!teacher) teacher = cal.teacher || cal.teacherName || "No Teacher";

        const date = toYMD(cal.date ?? cal.startDate ?? cal.day ?? new Date());
        const slotNumber = typeof cal.slotNumber === "number" 
          ? cal.slotNumber 
          : Number(startTime.split(":")[0]) < 13 ? 1 : 4;

        const calendarId = cal._id ?? cal.calendarId ?? "";
        const attendanceStatusRaw = attendanceMap.get(String(calendarId)) || "not_yet";
        
        // Normalize to AttendanceStatus type
        const attendanceStatus: "present" | "absent" | "not_yet" = 
          attendanceStatusRaw === "present" || attendanceStatusRaw === "absent" 
            ? attendanceStatusRaw 
            : "not_yet";
        
        const attendance: { status: "present" | "absent" | "not_yet"; state: "present" | "absent" | "not_yet"; s: "present" | "absent" | "not_yet" } = { 
          status: attendanceStatus, 
          state: attendanceStatus, 
          s: attendanceStatus
        };
        
        const roomData = typeof cal.room === 'object' ? cal.room as RoomData : null;
        const roomValue = roomData?.roomName ?? cal.roomName ?? (typeof cal.room === 'string' ? cal.room : "N/A");

        return { 
          calendarId: String(calendarId) as string, 
          courseId: String(courseId) as string, 
          courseName, 
          slotNumber, 
          date, 
          startTime, 
          endTime, 
          teacher, 
          attendance, 
          room: roomValue
        } as SessionItem;
      })
    );

    const dates = items.map(it => it.date).sort();
    return { 
      weekStart: dates[0] || "", 
      weekEnd: dates[dates.length - 1] || "", 
      items 
    };
  } catch (err) {
    console.error("[schedule.service] getCalendarsByStudent error:", err);
    return { weekStart: "", weekEnd: "", items: [] };
  }
};

// ============= UPDATE ATTENDANCE =============
export const updateAttendance = async (
  calendarId: number | string,
  payload: UpdateAttendancePayload
) => {
  try {
    const res = await api.post(`/calendars/${calendarId}/attendance`, payload, { 
      headers: buildAuthHeaders() 
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

const getAllCalendars = async (): Promise<unknown> => {
  console.warn("getAllCalendars is not implemented yet");
  return [];
};

export default {
  getSchedule: getAllCalendars,
  getScheduleByStudent: getCalendarsByStudent,
  updateAttendance,
  getCourseById,
  getAllCourses,
  getTeacherById,
  getMyCourseSet,
};