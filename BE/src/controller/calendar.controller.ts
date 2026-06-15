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
      return res.status(400).json({ message: "Missing required information." });
    }

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

    const teacher = await User.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });

    if (teacher.role !== "teacher") {
      return res.status(400).json({ message: "Selected user is not a teacher." });
    }

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

    if (role === "admin") {
    }
    if (role === "teacher") {
      filter.teacherId = userId;
    }
    if (role === "student") {
      const user = await User.findById(userId).select("email");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
      message: "Fetched schedule list successfully.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: "Error while fetching schedule list.", error });
  }
};

export const updateCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const updateData = req.body;

    const calendar = await CourseCalendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    const now = new Date();
    const hoursDiff = (calendar.date.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({
        message: "Cannot update. Schedule can only be modified at least 24 hours before the class time.",
      });
    }

    if (updateData.teacherId) {
      const teacher = await User.findById(updateData.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found." });
      }
      if (teacher.role !== "teacher") {
        return res.status(400).json({ message: "Selected user is not a teacher." });
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
          message: "Duplicate schedule detected. Please check again.",
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
      message: "Schedule updated successfully.",
      data: updatedCalendar,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while updating schedule.", error });
  }
};

export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const calendar = await CourseCalendar.findById(calendarId);

    if (!calendar) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    if (calendar.status === "in_progress" || calendar.status === "completed") {
      return res.status(400).json({
        message: "Cannot delete a schedule that is in progress or already completed.",
      });
    }

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
      return res.status(400).json({ message: "Invalid startDate or endDate." });
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
          message: "You have not enrolled in any courses.",
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