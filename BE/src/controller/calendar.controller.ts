import { Request, Response } from "express";
import { CourseCalendar, CalendarStatus } from "../model/calendar.model";
import { Session } from "../model/session.model";
import { Course } from "../model/course.model";
import { User } from "../model/user.model";
import CourseCalendarService from "../service/calendar.service";
import Enrollment from "../model/enrollment.model";
import { RequestSchedule } from "../model/requestSchedule.model";

export const createCalendar = async (req: Request, res: Response) => {
  try {
    const { courseId, sessionId, teacherId, date, note } = req.body;

    if (!courseId || !sessionId || !teacherId || !date) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const inputDate = new Date(date);
    const now = new Date();
    const hoursDiff = (inputDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Không thể tạo lịch học. Vui lòng tạo trước giờ học ít nhất 24 giờ."
      });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học." });
    const lessonDate = new Date(date);
    if (lessonDate < new Date(course.startDate) || lessonDate > new Date(course.endDate)) {
      const format = (d: Date) => {
        return new Date(d).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      };

      return res.status(400).json({
        message: `⚠️ Ngày học không hợp lệ.\n - Thời gian khóa học:\n   ▪ Bắt đầu: ${format(course.startDate)}\n   ▪ Kết thúc: ${format(course.endDate)}`
      });
    }

    const existingCalendarsCount = await CourseCalendar.countDocuments({
      courseId
    });

    if (existingCalendarsCount >= course.session) {
      return res.status(400).json({
        message: `Không thể tạo thêm buổi học. Khóa học này giới hạn tối đa ${course.session} buổi.`
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Không tìm thấy ca học." });

    const teacher = await User.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Không tìm thấy giảng viên." });

    if (teacher.role !== "teacher") {
      return res.status(400).json({ message: "Người dùng được chọn không phải là giảng viên." });
    }

    const isDuplicate = await CourseCalendar.findOne({
      $or: [
        { teacherId, sessionId, date: new Date(date) },
        { courseId, sessionId, date: new Date(date) },
      ],
    });

    if (isDuplicate) {
      return res.status(400).json({
        message: "Trùng lặp lịch học. Vui lòng kiểm tra lại.",
      });
    }

    const calendar = await CourseCalendar.create({
      courseId,
      sessionId,
      teacherId,
      date,
      note,
    });

    res.status(201).json({ message: "Tạo lịch học thành công!", data: calendar });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ khi tạo lịch học.", error });
  }
};

//GET ALL (Admin xem toàn bộ lịch)
export const getAllCalendars = async (req: Request, res: Response) => {
  try {
    const role = req.role;
    const userId = req.id;
    const filter: any = {};

    if (role === "admin") {
    }
    if (role === "teacher") {
      filter.teacherId = userId;
    }
    if (role === "student") {
      const user = await User.findById(userId).select("email");

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
      }

      console.log("Student email:", user.email);

      const enrollments = await Enrollment.find({
        studentEmail: user.email,
        status: "approved"
      }).select("courseId");

      console.log("Student enrollments:", enrollments);

      const courseIds = enrollments.map((e) => e.courseId);
      console.log("Course IDs:", courseIds);

      filter.courseId = { $in: courseIds };
    }
    const calendars = await CourseCalendar.find(filter)
      .populate("courseId", "name codeName courseName enrolledCount capacity")
      .populate("sessionId", "sessionName startTime endTime")
      .populate("teacherId", "name email");
    const now = new Date();

    for (const cal of calendars) {
      const session = cal.sessionId as any;

      if (!session || !session.startTime || !session.endTime) {
        const calDate = new Date(cal.date);
        calDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (calDate.getTime() === today.getTime()) {
          cal.status = CalendarStatus.IN_PROGRESS;
        } else if (calDate < today) {
          cal.status = CalendarStatus.COMPLETED;
        } else {
          cal.status = CalendarStatus.NOT_YET;
        }
        await cal.save();
        continue;
      }

      const [startHour, startMinute] = session.startTime.trim().split(':').map(Number);
      const [endHour, endMinute] = session.endTime.trim().split(':').map(Number);

      const sessionStart = new Date(cal.date);
      sessionStart.setHours(startHour, startMinute, 0, 0);

      const sessionEnd = new Date(cal.date);
      sessionEnd.setHours(endHour, endMinute, 0, 0);

      let newStatus: CalendarStatus;

      if (now >= sessionStart && now <= sessionEnd) {
        newStatus = CalendarStatus.IN_PROGRESS;
      } else if (now > sessionEnd) {
        newStatus = CalendarStatus.COMPLETED;
      } else {
        newStatus = CalendarStatus.NOT_YET;
      }

      if (cal.status !== newStatus) {
        cal.status = newStatus;
        await cal.save();
      }
    }

    const result = await Promise.all(
      calendars.map(async (cal) => {
        let request = null;
        if (role === "teacher") {
          request = await RequestSchedule.findOne({
            calendarId: cal._id,
            createdBy: userId,
          })
            .sort({ createdAt: -1 })
            .limit(1)
            .select('_id status reason createdAt updatedAt');
        }
        else if (role === "admin") {
          request = await RequestSchedule.findOne({
            calendarId: cal._id,
          })
            .sort({ createdAt: -1 })
            .limit(1)
            .select('_id status reason createdAt updatedAt')
            .populate('createdBy', 'name email');
        }

        return {
          ...cal.toObject(),
          request: request ? {
            _id: request._id,
            status: request.status,
            reason: request.reason,
          } : null,
        };
      })
    );

    res.status(200).json({
      message: "Lấy danh sách lịch học thành công.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách lịch học.", error });
  }
};

export const updateCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const updateData = req.body;

    // Log to file
    const fs = require("fs");
    const path = require("path");
    const logPath = path.join(__dirname, "../../../api_calls.log");
    const logMsg = `[${new Date().toISOString()}] PATCH /calendars/${calendarId} called, body: ${JSON.stringify(updateData)}\n`;
    fs.appendFileSync(logPath, logMsg);
    console.log(`[BACKEND] updateCalendar called with calendarId: "${calendarId}"`, updateData);

    const calendar = await CourseCalendar.findById(calendarId);
    if (!calendar) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] PATCH /calendars/${calendarId} returned 404 (Not Found)\n`);
      console.log(`[BACKEND] calendar with ID "${calendarId}" not found in DB`);
      return res.status(404).json({ message: "Không tìm thấy lịch học." });
    }

    const now = new Date();
    const hoursDiff = (calendar.date.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Không thể cập nhật. Lịch học chỉ có thể thay đổi trước thời gian học ít nhất 24 giờ.",
      });
    }

    if (updateData.teacherId) {
      const teacher = await User.findById(updateData.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Không tìm thấy giảng viên." });
      }
      if (teacher.role !== "teacher") {
        return res.status(400).json({ message: "Người dùng được chọn không phải là giảng viên." });
      }
    }

    if (updateData.teacherId || updateData.date || updateData.sessionId || updateData.courseId) {
      const teacherId = updateData.teacherId || calendar.teacherId;
      const date = new Date(updateData.date || calendar.date);
      const sessionId = updateData.sessionId || calendar.sessionId;
      const courseId = updateData.courseId || calendar.courseId;

      const isDuplicate = await CourseCalendar.findOne({
        $or: [
          { teacherId, sessionId, date },
          { courseId, sessionId, date },
        ],
        _id: { $ne: calendarId },
      });

      if (isDuplicate) {
        return res.status(400).json({
          message: "Trùng lặp lịch học. Vui lòng kiểm tra lại.",
        });
      }
    }

    const updatedCalendar = await CourseCalendar.findByIdAndUpdate(
      calendarId,
      {
        $set: {
          ...(updateData.courseId && { courseId: updateData.courseId }),
          ...(updateData.sessionId && { sessionId: updateData.sessionId }),
          ...(updateData.teacherId && { teacherId: updateData.teacherId }),
          ...(updateData.date && { date: updateData.date }),
          ...(updateData.note !== undefined && { note: updateData.note }),
        },
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Cập nhật lịch học thành công.",
      data: updatedCalendar,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi máy chủ khi cập nhật lịch học.", error });
  }
};

export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    // Log to file
    const fs = require("fs");
    const path = require("path");
    const logPath = path.join(__dirname, "../../../api_calls.log");
    const logMsg = `[${new Date().toISOString()}] DELETE /calendars/${calendarId} called\n`;
    fs.appendFileSync(logPath, logMsg);
    console.log(`[BACKEND] deleteCalendar called with calendarId: "${calendarId}"`);

    const calendar = await CourseCalendar.findById(calendarId);

    if (!calendar) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] DELETE /calendars/${calendarId} returned 404 (Not Found)\n`);
      console.log(`[BACKEND] deleteCalendar calendar with ID "${calendarId}" not found in DB`);
      return res.status(404).json({ message: "Không tìm thấy lịch học." });
    }

    if (calendar.status === "in_progress" || calendar.status === "completed") {
      return res.status(400).json({
        message: "Không thể xóa lịch học đang diễn ra hoặc đã hoàn thành.",
      });
    }

    await CourseCalendar.findByIdAndDelete(calendarId);
    return res.status(200).json({ message: "Xóa lịch học thành công." });

  } catch (error) {
    return res.status(500).json({ message: "Lỗi máy chủ khi xóa lịch học.", error });
  }
};

