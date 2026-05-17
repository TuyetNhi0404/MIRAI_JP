// src/service/profile.service.ts
import { User } from "../model/user.model";
import bcrypt from "bcrypt";
import { uploadAvatarToCloudinary, deleteFileFromCloudinary } from "./cloundinary.service";

class ProfileService {
  async getProfile(userId: string) {
    const user = await User.findById(userId).select("-password");
    return user;
  }

  async updateProfile(userId: string, data: any) {
    const { name, password, description } = data;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updateData.password = hashed;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
      "-password"
    );

    return updatedUser;
  }

  async updateUserAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new Error("No uploaded file found");

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Xóa avatar cũ nếu có
    if (user.avatar) await deleteFileFromCloudinary(user.avatar);

    // Upload mới
    const newAvatar = await uploadAvatarToCloudinary(file);

    user.avatar = newAvatar;
    await user.save();

    return { message: "Avatar updated successfully", avatar: newAvatar };
  }

  async deleteUserAvatar(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (!user.avatar) throw new Error("User does not have an avatar to delete");

    await deleteFileFromCloudinary(user.avatar);

    user.avatar = undefined;
    await user.save();

    return { message: "Avatar deleted successfully" };
  }
}

export default new ProfileService();
