import mongoose from "mongoose";
import { CourseCalendar, AttendanceStatus } from "../model/calendar.model";
import { Course } from "../model/course.model";
import { StatisticsService } from "./statistics.service";

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  username?: string;
}

interface PopulatedSession {
  _id: mongoose.Types.ObjectId;
  sessionName: string;
  startTime: string;
  endTime: string;
}

interface PopulatedCourse {
  _id: mongoose.Types.ObjectId;
  name: string;
  codeName?: string;
  courseName?: string;
}

interface PopulatedCalendar {
  _id: mongoose.Types.ObjectId;
  date: Date;
  sessionId: PopulatedSession;
  courseId: PopulatedCourse;
  teacherId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  attendances: {
    _id?: mongoose.Types.ObjectId;
    userId: PopulatedUser | mongoose.Types.ObjectId | null;
    status: AttendanceStatus;
  }[];
}

interface CourseMemberWithUser {
  userId: mongoose.Types.ObjectId | PopulatedUser | null;
  role: string;
}

export class AttendanceService {

  static async getStudentsForCalendar(calendarId: string, userRole?: string, userId?: string) {
    try {
      console.log('📅 Getting attendance for calendar:', calendarId);

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        throw new Error("Invalid calendarId");
      }

      const calendar = await CourseCalendar.findById(calendarId)
        .populate("sessionId", "sessionName startTime endTime")
        .populate("courseId", "name codeName courseName");

      if (!calendar) {
        throw new Error("Calendar not found");
      }

      if (userRole === "teacher") {
        if (!userId) throw new Error("Missing teacherId.");
        if (calendar.teacherId.toString() !== userId.toString()) {
          throw new Error("You do not have permission to view attendance for this session.");
        }
      }

      const courseId = calendar.courseId;

      const course = await Course.findById(courseId)
        .populate("members.userId", "name email username")
        .select("members")
        .lean();

      const students = (course?.members || []).filter((m: any) => m.role === "student" && !m.deletedAt) as unknown as CourseMemberWithUser[];

      console.log(`👥 Found ${students.length} students in course`);

      const existingMap = new Set(
        calendar.attendances.map((a) => a.userId.toString())
      );

      let isUpdated = false;

      for (const s of students) {
        if (!s.userId) continue;

        let uid: string;
        if (typeof s.userId === 'object' && '_id' in s.userId) {
          uid = (s.userId as PopulatedUser)._id.toString();
        } else {
          uid = (s.userId as mongoose.Types.ObjectId).toString();
        }

        if (!existingMap.has(uid)) {
          calendar.attendances.push({
            userId: new mongoose.Types.ObjectId(uid),
            status: AttendanceStatus.NOT_YET,
          });
          isUpdated = true;
        }
      }

      if (isUpdated) {
        await calendar.save();
      }

      const finalCalendar = await CourseCalendar.findById(calendarId)
        .populate("sessionId", "sessionName startTime endTime")
        .populate("courseId", "name codeName courseName")
        .populate("attendances.userId", "name email username")
        .lean<PopulatedCalendar>();

      if (!finalCalendar) {
        throw new Error("Calendar not found after update");
      }

      const validRecords = finalCalendar.attendances.filter(a => a.userId != null);

      return validRecords.map((a) => {
        const user = a.userId as PopulatedUser;
        return {
          attendanceId: a._id,
          userId: user,
          name: user.name || 'Unknown',
          username: user.username || '',
          email: user.email || '',
          status: a.status,
        };
      });

    } catch (error) {
      console.error('❌ Error in getStudentsForCalendar:', error);
      throw error;
    }
  }

  static async updateAttendance(
    calendarId: string,
    userId: string,
    status: string,
    userRole: string,
    teacherId?: string
  ) {
    try {
      console.log('🔄 Updating attendance:', { calendarId, userId, status, userRole, teacherId });

      const calendar = await CourseCalendar.findById(calendarId)
        .populate({
          path: "sessionId",
          select: "endTime startTime"
        });

      if (!calendar) throw new Error("Calendar record not found.");

      const attendanceRecord = calendar.attendances.find(a => a.userId?.toString() === userId);
      if (!attendanceRecord) throw new Error("Attendance sub-record not found.");

      if (userRole === "teacher") {
        if (!teacherId) throw new Error("Missing teacherId.");

        if (calendar.teacherId.toString() !== teacherId.toString()) {
          throw new Error("You do not have permission to modify this session.");
        }

        const session: any = calendar.sessionId;
        if (!session?.endTime) {
          throw new Error("Session does not contain endTime.");
        }

        const end = new Date(calendar.date);
        const timeParts = session.endTime.trim().split(":");
        const h = Number(timeParts[0]?.trim() || 0);
        const m = Number(timeParts[1]?.trim() || 0);
        end.setHours(h, m, 0, 0);

        const deadline = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        if (new Date() > deadline) {
          throw new Error(
            "Attendance update window has expired. You can only update within 24 hours after the session ends."
          );
        }
      }

      if (!Object.values(AttendanceStatus).includes(status as AttendanceStatus)) {
        throw new Error("Invalid attendance status.");
      }
      attendanceRecord.status = status as AttendanceStatus;
      await calendar.save();

      console.log('✅ Attendance updated successfully');

      try {
        const courseId = calendar.courseId.toString();
        const studentId = attendanceRecord.userId.toString();
        StatisticsService.refreshStudentScoresAsync(courseId, studentId).catch((err) => {
          console.error("Error refreshing scores after attendance update:", err);
        });
      } catch (scoreErr) {
        console.error("Error refreshing scores:", scoreErr);
      }

      return {
        _id: attendanceRecord._id,
        calendarId: calendar._id,
        userId: attendanceRecord.userId,
        status: attendanceRecord.status,
      };

    } catch (error) {
      console.error('❌ Error in updateAttendance:', error);
      throw error;
    }
  }

  static async getStudentAttendance(studentId: string) {
    try {
      console.log('📚 Getting attendance history for student:', studentId);

      const calendars = await CourseCalendar.find({ "attendances.userId": studentId })
        .populate("sessionId", "sessionName startTime endTime")
        .lean();

      return calendars.map(cal => {
        const att = cal.attendances.find(a => a.userId.toString() === studentId);
        return {
          _id: att?._id,
          userId: studentId,
          status: att?.status || AttendanceStatus.NOT_YET,
          calendarId: {
            _id: cal._id,
            date: cal.date,
            sessionId: cal.sessionId,
            courseId: cal.courseId,
          },
          createdAt: cal.createdAt,
          updatedAt: cal.updatedAt,
        };
      });

    } catch (error) {
      console.error('❌ Error in getStudentAttendance:', error);
      throw error;
    }
  }
}