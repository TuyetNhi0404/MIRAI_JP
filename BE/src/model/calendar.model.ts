import mongoose, { Schema, Document } from "mongoose";

export enum CalendarStatus {
  NOT_YET = "not_yet",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum AttendanceStatus {
  NOT_YET = "not_yet",
  ABSENT = "absent",
  PRESENT = "present",
}

export interface ICourseCalendar extends Document {
  courseId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  date: Date;
  note?: string;
  status: CalendarStatus;
  createdAt: Date;
  updatedAt: Date;
  attendances: {
    _id?: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    status: AttendanceStatus;
  }[];
}

const CourseCalendarSchema = new Schema<ICourseCalendar>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    note: { type: String },
    status: {
      type: String,
      enum: Object.values(CalendarStatus),
      default: CalendarStatus.NOT_YET,
    },
    attendances: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: {
          type: String,
          enum: Object.values(AttendanceStatus),
          default: AttendanceStatus.NOT_YET,
        },
      },
    ],
  },
  { timestamps: true }
);

export const CourseCalendar = mongoose.model<ICourseCalendar>(
  "CourseCalendar",
  CourseCalendarSchema
);
