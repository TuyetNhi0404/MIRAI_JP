// ==========================================
// 4. redux/slices/profileSlice.ts
// ==========================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { profileService } from "../../services/profile.service";
import type { ProfileState, UpdateProfileRequest } from "../../types/profile.types";

const initialState: ProfileState = {
  profile: null,
  loading: false,
  avatarUploading: false,
  error: null,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  "profile/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      return await profileService.getProfile();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch profile");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      return await profileService.updateProfile(data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to update profile");
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  "profile/uploadAvatar",
  async (file: File, { rejectWithValue }) => {
    try {
      return await profileService.uploadAvatar(file);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to upload avatar");
    }
  }
);

export const deleteAvatar = createAsyncThunk(
  "profile/deleteAvatar",
  async (_, { rejectWithValue }) => {
    try {
      await profileService.deleteAvatar();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to delete avatar");
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Upload Avatar
    builder
      .addCase(uploadAvatar.pending, (state) => {
        state.avatarUploading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.avatarUploading = false;
        if (state.profile) {
          state.profile.avatar = action.payload;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.avatarUploading = false;
        state.error = action.payload as string;
      });

    // Delete Avatar
    builder
      .addCase(deleteAvatar.pending, (state) => {
        state.avatarUploading = true;
        state.error = null;
      })
      .addCase(deleteAvatar.fulfilled, (state) => {
        state.avatarUploading = false;
        if (state.profile) {
          state.profile.avatar = undefined;
        }
      })
      .addCase(deleteAvatar.rejected, (state, action) => {
        state.avatarUploading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setProfile } = profileSlice.actions;
export default profileSlice.reducer;
