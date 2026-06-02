import { Request, Response } from "express";
import { AttendanceService } from "../service/attendance.service";


export const getStudentsForCalendar = async (req: Request, res: Response) => {
  try {
    // attendance.controller.ts
    const { calendarId } = req.params;
    if (!calendarId)
    return res.status(400).json({ message: "Missing calendarId" });

    const data = await AttendanceService.getStudentsForCalendar(calendarId!);


    return res.status(200).json({
      message: "Successfully retrieved attendance list",
      students: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error while retrieving attendance list",
      error: error.message,
    });
  }
};

export const updateAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { calendarId, userId } = req.params;
    const { status } = req.body as { status: string };

    const userRole = (req as any).user?.role;
    const teacherId = (req as any).user?.id;

    const updated = await AttendanceService.updateAttendance(
      calendarId,
      userId,
      status,
      userRole,
      teacherId
    );

    return res.status(200).json({
      message: "Attendance updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: "Error while updating attendance",
      error: error.message,
    });
  }
};

export const getAttendanceByStudent = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string;

    const data = await AttendanceService.getStudentAttendance(studentId);

    return res.status(200).json({
      message: "Successfully retrieved attendance history",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error while retrieving attendance history",
      error: error.message,
    });
  }
};
