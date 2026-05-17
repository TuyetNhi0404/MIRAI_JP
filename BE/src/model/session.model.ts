import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  sessionName: string;
  startTime: string;
  endTime: string;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionName: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>("Session", SessionSchema);
