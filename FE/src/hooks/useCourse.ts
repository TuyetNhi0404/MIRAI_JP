// src/hooks/useCourse.ts
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  fetchAllCourses,
  fetchAvailableCourses,
  fetchCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchEnrolledStudents,
  fetchHomeroomTeachers,
  clearCurrentCourse,
  clearError,
} from "../redux/slices/courseSlice";
import type { CreateCourseRequest, UpdateCourseRequest } from "../types/course.types";

export const useCourse = () => {
  const dispatch = useAppDispatch();
  const {
    courses,
    availableCourses,
    currentCourse,
    homeroomTeachers,
    enrolledStudents,
    loading,
    error,
    pagination,
  } = useAppSelector((state) => state.course);

  const loadAllCourses = useCallback(() => {
    return dispatch(fetchAllCourses());
  }, [dispatch]);

  const loadAvailableCourses = useCallback(
    (params?: { page?: number; limit?: number; q?: string }) => {
      return dispatch(fetchAvailableCourses(params));
    },
    [dispatch]
  );

  const loadCourseById = useCallback(
    (id: string) => {
      return dispatch(fetchCourseById(id));
    },
    [dispatch]
  );

  const createNewCourse = useCallback(
    (data: CreateCourseRequest) => {
      return dispatch(createCourse(data));
    },
    [dispatch]
  );

  const updateExistingCourse = useCallback(
    (id: string, data: UpdateCourseRequest) => {
      return dispatch(updateCourse({ id, data }));
    },
    [dispatch]
  );

  const removeCourse = useCallback(
    (id: string) => {
      return dispatch(deleteCourse(id));
    },
    [dispatch]
  );

  const loadEnrolledStudents = useCallback(
    (courseId: string) => {
      return dispatch(fetchEnrolledStudents(courseId));
    },
    [dispatch]
  );

  const loadHomeroomTeachers = useCallback(() => {
    return dispatch(fetchHomeroomTeachers());
  }, [dispatch]);

  const resetCurrentCourse = useCallback(() => {
    dispatch(clearCurrentCourse());
  }, [dispatch]);

  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    courses,
    availableCourses,
    currentCourse,
    homeroomTeachers,
    enrolledStudents,
    loading,
    error,
    pagination,
    // Actions
    loadAllCourses,
    loadAvailableCourses,
    loadCourseById,
    createNewCourse,
    updateExistingCourse,
    removeCourse,
    loadEnrolledStudents,
    loadHomeroomTeachers,
    resetCurrentCourse,
    resetError,
  };
};