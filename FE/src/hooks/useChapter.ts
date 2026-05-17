// src/hooks/useChapter.ts
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  fetchAllChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  clearError,
} from "../redux/slices/chapterSlice";
import type { CreateChapterRequest, UpdateChapterRequest } from "../types/chapter.types";

export const useChapter = () => {
  const dispatch = useAppDispatch();
  const { chapters, loading, error } = useAppSelector((state) => state.chapter);

  const loadAllChapters = useCallback(() => {
    return dispatch(fetchAllChapters());
  }, [dispatch]);

  const createNewChapter = useCallback(
    (data: CreateChapterRequest) => {
      return dispatch(createChapter(data));
    },
    [dispatch]
  );

  const updateExistingChapter = useCallback(
    (id: string, data: UpdateChapterRequest) => {
      return dispatch(updateChapter({ id, data }));
    },
    [dispatch]
  );

  const removeChapter = useCallback(
    (id: string) => {
      return dispatch(deleteChapter(id));
    },
    [dispatch]
  );

  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    chapters,
    loading,
    error,
    // Actions
    loadAllChapters,
    createNewChapter,
    updateExistingChapter,
    removeChapter,
    resetError,
  };
};