export const getByWeek = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.id;
    const role = req.role;

    let start: Date;
    let end: Date;

    if (!startDate || !endDate) {
      const today = new Date();
      const dayOfWeek = today.getDay();

      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start = monday;
      end = sunday;
    } else {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ." });
    }

    const filter: any = { date: { $gte: start, $lte: end } };

    if (role === "teacher") {
      filter.teacherId = userId;
    } else if (role === "student") {
      const enrollments = await Enrollment.find({
        studentId: userId,
        status: "active"
      }).select("courseId");

      const enrolledCourseIds = enrollments.map(e => e.courseId);

      if (enrolledCourseIds.length === 0) {
        return res.status(200).json({
          message: "Bạn chưa đăng ký khóa học nào.",
          count: 0,
          data: [],
        });
      }

      filter.courseId = { $in: enrolledCourseIds };
    }

    const data = await CourseCalendarService.getByFilter(filter);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const cal of data) {
      const calDate = new Date(cal.date);
      calDate.setHours(0, 0, 0, 0);

      let newStatus = CalendarStatus.NOT_YET;

      if (calDate.getTime() === today.getTime()) {
        newStatus = CalendarStatus.IN_PROGRESS;
      } else if (calDate < today) {
        newStatus = CalendarStatus.COMPLETED;
      }

      cal.status = newStatus;
    }

    return res.status(200).json({
      message: `Lịch học từ ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error("Error in getByWeek:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy lịch học tuần.",
      error: error.message,
    });
  }
};