// src/hooks/useEnrollment.ts
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  enrollCourse,
  fetchEnrollments,
  approveEnrollment,
  rejectEnrollment,
  clearError,
} from "../redux/slices/enrollmentSlice";
import type { EnrollmentRequest } from "../types/enrollment.types";

export const useEnrollment = () => {
  const dispatch = useAppDispatch();
  const { enrollments, loading, error } = useAppSelector(
    (state) => state.enrollment
  );

  // Đăng ký khóa học
  const handleEnrollCourse = useCallback(
    async (data: EnrollmentRequest) => {
      try {
        const result = await dispatch(enrollCourse(data)).unwrap();
        return { success: true, data: result };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Enrollment failed";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch]
  );

  // Fetch enrollments
  const handleFetchEnrollments = useCallback(
    async (status: string = "") => {
      try {
        const result = await dispatch(fetchEnrollments(status)).unwrap();
        return { success: true, data: result };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Fetch failed";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch]
  );

  // Duyệt đơn đăng ký
  const handleApproveEnrollment = useCallback(
    async (enrollmentId: string) => {
      try {
        const result = await dispatch(approveEnrollment(enrollmentId)).unwrap();
        return { success: true, data: result };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Approval failed";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch]
  );

  // Từ chối đơn đăng ký
  const handleRejectEnrollment = useCallback(
    async (enrollmentId: string) => {
      try {
        const result = await dispatch(rejectEnrollment(enrollmentId)).unwrap();
        return { success: true, data: result };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Rejection failed";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch]
  );

  // Clear error message
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    enrollments,
    loading,
    error,

    // Actions
    enrollCourse: handleEnrollCourse,
    fetchEnrollments: handleFetchEnrollments,
    approveEnrollment: handleApproveEnrollment,
    rejectEnrollment: handleRejectEnrollment,
    clearError: handleClearError,
  };
};
