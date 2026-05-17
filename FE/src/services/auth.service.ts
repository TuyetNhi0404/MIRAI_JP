// src/services/auth.service.ts
import axiosInstance from "../api/axiosConfig";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  GoogleLoginPayload,
} from "../types/auth.types";
import type { AxiosResponse } from "axios";

class AuthService {
  private readonly AUTH_ENDPOINT = "/auth";

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<AxiosResponse<AuthResponse>> {
    return axiosInstance.post(`${this.AUTH_ENDPOINT}/register`, credentials);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> {
    return axiosInstance.post(`${this.AUTH_ENDPOINT}/login`, credentials);
  }

  /**
   * Login with Google ID token
   */
  async googleLogin(idToken: string): Promise<AxiosResponse<AuthResponse>> {
    const payload: GoogleLoginPayload = { token: idToken };
    return axiosInstance.post(`${this.AUTH_ENDPOINT}/google`, payload);
  }

  /**
   * Refresh access token using refresh token from cookie
   */
  async refreshToken(): Promise<AxiosResponse<{ accessToken: string }>> {
    return axiosInstance.post(`${this.AUTH_ENDPOINT}/refresh-token`, {});
  }

  /**
   * Logout user and clear cookies
   */
  async logout(): Promise<AxiosResponse<{ message: string }>> {
    return axiosInstance.post(`${this.AUTH_ENDPOINT}/logout`, {});
  }
}

export const authService = new AuthService();
export default authService;