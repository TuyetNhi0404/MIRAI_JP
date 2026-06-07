import { Request, Response } from "express";
import { Course } from "../model/course.model";
import { User } from "../model/user.model";
import { Session } from "../model/session.model";
import Enrollment from "../model/enrollment.model";
import { CourseService } from "../service/course.service";
import mongoose from "mongoose";
import { CourseCalendar } from "../model/calendar.model";

// TẠO KHÓA HỌC (Teacher/Admin)

async function updateCourseStatus(courseId: string) {
  try {
    const course = await Course.findById(courseId);
    if (!course) return;

    const now = new Date();
    let newStatus = course.status;

    if (course.status === "not_yet" && course.startDate) {
      // Chuyển từ "not_yet" sang "in_progress" khi đã đến startDate
      if (now >= course.startDate) {
        newStatus = "in_progress";
      }
    } else if (course.status === "in_progress" && course.endDate) {
      // Chuyển từ "in_progress" sang "complete" khi đã qua endDate
      if (now > course.endDate) {
        newStatus = "complete";
      }
    }

    if (newStatus !== course.status) {
      await Course.findByIdAndUpdate(courseId, { status: newStatus });
      console.log(`Course ${courseId} status updated from "${course.status}" to "${newStatus}"`);
    }
  } catch (err) {
    console.error(`Error updating course status for ${courseId}:`, err);
  }
}

