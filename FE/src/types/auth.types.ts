// src/types/auth.types.ts

export type UserRoleType = "admin" | "teacher" | "student";
export type UserStatusType = "active" | "locked";

export const UserRole = {
  ADMIN: "admin" as const,
  TEACHER: "teacher" as const,
  STUDENT: "student" as const,
};

export const UserStatus = {
  ACTIVE: "active" as const,
  LOCKED: "locked" as const,
};

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRoleType;
  status?: UserStatusType;
  description?: string;
  lastLogin?: Date;
}

export interface AuthResponse {
  user: User;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  token: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}