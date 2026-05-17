import { Schema, model, Types, Document } from "mongoose";

export interface IForumReply extends Document {
  commentId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  images?: string[];
  likes?: Types.ObjectId[];
  dislikes?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const forumReplySchema = new Schema<IForumReply>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: "ForumComment", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    images: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const ForumReply = model<IForumReply>("ForumReply", forumReplySchema, "forumreply");
