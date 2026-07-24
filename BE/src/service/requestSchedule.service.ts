import { RequestSchedule } from "../model/requestSchedule.model";
import { CourseCalendar } from "../model/calendar.model";
import { RequestStatus } from "../model/requestSchedule.model";

class RequestScheduleService {

  async createRequest({
    teacherId,
    calendarId,
    reason
  }: {
    teacherId: string;
    calendarId: string;
    reason: string;
  }) {

    const calendar = await CourseCalendar.findById(calendarId);

    if (!calendar) {
      throw new Error("Không tìm thấy lịch học.");
    }

    if (String(calendar.teacherId) !== String(teacherId)) {
      throw new Error("Bạn không phải là giảng viên được phân công cho buổi học này, không thể gửi yêu cầu.");
    }
    const now = new Date().getTime();
    const classTime = new Date(calendar.date).getTime();

    const diffHours = (classTime - now) / (1000 * 60 * 60);

    if (diffHours < 24) {
      throw new Error("Yêu cầu thay đổi lịch học phải được gửi trước ít nhất 24 giờ.");
    }

    const existing = await RequestSchedule.findOne({
      calendarId,
      createdBy: teacherId,
      status: RequestStatus.PENDING,
    });

    if (existing) {
      throw new Error("Bạn đã gửi một yêu cầu thay đổi lịch học cho buổi học này và đang chờ duyệt.");
    }

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
