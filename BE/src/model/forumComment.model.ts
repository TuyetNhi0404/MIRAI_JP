import { Schema, model, Types, Document } from "mongoose";

export interface IForumComment extends Document {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  images?: string[];
  likes?: Types.ObjectId[];
  dislikes?: Types.ObjectId[];
  parentId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    images: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    parentId: { type: Schema.Types.ObjectId, ref: "ForumComment", default: null },
  },
  { timestamps: true }
);

export const ForumComment = model<IForumComment>(
  "ForumComment",
  forumCommentSchema,
  "forumcomment"
);
