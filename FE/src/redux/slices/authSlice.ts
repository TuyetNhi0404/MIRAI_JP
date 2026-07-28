// src/redux/slices/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import authService from "../../services/auth.service";
import type {
  AuthState,
  User,
  LoginCredentials,
  RegisterCredentials,
} from "../../types/auth.types";

// Initialize state from localStorage
const storedUser = localStorage.getItem("user");
const initialUser = storedUser ? JSON.parse(storedUser) : null;

// Clean legacy tokens from localStorage if present
localStorage.removeItem("accessToken");
localStorage.removeItem("refreshToken");

const initialState: AuthState = {
  user: initialUser,
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
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    clearError: (state) => {
      state.error = null;
    },
    forceLogout: (state) => {
      state.user = null;
      state.error = null;
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
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
        const { user } = action.payload;
        state.user = user;
        state.loading = false;
        state.error = null;

        localStorage.setItem("user", JSON.stringify(user));
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
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
        const { user } = action.payload;
        state.user = user;
        state.loading = false;
        state.error = null;

        localStorage.setItem("user", JSON.stringify(user));
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .addCase(googleLoginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error("Google login rejected in Redux:", action.payload);
      })

      // Refresh Token
      .addCase(refreshAccessToken.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.error("Refresh token failed:", action.payload);
        state.user = null;
        state.error = action.payload as string;
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })

      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null;

        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;

        state.user = null;
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  },
});

export const { setUser, clearError, forceLogout } = authSlice.actions;
export default authSlice.reducer;