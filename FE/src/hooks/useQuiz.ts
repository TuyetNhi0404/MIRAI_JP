// src/hooks/useQuiz.ts
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  fetchQuizzes,
  fetchQuizzesByCourse,
  fetchStudentQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  startQuiz,
  submitQuiz,
  fetchStudentQuizHistory,
  fetchAttemptResult,
  fetchQuizStatistics,
  fetchQuizQuestions,
  clearCurrentQuiz,
  clearQuizQuestions,
  clearSubmitResult,
  clearError,
  clearStatistics,
} from "../redux/slices/quizSlice";
import type {
  CreateQuizRequest,
  UpdateQuizRequest,
  QuizSubmitRequest,
} from "../types/quiz.types";

export const useQuiz = () => {
  const dispatch = useAppDispatch();
  const {
    quizzes,
    currentQuiz,
    quizQuestions,
    attempts,
    attemptDetail,
    statistics,
    loading,
    error,
    submitResult,
    currentQuizId,
    currentStatisticsQuizId,
  } = useAppSelector((state) => state.quiz);

  const loadQuizzes = useCallback(
    (params?: { courseId?: string; chapterId?: string }) => {
      return dispatch(fetchQuizzes(params));
    },
    [dispatch]
  );

  const loadQuizzesByCourse = useCallback(
    (courseId: string) => {
      return dispatch(fetchQuizzesByCourse(courseId));
    },
    [dispatch]
  );

  const createNewQuiz = useCallback(
    (data: CreateQuizRequest) => {
      return dispatch(createQuiz(data));
    },
    [dispatch]
  );

  const updateExistingQuiz = useCallback(
    (quizId: string, data: UpdateQuizRequest) => {
      return dispatch(updateQuiz({ quizId, data }));
    },
    [dispatch]
  );

  const removeQuiz = useCallback(
    (quizId: string, createdBy?: string) => {
      return dispatch(deleteQuiz({ quizId, createdBy }));
    },
    [dispatch]
  );

  const beginQuiz = useCallback(
    (quizId: string, studentId?: string) => {
      return dispatch(startQuiz({ quizId, studentId }));
    },
    [dispatch]
  );

  const submitQuizAnswers = useCallback(
    (quizId: string, data: QuizSubmitRequest) => {
      return dispatch(submitQuiz({ quizId, data }));
    },
    [dispatch]
  );

  const loadStudentHistory = useCallback(
    (params?: { courseId?: string; studentId?: string }) => {
      return dispatch(fetchStudentQuizHistory(params));
    },
    [dispatch]
  );

  const loadAttemptResult = useCallback(
    (attemptId: string, studentId?: string) => {
      return dispatch(fetchAttemptResult({ attemptId, studentId }));
    },
    [dispatch]
  );

  const loadQuizStatistics = useCallback(
    (quizId: string, createdBy?: string) => {
      if (currentStatisticsQuizId && currentStatisticsQuizId !== quizId) {
        dispatch(clearStatistics());
      }
      return dispatch(fetchQuizStatistics({ quizId, createdBy }));
    },
    [dispatch, currentStatisticsQuizId]
  );

  const loadQuizQuestions = useCallback(
    (quizId: string, createdBy?: string, includeCorrectAnswers?: boolean) => {
      return dispatch(fetchQuizQuestions({ quizId, createdBy, includeCorrectAnswers }));
    },
    [dispatch]
  );

  const loadStudentQuizzes = useCallback(async () => {
    try {
      await dispatch(fetchStudentQuizzes()).unwrap();
    } catch (error) {
      console.error("Failed to load student quizzes:", error);
    }
  }, [dispatch]);

  const resetCurrentQuiz = useCallback(() => {
    dispatch(clearCurrentQuiz());
  }, [dispatch]);

  const resetQuizQuestions = useCallback(() => {
    dispatch(clearQuizQuestions());
  }, [dispatch]);

  const resetSubmitResult = useCallback(() => {
    dispatch(clearSubmitResult());
  }, [dispatch]);

  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const resetStatistics = useCallback(() => {
    dispatch(clearStatistics());
  }, [dispatch]);

  return {
    // State
    quizzes,
    currentQuiz,
    quizQuestions,
    attempts,
    attemptDetail,
    statistics,
    loading,
    error,
    submitResult,
    currentQuizId,
    currentStatisticsQuizId,

    // Actions
    loadQuizzes,
    loadQuizzesByCourse,
    loadStudentQuizzes,
    createNewQuiz,
    updateExistingQuiz,
    removeQuiz,
    beginQuiz,
    submitQuizAnswers,
    loadStudentHistory,
    loadAttemptResult,
    loadQuizStatistics,
    loadQuizQuestions,
    resetCurrentQuiz,
    resetQuizQuestions,
    resetSubmitResult,
    resetError,
    resetStatistics,
  };
};