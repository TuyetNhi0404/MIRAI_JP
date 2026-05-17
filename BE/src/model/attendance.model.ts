import mongoose, { Schema, Document } from "mongoose";

export enum AttendanceStatus {
  NOT_YET = "not_yet",
  ABSENT = "absent",
  PRESENT = "present",
}

export interface IAttendance extends Document {
  calendarId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    calendarId: { type: Schema.Types.ObjectId, ref: "CourseCalendar", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.NOT_YET,
    },
  },
  { timestamps: true }
);

export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema
);
