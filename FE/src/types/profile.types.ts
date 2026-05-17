// ==========================================
// 1. types/profile.types.ts
// ==========================================

export interface Profile {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "admin" | "teacher" | "student";
  status: "active" | "locked";
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string;
  password?: string;
}

export interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  avatarUploading: boolean;
  error: string | null;
}

export interface AvatarUploadResponse {
  message: string;
  avatar: string;
}

export interface ProfileUpdateResponse {
  message: string;
  profile: Profile;
}

export interface DeleteAvatarResponse {
  message: string;
}