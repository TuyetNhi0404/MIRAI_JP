// src/controller/profile.controller.ts
import { Request, Response } from "express";
import profileService from "../service/profile.service";

class ProfileController {
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.id; // Lấy từ middleware verifyToken
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const profile = await profileService.getProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const updated = await profileService.updateProfile(userId, req.body);
      res.json({ message: "Profile updated successfully", profile: updated });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }

  async updateAvatar(req: Request, res: Response) {
    try {
      const userId = req.id;
      const file = req.file;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const updatedUser = await profileService.updateUserAvatar(userId, file!);

      return res.json({
        message: "Avatar updated successfully ✅",
        avatar: updatedUser.avatar,
      });
    } catch (error: any) {
      console.error("❌ Error updating avatar:", error);
      return res.status(400).json({ message: error.message });
    }
  }

  async deleteAvatar(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await profileService.deleteUserAvatar(userId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error deleting avatar:", error);
      return res.status(400).json({ message: error.message });
    }
  }
}

export default new ProfileController();
