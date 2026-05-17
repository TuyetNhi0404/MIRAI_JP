import axios, { AxiosError } from "axios";
import type { 
  ApiResponse, 
  TeacherScheduleView, 
  Session, 
  Course,
  CourseCalendar,
  RequestSchedule
} from "../types/scheduleTeacher.types";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 
    "Content-Type": "application/json"
  },
});

interface PopulatedCourse {
  _id: string;
  name?: string;
  codeName?: string;
  courseName?: string;
}

interface PopulatedSession {
  _id: string;
  sessionName: string;
  startTime?: string;
  endTime?: string;
}

interface PopulatedTeacher {
  _id: string;
  name?: string;
  email?: string;
}

interface PopulatedRequest {
  _id: string;
  status: string;
  reason: string;
}

interface PopulatedCalendar extends Omit<CourseCalendar, 'courseId' | 'sessionId' | 'teacherId'> {
  courseId: string | PopulatedCourse;
  sessionId: string | PopulatedSession;
  teacherId: string | PopulatedTeacher;
  request?: PopulatedRequest;
}

interface ApiErrorResponse {
  message?: string;
}

interface CalendarApiResponse {
  data: PopulatedCalendar[];
}

interface SessionApiResponse {
  data: Session[];
}

interface CourseApiResponse {
  data: Course[];
  message?: string;
}

interface RequestApiResponse {
  data: RequestSchedule;
  message?: string;
}

