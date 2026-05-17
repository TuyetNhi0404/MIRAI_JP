import { Request, Response } from "express";
import { CourseCalendar, CalendarStatus } from "../model/calendar.model";
import { Session } from "../model/session.model";
import { Course } from "../model/course.model";
import { User } from "../model/user.model";
import CourseCalendarService from "../service/calendar.service";
import Enrollment from "../model/enrollment.model";
import { RequestSchedule } from "../model/requestSchedule.model";

//CREATE
export const createCalendar = async (req: Request, res: Response) => {
  try {
    const { courseId, sessionId, teacherId, date, note } = req.body;

    if (!courseId || !sessionId || !teacherId || !date) {
      return res.status(400).json({ message: "Missing required information." });
    }

    // ✅ Validate ngày tạo lịch (phải trước ít nhất 24 giờ)
    const inputDate = new Date(date);
    const now = new Date();
    const hoursDiff = (inputDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Cannot create schedule. Please create the calendar at least 24 hours before the class time."
      });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // ✅ Kiểm tra ngày tạo lịch có nằm trong khoảng startDate và endDate của khóa học không
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
        message: `⚠️ Invalid lesson date.\n - Course duration:\n   ▪ Start: ${format(course.startDate)}\n   ▪ End: ${format(course.endDate)}`
      });
    }

    // ✅ Kiểm tra đã đủ session chưa
    const existingCalendarsCount = await CourseCalendar.countDocuments({
      courseId
    });

    if (existingCalendarsCount >= course.session) {
      return res.status(400).json({
        message: `Cannot create more sessions. This course is limited to ${course.session} sessions.`
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found." });

    // ✅ Kiểm tra xem teacherId có phải là teacher hay không
    const teacher = await User.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });

    if (teacher.role !== "teacher") {
      return res.status(400).json({ message: "Selected user is not a teacher." });
    }

    // ✅ Kiểm tra trùng lịch (teacher + date, course + session + date)
    const isDuplicate = await CourseCalendar.findOne({
      $or: [
        { teacherId, sessionId, date: new Date(date) },
        { courseId, sessionId, date: new Date(date) },
      ],
    });

    if (isDuplicate) {
      return res.status(400).json({
        message: "Duplicate schedule detected. Please check again.",
      });
    }

    const calendar = await CourseCalendar.create({
      courseId,
      sessionId,
      teacherId,
      date,
      note,
    });

    res.status(201).json({ message: "Schedule created successfully!", data: calendar });
  } catch (error) {
    res.status(500).json({ message: "Server error while creating schedule.", error });
  }
};

//GET ALL (Admin xem toàn bộ lịch)
export const getAllCalendars = async (req: Request, res: Response) => {
  try {
    const role = req.role;
    const userId = req.id;
    const filter: any = {};

    // ✅ ADMIN → xem tất cả
    if (role === "admin") {
      // không filter gì cả
    }
    // ✅ TEACHER → chỉ xem lịch của mình
    if (role === "teacher") {
      filter.teacherId = userId;
    }
    // ✅ STUDENT → xem lịch của khóa học mà học viên này đang học
    if (role === "student") {
      // ✅ Lấy email từ user
      const user = await User.findById(userId).select("email");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Student email:", user.email);

      // ✅ Query theo email
      const enrollments = await Enrollment.find({
        studentEmail: user.email,
        status: "approved" // Chỉ lấy đã approve
      }).select("courseId");

      console.log("Student enrollments:", enrollments);

      const courseIds = enrollments.map((e) => e.courseId);
      console.log("Course IDs:", courseIds);

      filter.courseId = { $in: courseIds };
    }
    // ✅ PHIÊN BẢN 1: Populate startTime và endTime từ sessionId
    const calendars = await CourseCalendar.find(filter)
      .populate("courseId", "name codeName courseName")
      .populate("sessionId", "sessionName startTime endTime") // ✅ GIỮ PHIÊN BẢN 1
      .populate("teacherId", "name email");

    // ✅ AUTO UPDATE STATUS - Kiểm tra cả ngày và giờ
    const now = new Date(); // Thời điểm hiện tại (có cả giờ)

    for (const cal of calendars) {
      // ✅ Lấy session để biết giờ bắt đầu và kết thúc
      const session = cal.sessionId as any; // đã populate ở trên

      if (!session || !session.startTime || !session.endTime) {
        // Nếu không có thông tin session, giữ nguyên logic cũ
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

      // ✅ Parse startTime và endTime từ session (format: "07:00" hoặc "07:00 ")
      const [startHour, startMinute] = session.startTime.trim().split(':').map(Number);
      const [endHour, endMinute] = session.endTime.trim().split(':').map(Number);

      // ✅ Tạo datetime bắt đầu và kết thúc cho buổi học
      const sessionStart = new Date(cal.date);
      sessionStart.setHours(startHour, startMinute, 0, 0);

      const sessionEnd = new Date(cal.date);
      sessionEnd.setHours(endHour, endMinute, 0, 0);

      // ✅ So sánh với thời điểm hiện tại
      let newStatus: CalendarStatus;

      if (now >= sessionStart && now <= sessionEnd) {
        // Đang trong giờ học
        newStatus = CalendarStatus.IN_PROGRESS;
      } else if (now > sessionEnd) {
        // Đã qua giờ học
        newStatus = CalendarStatus.COMPLETED;
      } else {
        // Chưa đến giờ học
        newStatus = CalendarStatus.NOT_YET;
      }

      // ✅ Chỉ cập nhật nếu status thay đổi
      if (cal.status !== newStatus) {
        cal.status = newStatus;
        await cal.save();
      }
    }

    // ✅ PHIÊN BẢN 2: JOIN VỚI REQUEST_SCHEDULE
    const result = await Promise.all(
      calendars.map(async (cal) => {
        let request = null;

        // Nếu là teacher, tìm request của chính họ
        if (role === "teacher") {
          request = await RequestSchedule.findOne({
            calendarId: cal._id,
            createdBy: userId,
          })
            .sort({ createdAt: -1 })
            .limit(1)
            .select('_id status reason createdAt updatedAt');
        }
        // Nếu là admin, lấy request bất kỳ (của teacher của lịch này)
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
      message: "Fetched schedule list successfully.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: "Error while fetching schedule list.", error });
  }
};

// UPDATE CALENDAR (Admin chỉnh sửa toàn bộ thông tin, nhưng chỉ được phép trước 24h)
export const updateCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const updateData = req.body;

    const calendar = await CourseCalendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    // --- Kiểm tra thời gian ---
    const now = new Date();
    const hoursDiff = (calendar.date.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Cannot update. Schedule can only be modified at least 24 hours before the class time.",
      });
    }

    // ✅ Kiểm tra teacherId có phải là teacher không (nếu update teacherId)
    if (updateData.teacherId) {
      const teacher = await User.findById(updateData.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found." });
      }
      if (teacher.role !== "teacher") {
        return res.status(400).json({ message: "Selected user is not a teacher." });
      }
    }

    // ✅ Kiểm tra trùng lịch (logic giống createCalendar)
    if (updateData.teacherId || updateData.date || updateData.sessionId || updateData.courseId) {
      const teacherId = updateData.teacherId || calendar.teacherId;
      const date = new Date(updateData.date || calendar.date);
      const sessionId = updateData.sessionId || calendar.sessionId;
      const courseId = updateData.courseId || calendar.courseId;

      // ✅ Kiểm tra trùng lịch với 2 điều kiện như createCalendar
      const isDuplicate = await CourseCalendar.findOne({
        $or: [
          { teacherId, sessionId, date },
          { courseId, sessionId, date },
        ],
        _id: { $ne: calendarId }, // ✅ Loại trừ chính calendar đang update
      });

      if (isDuplicate) {
        return res.status(400).json({
          message: "Duplicate schedule detected. Please check again.",
        });
      }
    }

    // --- Cập nhật ---
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
      message: "Schedule updated successfully.",
      data: updatedCalendar,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while updating schedule.", error });
  }
};

