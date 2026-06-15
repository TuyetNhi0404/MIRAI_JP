import { CourseCalendar } from "../model/calendar.model";

class CourseCalendarService {
  async getByFilter(filter: any) {
    return await CourseCalendar.find(filter)
      .populate("sessionId", "sessionName startTime endTime")
      .populate("courseId", "courseName enrolledCount capacity")
      .populate("teacherId", "fullName email")
      .lean();
  }
}

export default new CourseCalendarService();
