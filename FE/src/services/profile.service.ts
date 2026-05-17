//  services/profile.service.ts

import imageCompression from "browser-image-compression";
import { profileApi } from "../api/profile.api";
import type { UpdateProfileRequest, Profile } from "../types/profile.types";

class ProfileService {
  // Get profile information
  async getProfile(): Promise<Profile> {
    const response = await profileApi.getProfile();
    return response.data;
  }

  // Update profile information
  async updateProfile(data: UpdateProfileRequest): Promise<Profile> {
    const response = await profileApi.updateProfile(data);
    return response.data.profile;
  }

  // Upload avatar with image compression
  async uploadAvatar(file: File): Promise<string> {
    // Check file size
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("Image is too large! Please select an image smaller than 3MB.");
    }

    // Compress image before uploading
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });

    const response = await profileApi.uploadAvatar(compressedFile);
    return response.data.avatar;
  }

  // Delete avatar
  async deleteAvatar(): Promise<void> {
    await profileApi.deleteAvatar();
  }

  // Create preview URL for image
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Revoke preview URL
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const profileService = new ProfileService();