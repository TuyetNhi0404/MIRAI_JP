// src/redux/slices/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import authService from "../../services/auth.service";
import type {
  AuthState,
  User,
  LoginCredentials,
  RegisterCredentials,
} from "../../types/auth.types";

// Initialize state from cookies
const initialUser = Cookies.get("user") ? JSON.parse(Cookies.get("user")!) : null;
const initialAccessToken = Cookies.get("accessToken") || null;
const initialRefreshToken = Cookies.get("refreshToken") || null;

const initialState: AuthState = {
  user: initialUser,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  loading: false,
  error: null,
};

// Async Thunks

/**
 * Register new user
 */
export const registerUser = createAsyncThunk(
  "auth/register",
  async (credentials: RegisterCredentials, thunkAPI) => {
    try {
      const response = await authService.register(credentials);
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || "Đăng ký thất bại";
      console.error("Register error:", errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

/**
 * Login with email and password
 */
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, thunkAPI) => {
    try {
      const response = await authService.login(credentials);
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || "Đăng nhập thất bại";
      console.error("Login error:", errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

/**
 * Login with Google
 */
export const googleLoginUser = createAsyncThunk(
  "auth/googleLogin",
  async (idToken: string, thunkAPI) => {
    try {
      const response = await authService.googleLogin(idToken);
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      // Extract error message from backend response
      let errorMessage = "Đăng nhập Google thất bại";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      console.error("Google login error:", errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

/**
 * Refresh access token
 */
export const refreshAccessToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, thunkAPI) => {
    try {
      const response = await authService.refreshToken();
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || "Làm mới token thất bại";
      console.error("Refresh token error:", errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

/**
 * Logout user
 */
export const logoutUser = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    await authService.logout();
    return true;
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = err.response?.data?.message || "Đăng xuất thất bại";
    console.error("Logout error:", errorMessage);
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      Cookies.set("user", JSON.stringify(action.payload), { expires: 7 });
    },
    clearError: (state) => {
      state.error = null;
    },
    forceLogout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      Cookies.remove("user");
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { user, accessToken, refreshToken } = action.payload;
        state.user = user;
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.loading = false;
        state.error = null;

        // Save to cookies
        Cookies.set("user", JSON.stringify(user), { expires: 7 });
        Cookies.set("accessToken", accessToken, { expires: 1 }); // 1 day
        Cookies.set("refreshToken", refreshToken, { expires: 7 }); // 7 days
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Google Login
      .addCase(googleLoginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLoginUser.fulfilled, (state, action) => {
        const { user, accessToken, refreshToken } = action.payload;
        state.user = user;
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.loading = false;
        state.error = null;

        // Save to cookies
        Cookies.set("user", JSON.stringify(user), { expires: 7 });
        Cookies.set("accessToken", accessToken, { expires: 1 });
        Cookies.set("refreshToken", refreshToken, { expires: 7 });
      })
      .addCase(googleLoginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error("Google login rejected in Redux:", action.payload);
      })

      // Refresh Token
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.error = null;
        Cookies.set("accessToken", action.payload.accessToken, { expires: 1 });
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.error("Refresh token failed:", action.payload);
        // If refresh fails, force logout
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = action.payload as string;
        Cookies.remove("user");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      })

      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.loading = false;
        state.error = null;

        // Clear cookies
        Cookies.remove("user");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;

        // Even if logout fails on server, clear local state
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        Cookies.remove("user");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      });
  },
});

export const { setUser, clearError, forceLogout } = authSlice.actions;
export default authSlice.reducer;