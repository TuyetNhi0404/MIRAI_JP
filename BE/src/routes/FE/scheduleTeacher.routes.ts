// mock-backend/routes/scheduleRoutes.ts
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const dataFile = path.join(__dirname, "../../data/scheduleTeacher.json");

// Hàm tiện ích đọc & ghi file JSON
const readData = () => JSON.parse(fs.readFileSync(dataFile, "utf-8"));
const writeData = (data: any) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// ============================================
// GET /api/teacher/schedule - Lấy lịch theo tuần
// ============================================
router.get("/schedule", (req, res) => {
  try {
    const { teacherId, weekStart } = req.query;
    
    if (!teacherId || !weekStart) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing teacherId or weekStart" 
      });
    }

    const data = readData();
    const startDate = new Date(weekStart as string);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Filter schedules
    const schedules = data.courseCalendar
      .filter((cal: any) => {
        const calDate = new Date(cal.date);
        return (
          cal.teacherId === Number.parseInt(teacherId as string) &&
          calDate >= startDate &&
          calDate <= endDate
        );
      })
      .map((cal: any) => {
        const course = data.courses.find((c: any) => c.courseId === cal.courseId);
        const session = data.sessions.find((s: any) => s.sessionId === cal.sessionId);
        const request = data.requestSchedule.find((r: any) => r.calendarId === cal.calendarId);

        return {
          ...cal,
          courseName: course?.courseName || '',
          sessionName: session?.sessionName || '',
          startTime: session?.startTime || '',
          endTime: session?.endTime || '',
          request
        };
      })
      .sort((a: any, b: any) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.sessionId - b.sessionId;
      });

    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching schedule", error: err });
  }
});

// ============================================
// GET /api/teacher/schedule/all - Lấy tất cả lịch
// ============================================
router.get("/schedule/all", (req, res) => {
  try {
    const { teacherId } = req.query;
    
    if (!teacherId) {
      return res.status(400).json({ success: false, message: "Missing teacherId" });
    }

    const data = readData();
    const schedules = data.courseCalendar
      .filter((cal: any) => cal.teacherId === Number.parseInt(teacherId as string))
      .map((cal: any) => {
        const course = data.courses.find((c: any) => c.courseId === cal.courseId);
        const session = data.sessions.find((s: any) => s.sessionId === cal.sessionId);
        const request = data.requestSchedule.find((r: any) => r.calendarId === cal.calendarId);

        return {
          ...cal,
          courseName: course?.courseName || '',
          sessionName: session?.sessionName || '',
          startTime: session?.startTime || '',
          endTime: session?.endTime || '',
          request
        };
      });

    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching schedules", error: err });
  }
});

// ============================================
// POST /api/teacher/request-schedule - Tạo yêu cầu nghỉ
// ============================================
router.post("/request-schedule", (req, res) => {
  try {
    const { calendarId, reason, teacherId } = req.body;

    if (!calendarId || !reason || !teacherId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    const data = readData();

    // Kiểm tra calendar tồn tại
    const calendar = data.courseCalendar.find((c: any) => c.calendarId === calendarId);
    if (!calendar) {
      return res.status(404).json({ success: false, message: "Calendar not found" });
    }

    // Kiểm tra đã có request chưa
    const existingRequest = data.requestSchedule.find((r: any) => r.calendarId === calendarId);
    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: "Request already exists for this schedule" 
      });
    }

    const newRequest = {
      requestId: Math.max(...data.requestSchedule.map((r: any) => r.requestId), 0) + 1,
      calendarId,
      reason,
      status: "pending",
      createdBy: teacherId,
      createdAt: new Date().toISOString()
    };

    data.requestSchedule.push(newRequest);
    writeData(data);

    res.status(201).json({ success: true, data: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating request", error: err });
  }
});


router.get("/requests", (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: "Missing teacherId" });
    }

    const data = readData();
    const requests = data.requestSchedule
      .filter((req: any) => req.createdBy === Number.parseInt(teacherId as string))
      .map((req: any) => {
        const calendar = data.courseCalendar.find((c: any) => c.calendarId === req.calendarId);
        const course = data.courses.find((c: any) => c.courseId === calendar?.courseId);
        const session = data.sessions.find((s: any) => s.sessionId === calendar?.sessionId);

        return {
          ...req,
          calendar,
          courseName: course?.courseName,
          sessionName: session?.sessionName,
          date: calendar?.date
        };
      })
      .sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching requests", error: err });
  }
});

// ============================================
// DELETE /api/teacher/request/:requestId - Hủy request
// ============================================
router.delete("/request/:requestId", (req, res) => {
  try {
    const requestId = Number.parseInt(req.params.requestId);
    const data = readData();

    const request = data.requestSchedule.find((r: any) => r.requestId === requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Can only cancel pending requests" 
      });
    }

    // Xóa request
    data.requestSchedule = data.requestSchedule.filter((r: any) => r.requestId !== requestId);
    writeData(data);

    res.json({ success: true, message: "Request cancelled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error cancelling request", error: err });
  }
});

// ============================================
// GET /api/sessions - Lấy danh sách sessions
// ============================================
router.get("/sessions", (req, res) => {
  try {
    const data = readData();
    res.json({ success: true, data: data.sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching sessions", error: err });
  }
});

// ============================================
// GET /api/courses - Lấy danh sách courses
// ============================================
router.get("/courses", (req, res) => {
  try {
    const data = readData();
    res.json({ success: true, data: data.courses });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching courses", error: err });
  }
});

// ============================================
// GET /api/teacher/schedule/stats - Thống kê
// ============================================
router.get("/schedule/stats", (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: "Missing teacherId" });
    }

    const data = readData();
    const schedules = data.courseCalendar.filter(
      (cal: any) => cal.teacherId === Number.parseInt(teacherId as string)
    );

    const stats = {
      total: schedules.length,
      scheduled: schedules.filter((s: any) => s.status === 'scheduled').length,
      completed: schedules.filter((s: any) => s.status === 'completed').length,
      cancelled: schedules.filter((s: any) => s.status === 'cancelled').length,
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching stats", error: err });
  }
});

export default router;