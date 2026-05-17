// src/hooks/useGoogleAuth.ts
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useAppDispatch } from "./useAppDispatch";
import { googleLoginUser } from "../redux/slices/authSlice";
import type { User } from "../types/auth.types";

interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

export const useGoogleAuth = (config: GoogleAuthConfig) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Exchange authorization code for ID token
   */
  const exchangeCodeForToken = async (code: string): Promise<string> => {
    try {
      const data = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      });

      const response = await axios.post(
        "https://oauth2.googleapis.com/token",
        data,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const idToken = response.data.id_token;
      if (!idToken) {
        throw new Error("Không nhận được ID token từ Google");
      }

      return idToken;
    } catch (err) {
      console.error("Error exchanging code for token:", err);
      throw new Error("Lỗi khi xác thực với Google. Vui lòng thử lại.");
    }
  };

  /**
   * Initialize Google login
   */
  const login = useGoogleLogin({
    flow: "auth-code",
    scope: "openid profile email",
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);

      try {
        const code = tokenResponse.code;
        if (!code) {
          throw new Error("Không nhận được authorization code từ Google");
        }

        // Exchange code for ID token
        const idToken = await exchangeCodeForToken(code);

        // Send ID token to backend
        const result = await dispatch(googleLoginUser(idToken)).unwrap();

        setLoading(false);

        if (config.onSuccess) {
          config.onSuccess(result.user);
        }
      } catch (err) {
        console.error("Google login error:", err);

        let errorMessage = "Đăng nhập Google thất bại";

        if (err instanceof Error && err.message) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }

        setError(errorMessage);
        setLoading(false);

        // Call error callback if provided
        if (config.onError) {
          config.onError(errorMessage);
        }
      }
    },

    onError: (err: unknown) => {
      console.error("Google OAuth error:", err);

      let errorMessage = "Đăng nhập Google thất bại";

      const error = err as { error?: string; error_description?: string };

      if (error?.error === "popup_closed_by_user") {
        errorMessage = "Bạn đã đóng cửa sổ đăng nhập Google";
      } else if (error?.error === "access_denied") {
        errorMessage = "Bạn đã từ chối quyền truy cập";
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      }

      setError(errorMessage);
      setLoading(false);

      // Call error callback if provided
      if (config.onError) {
        config.onError(errorMessage);
      }
    },
  });

  return {
    login,
    loading,
    error,
    clearError: () => setError(null),
  };
};