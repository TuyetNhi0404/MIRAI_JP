import { Schema, model, Document, Types } from "mongoose";

export interface IForumBan extends Document {
    userId: Types.ObjectId;
    count: number;              // số lần bài bị reject
    blocked: boolean;           // có đang bị chặn hay không
    permanent: boolean;         // ban vĩnh viễn hay không
    bannedUntil?: Date | null;  // ngày hết hạn ban (nếu ban tạm thời)
    reason?: string;            // lý do hiển thị cho user
}

const forumBanSchema = new Schema<IForumBan>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        count: { type: Number, default: 0 },
        blocked: { type: Boolean, default: false },
        permanent: { type: Boolean, default: false },
        bannedUntil: { type: Date, default: null },
        reason: { type: String, default: "" },
    },
    { timestamps: true }
);

export const ForumBan = model<IForumBan>("ForumBan", forumBanSchema);
