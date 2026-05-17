import { Schema, model, Document } from "mongoose";

export interface IForumPost extends Document {
  authorId: Schema.Types.ObjectId;
  title: string;
  content: string;
  images: string[];
  likes: Schema.Types.ObjectId[];
  dislikes: Schema.Types.ObjectId[];
  pinned?: boolean;
  pinnedBy?: Schema.Types.ObjectId | null;
  pinnedAt?: Date | null;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const forumPostSchema = new Schema<IForumPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    images: [{ type: String, default: [] }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    pinned: { type: Boolean, default: false },
    pinnedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    pinnedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ForumPost = model<IForumPost>("ForumPost", forumPostSchema);
