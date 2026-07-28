import mongoose, { Document, Schema } from "mongoose";

export interface IRefreshToken {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface IRefreshTokenDocument extends IRefreshToken, Document {}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const RefreshToken = mongoose.model<IRefreshTokenDocument>(
  "RefreshToken",
  refreshTokenSchema
);
