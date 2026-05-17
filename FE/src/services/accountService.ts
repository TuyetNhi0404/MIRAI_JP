// src/services/accountService.ts
import type { CreateUserData, ToggleStatusResponse } from '../types/account.types';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const userService = {
  async getAll() {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to fetch users:", text);
      throw new Error("Failed to fetch users");
    }
    return response.json();
  },

  async create(data: CreateUserData) {
    const response = await fetch(`${API_URL}/api/admin/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Failed to create user");
    }
    return response.json();
  },

  async toggleStatus(userId: string, newStatus: "active" | "locked"): Promise<ToggleStatusResponse> {
    if (!userId) throw new Error("Missing userId");
    
    const endpoint = newStatus === "locked"
      ? `${API_URL}/api/admin/lock/${userId}`
      : `${API_URL}/api/admin/unlock/${userId}`;

    console.log("🔵 Endpoint:", endpoint);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      let errBody;
      try {
        errBody = await response.json();
      } catch {
        errBody = await response.text();
      }
      console.error("❌ toggleStatus error:", errBody);
      throw new Error((errBody && errBody.message) || "Failed to update user status");
    }

    return response.json();
  },
};