api.interceptors.request.use(
  (config) => {
    console.log('Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !('_retry' in originalRequest)) {
      (originalRequest as typeof originalRequest & { _retry: boolean })._retry = true;
      try {
        console.log('Token expired, trying to refresh...');
        await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        console.log('Token refreshed, retrying original request');
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed, redirecting to login');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const teacherScheduleService = {
  getScheduleByWeek: async (startDate: string): Promise<ApiResponse<TeacherScheduleView[]>> => {
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const endDate = end.toISOString().split('T')[0];

      console.log("Fetching schedule for week:", { startDate, endDate });
      
      const [calendarResponse, sessionResponse] = await Promise.all([
        api.get<CalendarApiResponse>("/calendars"),
        api.get<SessionApiResponse>("/sessions")
      ]);

      const rawData = calendarResponse.data.data || [];
      const allSessions = sessionResponse.data.data || [];

      console.log("Data loaded:", {
        totalCalendars: rawData.length,
        totalSessions: allSessions.length
      });

      const sessionMap = new Map<string, Session>(
        allSessions.map((s) => [
          s._id, 
          {
            ...s,
            startTime: (s.startTime || '').trim(),
            endTime: (s.endTime || '').trim()
          }
        ])
      );

      console.log("Session map created with", sessionMap.size, "sessions");
      
      sessionMap.forEach((session) => {
        console.log(`Session: ${session.sessionName}: ${session.startTime} - ${session.endTime}`);
      });

      const filteredByWeek = rawData.filter((cal) => {
        if (!cal.date) return false;
        
        let calDateStr = '';
        if (typeof cal.date === 'string') {
          calDateStr = cal.date.split('T')[0];
        } else {
          calDateStr = new Date(cal.date).toISOString().split('T')[0];
        }
        
        const isInRange = calDateStr >= startDate && calDateStr <= endDate;
        return isInRange;
      });

      console.log(`Filtered ${filteredByWeek.length} items for week ${startDate} to ${endDate}`);

      const transformedData: TeacherScheduleView[] = filteredByWeek.map((cal) => {
        let course: PopulatedCourse | null = null;
        let session: Session | undefined = undefined;
        let teacher: PopulatedTeacher | null = null;

        if (typeof cal.courseId === 'object' && cal.courseId !== null) {
          course = cal.courseId;
        }

        let sessionId = '';
        if (typeof cal.sessionId === 'object' && cal.sessionId !== null) {
          sessionId = cal.sessionId._id;
          session = sessionMap.get(sessionId);
          if (session) {
            console.log(`Session looked up from map: ${session.sessionName}`);
          }
        } else if (typeof cal.sessionId === 'string') {
          sessionId = cal.sessionId;
          session = sessionMap.get(sessionId);
          if (session) {
            console.log(`Session found via lookup: ${session.sessionName}`);
          } else {
            console.warn(`Session NOT found for ID: ${sessionId}`);
          }
        }

        if (typeof cal.teacherId === 'object' && cal.teacherId !== null) {
          teacher = cal.teacherId;
        }

        const courseName = course?.name || course?.courseName || 'Unknown Course';
        const teacherName = teacher?.name || teacher?.email?.split('@')[0] || undefined;
        const sessionName = session?.sessionName || 'Unknown Session';

        let startTime = '08:00';
        let endTime = '10:00';

        if (session) {
          startTime = session.startTime || '08:00';
          endTime = session.endTime || '10:00';
          
          console.log(`Time for ${sessionName}: "${startTime}" - "${endTime}"`);
        } else {
          console.warn(`No session data for calendar ${cal._id}, using defaults`);
        }

        let formattedDate = '';
        if (cal.date) {
          try {
            const d = new Date(cal.date);
            const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            formattedDate = localDate.toISOString().split('T')[0];
          } catch  {
            console.error('Invalid date format:', cal.date);
            formattedDate = String(cal.date).split('T')[0];
          }
        }

        return {
          calendarId: cal._id || '',
          courseId: course?._id || (typeof cal.courseId === 'string' ? cal.courseId : ''),
          courseName,
          date: formattedDate,
          sessionId: sessionId,
          sessionName,
          startTime,
          endTime,
          teacherId: teacher?._id || (typeof cal.teacherId === 'string' ? cal.teacherId : ''),
          teacherName,
          status: cal.status || 'not_yet',
          note: cal.note,
          request: cal.request ? {
            _id: cal.request._id,
            status: cal.request.status as "pending" | "accepted" | "rejected",
            reason: cal.request.reason
          } : null,
        };
      });

      console.log("Transformed", transformedData.length, "schedules");
      
      const schedulesWithRequests = transformedData.filter(s => s.request || s.status !== 'not_yet');
      if (schedulesWithRequests.length > 0) {
        console.log(`Found ${schedulesWithRequests.length} schedules with requests:`);
        schedulesWithRequests.forEach(s => {
          console.log(`- ${s.courseName} (${s.date}): status=${s.status}, request=${JSON.stringify(s.request)}`);
        });
      }
      
      if (transformedData.length > 0) {
        const sample = transformedData[0];
        console.log("Sample schedule:", {
          date: sample.date,
          session: sample.sessionName,
          time: `${sample.startTime} - ${sample.endTime}`,
          course: sample.courseName
        });
      }

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
      };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error("getScheduleByWeek error:", axiosError.response?.data || axiosError.message);
      return { 
        success: false, 
        data: [], 
        message: axiosError.response?.data?.message || axiosError.message || 'Unknown error'
      };
    }
  },

  getSessions: async (): Promise<ApiResponse<Session[]>> => {
    try {
      console.log("Fetching sessions...");
      const response = await api.get<SessionApiResponse>("/sessions");
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn("getSessions error:", axiosError.response?.data || axiosError.message);
      return { 
        success: false, 
        data: [],
        message: axiosError.response?.data?.message || axiosError.message || 'Unknown error'
      };
    }
  },

  getCourses: async (): Promise<ApiResponse<Course[]>> => {
    try {
      console.log("Fetching courses...");
      const response = await api.get<CourseApiResponse>("/courses");
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message
      };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error("getCourses error:", axiosError.response?.data || axiosError.message);
      return { 
        success: false, 
        data: [], 
        message: axiosError.response?.data?.message || axiosError.message || 'Unknown error'
      };
    }
  },

  createRequest: async (payload: { calendarId: string; reason: string }): Promise<ApiResponse<RequestSchedule>> => {
    try {
      console.log("Creating schedule change request:", payload);
      const response = await api.post<RequestApiResponse>("/request-schedules", payload);
      console.log("Request created:", response.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Gửi yêu cầu đổi lịch thành công."
      };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error("createRequest error:", axiosError.response?.data || axiosError.message);
      const errorMsg = axiosError.response?.data?.message || axiosError.message || "Không thể gửi yêu cầu.";
      return {
        success: false,
        message: errorMsg
      };
    }
  },

  getMyRequests: async (): Promise<ApiResponse<RequestSchedule[]>> => {
    try {
      console.log("Fetching my requests...");
      const response = await api.get<RequestSchedule[]>("/request-schedules/me");
      const data = Array.isArray(response.data) ? response.data : [];
      return {
        success: true,
        data: data,
        count: data.length
      };
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error("getMyRequests error:", axiosError.response?.data || axiosError.message);
      return {
        success: false,
        data: [],
        message: axiosError.response?.data?.message || axiosError.message || 'Unknown error'
      };
    }
  }
};

export default teacherScheduleService;