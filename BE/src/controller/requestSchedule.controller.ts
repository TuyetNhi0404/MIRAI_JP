import { Request, Response } from "express";
import { RequestSchedule, RequestStatus } from "../model/requestSchedule.model";
import { CourseCalendar } from "../model/calendar.model";
import RequestScheduleService from "../service/requestSchedule.service";
import NotificationService from "../service/notification.service";
import { User } from "../model/user.model";

class RequestScheduleController {

  // ✅ 1. Teacher gửi request (chỉ trước 24h)
  async createRequest(req: Request, res: Response) {
    try {
      const teacherId = req.id;
      const { calendarId, reason } = req.body;

      if (!calendarId || !reason) {
        return res.status(400).json({ message: "Missing calendarId or reason." });
      }

      // Gọi service xử lý logic chính
      const result = await RequestScheduleService.createRequest({
        teacherId: teacherId!,
        calendarId,
        reason
      });

      // ✅ SEND NOTIFICATION TO ALL ADMINS
      try {
        const teacher = await User.findById(teacherId).select("name");

        if (teacher) {
          await NotificationService.notifyScheduleRequest({
            teacherId: teacherId!,
            teacherName: teacher.name,
            calendarId,
            reason,
            requestId: (result._id as any).toString(),
          });
        }
      } catch (notifErr) {
        console.error("⚠️ Error sending schedule request notification:", notifErr);
      }

      return res.status(201).json({
        message: "Schedule-change request submitted successfully.",
        data: result
      });

    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }


  // ✅ 2. Teacher xem tất cả request của mình
  async getMyRequests(req: Request, res: Response) {
    try {
      const teacherId = req.id;

      const result = await RequestSchedule.find({ createdBy: teacherId })
        .populate("calendarId");

      return res.status(200).json(result);

    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ✅ 3. Admin xem tất cả request (lọc theo status)
  async getAllRequests(req: Request, res: Response) {
    try {
      const { status } = req.query;

      const filter: any = {};
      if (status) filter.status = status;

      const result = await RequestSchedule.find(filter)
        .populate({
          path: "calendarId",
          populate: [
            { path: "sessionId" },
            { path: "courseId" },
          ],
        })
        .populate("createdBy", "name email");


      return res.status(200).json(result);

    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }


  // ✅ 4. Admin accept request
  async acceptRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const request = await RequestSchedule.findById(requestId).select("createdBy");
      if (!request) {
        return res.status(404).json({ message: "Request not found." });
      }
      const updated = await RequestSchedule.findByIdAndUpdate(
        requestId,
        { status: RequestStatus.ACCEPTED },
        { new: true }
      );

      // ✅ SEND NOTIFICATION TO TEACHER
      try {
        await NotificationService.notifyScheduleResponse({
          teacherId: (request.createdBy as any).toString(),
          status: "accepted",
          requestId: requestId!,
        });
      } catch (notifErr) {
        console.error("⚠️ Error sending schedule response notification:", notifErr);
      }

      if (!updated) {
        return res.status(404).json({ message: "Request not found." });
      }

      return res.status(200).json({
        message: "Request approved successfully.",
        data: updated
      });

    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }


  // ✅ 6. Admin reject request
  async rejectRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const request = await RequestSchedule.findById(requestId).select("createdBy");
      if (!request) {
        return res.status(404).json({ message: "Request not found." });
      }
      const updated = await RequestSchedule.findByIdAndUpdate(
        requestId,
        { status: RequestStatus.REJECTED },
        { new: true }
      );

      // ✅ SEND NOTIFICATION TO TEACHER
      try {
        await NotificationService.notifyScheduleResponse({
          teacherId: (request.createdBy as any).toString(),
          status: "rejected",
          requestId: requestId!,
        });
      } catch (notifErr) {
        console.error("⚠️ Error sending schedule response notification:", notifErr);
      }

      if (!updated) {
        return res.status(404).json({ message: "Request not found." });
      }

      return res.status(200).json({
        message: "Request rejected successfully.",
        data: updated
      });

    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
}

export default new RequestScheduleController();
