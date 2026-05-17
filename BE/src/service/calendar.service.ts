import { CourseCalendar } from "../model/calendar.model";

class CourseCalendarService {
  // 📅 Lấy danh sách lịch học trong 1 tuần (từ startDate -> endDate)
  async getByFilter(filter: any) {
    return await CourseCalendar.find(filter)
      .populate("sessionId", "sessionName startTime endTime")
      .populate("courseId", "courseName")
      .populate("teacherId", "fullName email")
      .lean();
  }
}

export default new CourseCalendarService();