// TẠO KHÓA HỌC (Teacher/Admin)
export async function createCourse(req: Request, res: Response) {
  try {
    const payload = { ...req.body };
    delete (payload as any).enrolledCount;

    if (typeof payload.session !== "number" || payload.session < 0) {
      payload.session = 0;
    }

    if (payload.capacity !== undefined) {
      if (typeof payload.capacity !== "number" || payload.capacity < 0) {
        return res.status(400).json({
          error: "capacity must be a non-negative number",
          message: "Class capacity must be a non-negative number",
        });
      }
    }

    // Kiểm tra startDate và endDate - tối thiểu 3 tháng
    if (payload.startDate || payload.endDate) {
      const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
      const endDate = payload.endDate ? new Date(payload.endDate) : new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: "Invalid dates",
          message: "Start date and end date must be valid dates",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          error: "Invalid date range",
          message: "Start date must be before end date",
        });
      }

      // Kiểm tra khóa học phải ít nhất 3 tháng
      const threeMonthsLater = new Date(startDate);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      if (endDate < threeMonthsLater) {
        return res.status(400).json({
          error: "Invalid duration",
          message: `Course duration must be at least 3 months. Current duration: ${Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`,
        });
      }
    }

    if (!payload.homeroomTeacherId) {
      return res.status(400).json({
        error: "homeroomTeacherId is required",
        message: "Please select a homeroom teacher for the course",
      });
    }

    let homeroomTeacher;
    try {
      homeroomTeacher = await User.findById(payload.homeroomTeacherId).select("_id name role");
    } catch (idError) {
      return res.status(400).json({
        error: "Invalid homeroomTeacherId",
        message: "Invalid homeroom teacher ID",
      });
    }

    if (!homeroomTeacher) {
      return res.status(404).json({
        error: "Homeroom teacher not found",
        message: "Homeroom teacher not found with this ID",
      });
    }

    if (homeroomTeacher.role !== "teacher") {
      return res.status(400).json({
        error: "Invalid role",
        message: "Only teachers can be set as homeroom teachers",
      });
    }

    payload.homeroomTeacher = homeroomTeacher.name;

    if (req.id) {
      const creator = await User.findById(req.id);
      if (creator) {
        payload.createdBy = creator.name;
      }
    }

    // Đặt status mặc định là "not_yet" khi tạo
    if (!payload.status) {
      payload.status = "not_yet";
    }

    const course = await Course.create(payload);

    return res.status(201).json({
      message: "Course created successfully",
      data: course,
    });
  } catch (err: any) {
    console.error("Create course error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// DANH SÁCH GIÁO VIÊN CHỦ NHIỆM CHO DROPDOWN
export async function getHomeroomTeacherList(req: Request, res: Response) {
  try {
    const homeroomTeachers = await User.find({ role: "teacher" })
      .select("_id name email")
      .sort({ name: 1 });

    return res.json({
      data: homeroomTeachers,
      total: homeroomTeachers.length,
    });
  } catch (err: any) {
    console.error("Get homeroom teacher list error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// DANH SÁCH TẤT CẢ KHÓA HỌC
export async function listCourses(_req: Request, res: Response) {
  try {
    const projection = "name description status startDate endDate homeroomTeacherId homeroomTeacher capacity session createdAt";
    const courses = await Course.find()
      .select(projection)
      .sort({ createdAt: -1 });

    // Cập nhật trạng thái tất cả course
    await Promise.all(courses.map(c => updateCourseStatus(c.id.toString())));

    // Lấy lại danh sách sau khi cập nhật
    const updatedCourses = await Course.find()
      .select(projection)
      .sort({ createdAt: -1 });

    return res.json({ data: updatedCourses, total: updatedCourses.length });
  } catch (err: any) {
    console.error("List courses error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// DANH SÁCH KHÓA HỌC CÓ SẴN (For Student)
export async function listAvailableCourses(req: Request, res: Response) {
  try {
    const now = new Date();
    const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
    const limit = Math.max(parseInt(String(req.query.limit || "10"), 10), 1);
    const q = String(req.query.q || "").trim();

    const filter: any = {
      status: "not_yet",
      $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
    };

    if (q) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { homeroomTeacher: { $regex: q, $options: "i" } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;
    const projection = "name description status startDate endDate homeroomTeacherId homeroomTeacher capacity session enrolledCount createdAt";
    const courses = await Course.find(filter)
      .select(projection)
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(filter);

    const availableItems = courses.filter((course) => (course.enrolledCount ?? 0) < course.capacity);

    return res.json({
      data: availableItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("List available courses error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// LẤY KHÓA HỌC THEO ID
export async function getCourse(req: Request, res: Response) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        error: "Not found",
        message: "Course not found",
      });
    }

    // Cập nhật trạng thái nếu cần
    await updateCourseStatus(course.id.toString());

    // Lấy lại course sau khi cập nhật
    const updatedCourse = await Course.findById(req.params.id);
    if (!updatedCourse) {
      return res.status(404).json({
        error: "Not found",
        message: "Course not found",
      });
    }

    return res.json({ data: updatedCourse });
  } catch (err: any) {
    console.error("Get course error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// CẬP NHẬT KHÓA HỌC
export async function updateCourse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    const courseCheck = await Course.findById(id);
    if (!courseCheck) {
      return res.status(404).json({
        error: "Not found",
        message: "Course not found",
      });
    }

    if (courseCheck.status !== "not_yet") {
      return res.status(400).json({
        error: "Cannot update course",
        message: `Course status is "${courseCheck.status}". Only courses with status "not_yet" can be updated.`,
      });
    }

    delete (payload as any).enrolledCount;

    if (payload.startDate !== undefined || payload.endDate !== undefined) {
      const startDate = payload.startDate
        ? new Date(payload.startDate)
        : courseCheck.startDate || new Date();
      const endDate = payload.endDate
        ? new Date(payload.endDate)
        : courseCheck.endDate || new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: "Invalid dates",
          message: "Start date and end date must be valid dates",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          error: "Invalid date range",
          message: "Start date must be before end date",
        });
      }

      if (courseCheck.startDate && courseCheck.endDate) {
        const outOfRangeCalendars = await CourseCalendar.countDocuments({
          courseId: id,
          $or: [{ date: { $lt: startDate } }, { date: { $gt: endDate } }],
        });

        if (outOfRangeCalendars > 0) {
          return res.status(400).json({
            error: "Invalid date range",
            message: `Cannot update: ${outOfRangeCalendars} calendar events fall outside the new date range. Please reschedule or delete those events first.`,
          });
        }
      }
    }

    if (payload.capacity !== undefined) {
      if (typeof payload.capacity !== "number" || payload.capacity < 0) {
        return res.status(400).json({
          error: "capacity must be a non-negative number",
          message: "Capacity must be a non-negative number",
        });
      }

      if (payload.capacity < courseCheck.enrolledCount) {
        return res.status(400).json({
          error: "Invalid capacity",
          message: `Capacity must be >= ${courseCheck.enrolledCount} (current enrolled students)`,
        });
      }
    }

    if (payload.session !== undefined) {
      if (typeof payload.session !== "number" || payload.session < 0) {
        return res.status(400).json({
          error: "session must be >= 0",
          message: "Session must be a non-negative number",
        });
      }

      if (payload.session < courseCheck.session) {
        const newSessionCount = payload.session;
        const removedSessions = await Session.find({
          courseId: id,
          sessionOrder: { $gt: newSessionCount },
        }).select("_id");

        if (removedSessions.length > 0) {
          const removedSessionIds = removedSessions.map((s) => s._id);
          const deletedCalendars = await CourseCalendar.deleteMany({
            courseId: id,
            sessionId: { $in: removedSessionIds },
          });
          console.log(`Deleted ${deletedCalendars.deletedCount} calendar events for removed sessions`);
        }
      }
    }

    if (payload.managerId !== undefined) {
      try {
        const manager = await User.findById(payload.managerId).select("_id name");
        if (!manager) {
          return res.status(400).json({
            error: "Manager not found",
            message: "Manager not found with this ID",
          });
        }
        (payload as any).managerName = manager.name;
      } catch (idError) {
        return res.status(400).json({
          error: "Invalid managerId",
          message: "Invalid manager ID",
        });
      }
    }

    const course = await Course.findByIdAndUpdate(id, payload, { new: true });
    if (!course) {
      return res.status(404).json({
        error: "Not found",
        message: "Course not found",
      });
    }

    return res.json({
      message: "Course updated successfully",
      data: course,
    });
  } catch (error: any) {
    console.error("Update course error:", error);
    return res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
}
// LẤY KHÓA HỌC CHO STUDENT THEO courseId (chỉ trả về nếu student đã được ghi danh)
export async function getStudentCourse(req: Request, res: Response) {
  try {
    const studentId = req.id;
    const courseId = req.params.courseId;

    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized", message: "Please log in." });
    }

    if (!courseId) {
      return res.status(400).json({ error: "courseId required", message: "Missing courseId parameter." });
    }

    // Check enrollment
    const courseCheck = await Course.findById(courseId);
    if (!courseCheck) {
      return res.status(404).json({ error: "Not found", message: "Course not found" });
    }
    
    const membership = courseCheck.members?.find((m: any) => m.userId.toString() === studentId && m.role === "student" && !m.deletedAt);

    if (!membership) {
      return res.status(403).json({ error: "forbidden", message: "You are not enrolled in this course." });
    }

    // Ensure status up-to-date
    await updateCourseStatus(courseId);

    const updatedCourse = await Course.findById(courseId);
    if (!updatedCourse) {
      return res.status(404).json({ error: "Not found", message: "Course not found" });
    }
    return res.status(200).json({ data: updatedCourse });
  } catch (err: any) {
    console.error("Get student course error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
// XÓA KHÓA HỌC
export async function deleteCourse(req: Request, res: Response) {
  try {
    const courseId = req.params.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Kiểm tra: nếu course đã complete, không cho xóa
    if (course.status === "complete") {
      return res.status(400).json({
        error: "Cannot delete course",
        message: `Course status is "complete". Completed courses cannot be deleted.`
      });
    }
    // Chỉ cho xóa nếu status là "not_yet"
    if (course.status !== "not_yet" && course.status !== "in_progress") {
      return res.status(400).json({
        error: "Cannot delete course",
        message: `Course status is "${course.status}". Only courses with status "not_yet" or "in_progress" can be deleted.`
      });
    }

    // Xóa enrollment requests liên quan đến course này
    await Enrollment.deleteMany({ courseId });
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      message: "Course deleted successfully",
      details: `Deleted course, members' accounts, and enrollment requests`
    });
  } catch (err: any) {
    console.error("Delete course error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
// DANH SÁCH KHÓA HỌC CỦA SINH VIÊN
export async function listStudentCourses(req: Request, res: Response) {
  try {
    const studentId = req.id;
    if (!studentId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Unable to identify user. Please log in again.",
      });
    }

    const objectStudentId = new mongoose.Types.ObjectId(studentId);

    const coursesAll = await Course.find({ "members.userId": objectStudentId, "members.role": "student", "members.deletedAt": null }).select("_id");
    const courseIds = coursesAll.map((c) => c._id);

    if (courseIds.length === 0) {
      return res.status(200).json({
        data: [],
        total: 0,
      });
    }

    const projection = "name description status startDate endDate homeroomTeacherId homeroomTeacher capacity session createdAt";
    const courses = await Course.find({
      _id: { $in: courseIds },
    })
      .select(projection)
      .sort({ startDate: 1 });

    // Cập nhật trạng thái tất cả course
    await Promise.all(courses.map(c => updateCourseStatus(c.id.toString())));

    // Lấy lại danh sách sau khi cập nhật
    const updatedCourses = await Course.find({
      _id: { $in: courseIds },
    })
      .select(projection)
      .sort({ startDate: 1 });

    return res.status(200).json({
      data: updatedCourses,
      total: updatedCourses.length,
    });
  } catch (err: any) {
    console.error("List student courses error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
// DANH SÁCH KHÓA HỌC MÀ GIÁO VIÊN LÀM CHỦ NHIỆM
export async function listTeacherCourses(req: Request, res: Response) {
  try {
    const teacherId = req.id;
    if (!teacherId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Unable to identify user. Please log in again.",
      });
    }

    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);
    
    // Tìm khóa học mà giáo viên này là giáo viên chủ nhiệm (homeroomTeacherId)
    const projection = "name description status startDate endDate homeroomTeacherId homeroomTeacher capacity session createdAt";
    const courses = await Course.find({
      homeroomTeacherId: objectTeacherId,
    })
      .select(projection)
      .sort({ createdAt: -1 });

    // Cập nhật trạng thái tất cả course
    await Promise.all(courses.map(c => updateCourseStatus(c.id.toString())));

    // Lấy lại danh sách sau khi cập nhật
    const updatedCourses = await Course.find({
      homeroomTeacherId: objectTeacherId,
    })
      .select(projection)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      data: updatedCourses,
      total: updatedCourses.length,
    });
  } catch (err: any) {
    console.error("List teacher courses error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
// XEM DANH SÁCH SINH VIÊN TRONG LỚP MỀ GIÁO VIÊN CHỦ NHIỆM
export async function getClassMembers(req: Request, res: Response) {
  try {
    const teacherId = req.id;
    const { courseId } = req.params;

    if (!teacherId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Unable to identify user. Please log in again.",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        error: "courseId required",
        message: "Missing courseId parameter.",
      });
    }

    // Kiểm tra giáo viên có phải là chủ nhiệm của lớp này không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Not found",
        message: "Course not found",
      });
    }

    if (course.homeroomTeacherId.toString() !== teacherId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not the homeroom teacher of this class.",
      });
    }

    // Lấy danh sách sinh viên trong lớp
    const studentsArr = course.members
      .filter((m) => m.role === "student" && !m.deletedAt)
      .map((m) => m.userId);

    const students = await User.find({
      _id: { $in: studentsArr },
    }).select("_id name email role createdAt");

    return res.status(200).json({
      data: {
        course: {
          _id: course._id,
          name: course.name,
          homeroomTeacher: course.homeroomTeacher,
        },
        students,
        total: students.length,
      },
    });
  } catch (err: any) {
    console.error("Get class members error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}

// MEMBER ENDPOINTS

export const getCourseStudents = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ message: "Missing courseId." });
    const students = await CourseService.getStudentsByCourse(courseId);
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving student list.", error });
  }
};

export const getCourseTeachers = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ message: "Missing courseId." });
    const teachers = await CourseService.getTeachersByCourse(courseId);
    return res.status(200).json(teachers);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving teacher list.", error });
  }
};

