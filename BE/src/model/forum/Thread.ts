import { Schema, model, Document, Types } from "mongoose";

export interface IThread extends Document {
  title: string;
  content: string;
  author: Types.ObjectId;
  comments: Types.ObjectId[];
  reactions: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const threadSchema = new Schema<IThread>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    reactions: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export default model<IThread>("Thread", threadSchema);
