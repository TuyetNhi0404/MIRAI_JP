import mongoose, { Document, Schema } from "mongoose";

export interface IChapter extends Document {
  name: string;
  description?: string;
}

const chapterSchema = new Schema<IChapter>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  { timestamps: true }
);

chapterSchema.index({ name: 1 }, { unique: true });

export const Chapter = mongoose.model<IChapter>("Chapter", chapterSchema);


