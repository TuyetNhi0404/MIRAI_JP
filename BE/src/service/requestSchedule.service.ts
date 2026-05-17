import { RequestSchedule } from "../model/requestSchedule.model";
import { CourseCalendar } from "../model/calendar.model";
import { RequestStatus } from "../model/requestSchedule.model";

class RequestScheduleService {
  
  // ✅ SERVICE: Teacher tạo request đổi lịch
  async createRequest({
    teacherId,
    calendarId,
    reason
  }: {
    teacherId: string;
    calendarId: string;
    reason: string;
  }) {

    // 1️⃣ Lấy lịch để kiểm tra quyền + thời gian
    const calendar = await CourseCalendar.findById(calendarId);

    if (!calendar) {
      throw new Error("Calendar not found.");
    }

    // 2️⃣ Kiểm tra teacher có phải người dạy buổi này không
    if (String(calendar.teacherId) !== String(teacherId)) {
      throw new Error("You are not the assigned teacher for this session, cannot submit request.");
    }

    // 3️⃣ Kiểm tra còn ít nhất 24h mới được gửi request
    const now = new Date().getTime();
    const classTime = new Date(calendar.date).getTime();

    const diffHours = (classTime - now) / (1000 * 60 * 60);

    if (diffHours < 24) {
      throw new Error("Schedule change requests must be submitted at least 24 hours in advance.");
    }

    // 4️⃣ Không cho gửi trùng request pending
    const existing = await RequestSchedule.findOne({
      calendarId,
      createdBy: teacherId,
      status: RequestStatus.PENDING,
    });

    if (existing) {
      throw new Error("You have already submitted a schedule change request for this session that is pending approval.");
    }

    // 5️⃣ Tạo request mới
    const request = await RequestSchedule.create({
      calendarId,
      createdBy: teacherId,
      reason,
      status: RequestStatus.PENDING,
    });

    return request;
  }
}

export default new RequestScheduleService();