//DELETE (Admin xóa lịch học)
export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    // ✅ Lấy lịch trước khi xoá
    const calendar = await CourseCalendar.findById(calendarId);

    if (!calendar) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    // ✅ Validate status
    if (calendar.status === "in_progress" || calendar.status === "completed") {
      return res.status(400).json({
        message: "Cannot delete a schedule that is in progress or already completed.",
      });
    }

    // ✅ Chỉ NOT_YET mới được xoá
    await CourseCalendar.findByIdAndDelete(calendarId);
    return res.status(200).json({ message: "Schedule deleted successfully." });

  } catch (error) {
    return res.status(500).json({ message: "Server error while deleting schedule.", error });
  }
};

export const getByWeek = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.id;
    const role = req.role;

    // ✅ Nếu FE không truyền startDate hoặc endDate → tự tính tuần hiện tại
    let start: Date;
    let end: Date;

    if (!startDate || !endDate) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

      // Tính thứ 2 của tuần hiện tại
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);

      // Tính chủ nhật của tuần hiện tại
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start = monday;
      end = sunday;
    } else {
      // ✅ Nếu FE có truyền thì parse như bình thường
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }

    // Validate
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate." });
    }

    // ✅ Filter mặc định trong khoảng ngày
    const filter: any = { date: { $gte: start, $lte: end } };

    // ✅ Phân quyền lọc dữ liệu
    if (role === "teacher") {
      filter.teacherId = userId;
    } else if (role === "student") {
      // ✅ Lấy danh sách courseId mà student đã enroll
      const enrollments = await Enrollment.find({
        studentId: userId,
        status: "active" // hoặc điều kiện khác tuỳ business logic
      }).select("courseId");

      const enrolledCourseIds = enrollments.map(e => e.courseId);

      if (enrolledCourseIds.length === 0) {
        // ✅ Nếu chưa enroll khóa nào → trả về rỗng
        return res.status(200).json({
          message: "You have not enrolled in any courses.",
          count: 0,
          data: [],
        });
      }

      // ✅ Chỉ lấy lịch của các khóa đã enroll
      filter.courseId = { $in: enrolledCourseIds };
    }

    // ✅ Lấy dữ liệu từ service
    const data = await CourseCalendarService.getByFilter(filter);

    // ✅ AUTO UPDATE STATUS
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

      cal.status = newStatus; // ✅ chỉ gán giá trị, không save
    }

    return res.status(200).json({
      message: `Schedule from ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error("Error in getByWeek:", error);
    return res.status(500).json({
      message: "Server error while fetching weekly schedule.",
      error: error.message,
    });
  }
};