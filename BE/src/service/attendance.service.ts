import mongoose from "mongoose";
import { Attendance, AttendanceStatus } from "../model/attendance.model";
import { CourseCalendar } from "../model/calendar.model";
import { CourseMember } from "../model/courseMember.model";
import { StatisticsService } from "./statistics.service";

// ✅ Type definitions for populated fields
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
}

interface CourseMemberWithUser {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | PopulatedUser | null;
  courseId: mongoose.Types.ObjectId;
  role: string;
}

interface AttendanceWithPopulated {
  _id: mongoose.Types.ObjectId;
  calendarId: mongoose.Types.ObjectId | PopulatedCalendar;
  userId: mongoose.Types.ObjectId | PopulatedUser | null;
  status: AttendanceStatus;
}

export class AttendanceService {

  // ✅ LẤY + AUTO-SYNC ATTENDANCE CHO 1 BUỔI
  static async getStudentsForCalendar(calendarId: string) {
    try {
      console.log('📅 Getting attendance for calendar:', calendarId);

      if (!mongoose.Types.ObjectId.isValid(calendarId)) {
        throw new Error("Invalid calendarId");
      }

      // ✅ FIX 1: Populate đầy đủ fields cần thiết cho frontend
      const calendar = await CourseCalendar.findById(calendarId)
        .populate("sessionId", "sessionName startTime endTime")
        .populate("courseId", "name codeName courseName")
        .lean<PopulatedCalendar>();

      console.log('📦 Calendar found:', calendar);

      if (!calendar) {
        throw new Error("Calendar not found");
      }

      const courseId = calendar.courseId;

      // ✅ 1. Tìm toàn bộ học viên của course
      const students = await CourseMember.find({
        courseId,
        role: "student",
      })
        .populate("userId", "name email username")
        .lean<CourseMemberWithUser[]>();

      console.log(`👥 Found ${students.length} students in course`);

      // ✅ DEBUG: Log each student to see userId status
      students.forEach((s, idx) => {
        const isPopulated = s.userId && typeof s.userId === 'object' && '_id' in s.userId;
        console.log(`   Student ${idx + 1}:`, {
          _id: s._id,
          userId: s.userId ? (isPopulated ? (s.userId as PopulatedUser)._id : s.userId) : 'NULL',
          populated: isPopulated,
          name: isPopulated ? (s.userId as PopulatedUser).name : 'N/A'
        });
      });

      // ✅ 2. Lấy attendance hiện có
      const existing = await Attendance.find({ calendarId }).lean();
      console.log(`📋 Found ${existing.length} existing attendance records`);

      const existingMap = new Set(
        existing.map((a) => a.userId.toString())
      );

      const toInsert: Array<{
        calendarId: mongoose.Types.ObjectId;
        userId: mongoose.Types.ObjectId;
        status: AttendanceStatus;
      }> = [];

      // ✅ 3. Tạo attendance cho student chưa có (với null check)
      for (const s of students) {
        // ✅ CRITICAL FIX: Check if userId exists and is valid
        if (!s.userId) {
          console.warn('⚠️ Skipping student with null userId:', {
            courseMemberId: s._id,
            courseId: s.courseId
          });
          continue;
        }

        // ✅ Handle both populated object and plain ObjectId
        let uid: string;
        if (typeof s.userId === 'object' && '_id' in s.userId) {
          // Populated user object
          uid = (s.userId as PopulatedUser)._id.toString();
        } else {
          // Plain ObjectId
          uid = (s.userId as mongoose.Types.ObjectId).toString();
        }

        console.log('👤 Processing student userId:', uid);

        if (!existingMap.has(uid)) {
          toInsert.push({
            calendarId: new mongoose.Types.ObjectId(calendarId),
            userId: new mongoose.Types.ObjectId(uid),
            status: AttendanceStatus.NOT_YET,
          });
        }
      }

      // ✅ 4. Tránh duplicate → dùng insertMany + ordered:false
      if (toInsert.length > 0) {
        console.log(`➕ Creating ${toInsert.length} new attendance records`);
        await Attendance.insertMany(toInsert, { ordered: false }).catch(() => {
          console.warn('⚠️ Some attendance records already exist (duplicate key error - this is OK)');
        });
      }

      // ✅ 5. Lấy lại dữ liệu đầy đủ
      const final = await Attendance.find({ calendarId })
        .populate("userId", "name email username")
        .populate({
          path: "calendarId",
          select: "date sessionId courseId",
          populate: [
            { path: "sessionId", select: "sessionName startTime endTime" },
            { path: "courseId", select: "name codeName courseName" }
          ]
        })
        .lean<AttendanceWithPopulated[]>();

      console.log(`✅ Returning ${final.length} attendance records`);

      // ✅ CRITICAL FIX: Filter out records where userId failed to populate
      const validRecords = final.filter(a => {
        if (!a.userId) {
          console.warn('⚠️ Attendance record has null userId:', a._id);
          return false;
        }
        return true;
      });

      return validRecords.map((a) => {
        const user = a.userId as PopulatedUser;
        return {
          attendanceId: a._id,
          userId: a.userId,
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

  // ✅ UPDATE ATTENDANCE
  static async updateAttendance(
    attendanceId: string,
    status: string,
    userRole: string,
    teacherId?: string
  ) {
    try {
      console.log('🔄 Updating attendance:', { attendanceId, status, userRole, teacherId });

      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) throw new Error("Attendance record not found.");

      // 1) LOAD CALENDAR + SESSION (làm 1 lần duy nhất)
      const calendar = await CourseCalendar.findById(attendance.calendarId)
        .populate({
          path: "sessionId",
          select: "endTime startTime"
        })
        .lean<PopulatedCalendar>();

      if (!calendar) throw new Error("Class session not found.");

      // 2) CHECK QUYỀN TEACHER
      if (userRole === "teacher") {
        if (!teacherId) throw new Error("Missing teacherId.");

        if (calendar.teacherId.toString() !== teacherId.toString()) {
          throw new Error("You do not have permission to modify this session.");
        }

        // 3) CHECK DEADLINE 24H (chỉ áp dụng cho teacher)
        const session = calendar.sessionId;
        if (!session?.endTime) {
          throw new Error("Session does not contain endTime.");
        }

        // Tạo datetime kết thúc buổi học
        const end = new Date(calendar.date);
        const timeParts = session.endTime.trim().split(":");
        const h = Number(timeParts[0]?.trim() || 0);
        const m = Number(timeParts[1]?.trim() || 0);
        end.setHours(h, m, 0, 0);

        // Deadline = endTime + 24h
        const deadline = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        console.log('⏰ Deadline check:', {
          sessionEnd: end.toISOString(),
          deadline: deadline.toISOString(),
          now: new Date().toISOString(),
          isPastDeadline: new Date() > deadline
        });

        if (new Date() > deadline) {
          throw new Error(
            "Attendance update window has expired. You can only update within 24 hours after the session ends."
          );
        }
      }

      // 4) VALIDATE STATUS
      if (!Object.values(AttendanceStatus).includes(status as AttendanceStatus)) {
        throw new Error("TInvalid attendance status.");
      }

      // 5) UPDATE ATTENDANCE
      attendance.status = status as AttendanceStatus;
      await attendance.save();

      console.log('✅ Attendance updated successfully');

      // ✅ Tự động tính lại điểm sau khi điểm danh
      try {
        const courseId = calendar.courseId.toString();
        const studentId = attendance.userId.toString();
        // Gọi hàm tính điểm tự động (không await để không chặn response)
        StatisticsService.refreshStudentScoresAsync(courseId, studentId).catch((err) => {
          console.error("Error refreshing scores after attendance update:", err);
        });
      } catch (scoreErr) {
        console.error("Error refreshing scores:", scoreErr);
        // Không fail nếu tính điểm lỗi
      }

      return attendance;

    } catch (error) {
      console.error('❌ Error in updateAttendance:', error);
      throw error;
    }
  }


  // ✅ STUDENT XEM LỊCH SỬ – FIX lỗi calendarId null
  static async getStudentAttendance(studentId: string) {
    try {
      console.log('📚 Getting attendance history for student:', studentId);
      return Attendance.find({ userId: studentId })
        .populate({
          path: "calendarId",
          select: "date sessionId courseId",
          populate: {
            path: "sessionId",
            select: "sessionName startTime endTime"
          }
        })
        .lean();

    } catch (error) {
      console.error('❌ Error in getStudentAttendance:', error);
      throw error;
    }
  }
}