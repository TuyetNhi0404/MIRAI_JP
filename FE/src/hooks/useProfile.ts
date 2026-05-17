// hooks/useProfile.ts

import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "./hooks";
import type { AppDispatch } from "../redux/store";
import {
  fetchProfile,
  updateProfile as updateProfileAction,
  uploadAvatar as uploadAvatarAction,
  deleteAvatar as deleteAvatarAction,
  clearError,
} from "../redux/slices/profileSlice";
import { setUser } from "../redux/slices/authSlice";
import type { UpdateProfileRequest } from "../types/profile.types";

export const useProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, loading, avatarUploading, error } = useAppSelector(
    (state) => state.profile
  );
  const authUser = useAppSelector((state) => state.auth.user);

  // Load profile khi component mount
  const loadProfile = useCallback(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  // Update profile info
  const updateProfileInfo = useCallback(
    async (data: UpdateProfileRequest) => {
      const result = await dispatch(updateProfileAction(data));
      if (updateProfileAction.fulfilled.match(result)) {
        // Đồng bộ với auth user
        if (authUser) {
          dispatch(setUser({ ...authUser, ...result.payload }));
        }
        return result.payload;
      }
      throw new Error(result.payload as string);
    },
    [dispatch, authUser]
  );

  // Upload avatar
  const uploadAvatar = useCallback(
    async (file: File) => {
      const result = await dispatch(uploadAvatarAction(file));
      if (uploadAvatarAction.fulfilled.match(result)) {
        // Đồng bộ với auth user
        if (authUser) {
          dispatch(setUser({ ...authUser, avatar: result.payload }));
        }
        return result.payload;
      }
      throw new Error(result.payload as string);
    },
    [dispatch, authUser]
  );

  // Delete avatar
  const deleteAvatar = useCallback(async () => {
    const result = await dispatch(deleteAvatarAction());
    if (deleteAvatarAction.fulfilled.match(result)) {
      // Đồng bộ với auth user
      if (authUser) {
        dispatch(setUser({ ...authUser, avatar: undefined }));
      }
    } else {
      throw new Error(result.payload as string);
    }
  }, [dispatch, authUser]);

  // Clear error
  const clearProfileError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    profile,
    loading,
    avatarUploading,
    error,
    loadProfile,
    updateProfileInfo,
    uploadAvatar,
    deleteAvatar,
    clearProfileError,
  };
};