import mongoose, { Schema, Document } from "mongoose";

export interface IReaction extends Document {
  userId: mongoose.Types.ObjectId;
  threadId: number;
  replyId?: number | null;
  type: "like" | "heart" | "sad";
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    threadId: { type: Number, required: true, index: true },
    replyId: { type: Number, default: null, index: true },
    type: { type: String, enum: ["like", "heart", "sad"], required: true },
  },
  { timestamps: true }
);

ReactionSchema.index({ userId: 1, threadId: 1, replyId: 1 }, { unique: true });

export default mongoose.model<IReaction>("Reaction", ReactionSchema);
