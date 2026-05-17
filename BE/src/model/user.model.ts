  import mongoose, { Document, Schema, model } from "mongoose";
  import { UserRole, UserStatus } from "../enum/user.enum"
  export interface IUser {
    name: string;
    email: string;
    password: string;
    role: "admin" | "teacher" | "student";
    avatar?: string;
    status: "active" | "locked";
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
  }

  export interface IUserDocument extends IUser, Document {}

  const userSchema = new Schema<IUserDocument>(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String },
      role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.STUDENT,
      },
      avatar: String,
    status: {
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.ACTIVE,
      },
      description: { type: String },
      lastLogin: { type: Date, default: null },
    },
    { timestamps: true }
  );

  // userSchema.set("toJSON", {
  //   transform: function (doc, ret: any) {
  //     ret.id = ret._id;
  //     delete ret._id;
  //     delete ret.__v;
  //     delete ret.password;
  //     return ret;
  //   },
  // });

  export const User = mongoose.model<IUserDocument>("User", userSchema);