export const addCourseMember = async (req: Request, res: Response) => {
  try {
    const { courseId, userId, role } = req.body;
    const member = await CourseService.addMember(courseId, userId, role);
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ message: "Error while add member.", error });
  }
};

export const deleteCourseMember = async (req: Request, res: Response) => {
  try {
    const { courseId, memberId } = req.params;
    const deletedById = req.id;
    if (!deletedById) return res.status(401).json({ message: "Please log in." });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    const user = await User.findById(memberId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "student") {
      const emailFilter = user.email || null;
      const deleteFilter: any = {
        $or: [{ userId: memberId }, { studentId: memberId }],
      };
      if (emailFilter) deleteFilter.$or.push({ studentEmail: emailFilter });
      await Enrollment.deleteMany(deleteFilter);

      if (course.status === "not_yet") {
        await User.findByIdAndDelete(memberId);
      }
    } else if (course.status === "in_progress") {
      await User.findByIdAndUpdate(memberId, { status: "locked" });
    } else if (course.status === "complete") {
      return res.status(400).json({ message: "Cannot remove member from completed course." });
    }

    const result = await CourseService.deleteCourseMember(courseId, memberId, deletedById);
    return res.status(200).json({
      message: "Member removed successfully.",
      data: result,
      userAction: course.status === "not_yet" ? "deleted" : "locked"
    });
  } catch (error) {
    return res.status(500).json({ message: "Error removing member.", error });
  }
};

