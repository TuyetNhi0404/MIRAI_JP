
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  status: "active" | "locked";
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
}

export interface ToggleStatusResponse {
  message: string;
  user: User;
}

export interface GetAllUsersResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  users: User[];
}