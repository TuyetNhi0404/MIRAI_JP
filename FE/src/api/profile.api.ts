// api/profile.api.ts

import axiosInstance from "./axiosInstance";
import type {
  Profile,
  UpdateProfileRequest,
  ProfileUpdateResponse,
  AvatarUploadResponse,
  DeleteAvatarResponse,
} from "../types/profile.types";

export const profileApi = { 
  // GET /api/profile
  getProfile: () => {
    return axiosInstance.get<Profile>("/profile");
  },

  // PUT /api/profile
  updateProfile: (data: UpdateProfileRequest) => {
    return axiosInstance.put<ProfileUpdateResponse>("/profile", data);
  },

  // PUT /api/profile/avatar
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.put<AvatarUploadResponse>("/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // DELETE /api/profile/avatar
  deleteAvatar: () => {
    return axiosInstance.delete<DeleteAvatarResponse>("/profile/avatar");
  },
};