export const getDeletedCourseStudents = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ message: "Missing courseId." });
    const deletedStudents = await CourseService.getDeletedStudentsByCourse(courseId);
    return res.status(200).json(deletedStudents);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving deleted students list.", error });
  }
};

export const transferStudent = async (req: Request, res: Response) => {
  try {
    const { fromCourseId, toCourseId } = req.body;
    const { studentId } = req.params;
    const transferredBy = req.id;
    
    if (!studentId || !fromCourseId || !toCourseId) {
      return res.status(400).json({ message: "Missing parameters." });
    }
    if (!transferredBy) return res.status(401).json({ message: "Please log in." });
    if (fromCourseId === toCourseId) return res.status(400).json({ message: "Same course." });

    const fromCourse = await Course.findById(fromCourseId);
    if (!fromCourse || fromCourse.status !== "not_yet") return res.status(400).json({ message: "Invalid source course." });

    const toCourse = await Course.findById(toCourseId);
    if (!toCourse || toCourse.status !== "not_yet") return res.status(400).json({ message: "Invalid destination course." });

    const result = await CourseService.transferStudent(studentId, fromCourseId, toCourseId, transferredBy);
    return res.status(200).json({ message: "Student transferred successfully.", data: result });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred while transferring the student.", error });
  }
};