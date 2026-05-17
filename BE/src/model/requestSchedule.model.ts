import mongoose, { Schema, Document } from "mongoose";

export enum RequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface IRequestSchedule extends Document {
  calendarId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId; // teacher
  reason: string;
  status: RequestStatus;
}

const RequestScheduleSchema = new Schema<IRequestSchedule>(
    {
        calendarId: { type: Schema.Types.ObjectId, ref: "CourseCalendar", required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: Object.values(RequestStatus),
            default: RequestStatus.PENDING,
        },
    },
    { timestamps: true }
);
export const RequestSchedule = mongoose.model<IRequestSchedule>(
    "RequestSchedule",
    RequestScheduleSchema
);
