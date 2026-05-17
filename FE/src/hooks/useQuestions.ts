// src/hooks/useQuestions.ts
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../redux/store";
import {
  fetchChapters,
  fetchQuestionsByChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  setSelectedChapter,
  clearError,
} from "../redux/slices/questionSlice";
import type { CreateChapterPayload, UpdateChapterPayload, CreateQuestionPayload, UpdateQuestionPayload } from "../types/question.types";

export const useQuestions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { chapters, questions, selectedChapter, loading, error } = useSelector(
    (state: RootState) => state.question
  );

  useEffect(() => {
    dispatch(fetchChapters());
  }, [dispatch]);

  const handleSelectChapter = (chapterId: string) => {
    const chapter = chapters.find(c => c._id === chapterId);
    if (chapter) {
      dispatch(setSelectedChapter(chapter));
      dispatch(fetchQuestionsByChapter(chapterId));
    }
  };

  const handleCreateChapter = async (payload: CreateChapterPayload) => {
    await dispatch(createChapter(payload)).unwrap();
  };

  const handleUpdateChapter = async (id: string, payload: UpdateChapterPayload) => {
    await dispatch(updateChapter({ id, payload })).unwrap();
  };

  const handleDeleteChapter = async (id: string) => {
    await dispatch(deleteChapter(id)).unwrap();
  };

  const handleCreateQuestion = async (payload: CreateQuestionPayload) => {
    await dispatch(createQuestion(payload)).unwrap();
  };

  const handleUpdateQuestion = async (id: string, payload: UpdateQuestionPayload) => {
    await dispatch(updateQuestion({ id, payload })).unwrap();
  };

  const handleDeleteQuestion = async (id: string) => {
    await dispatch(deleteQuestion(id)).unwrap();
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    chapters,
    questions,
    selectedChapter,
    loading,
    error,
    handleSelectChapter,
    handleCreateChapter,
    handleUpdateChapter,
    handleDeleteChapter,
    handleCreateQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleClearError,
  };
};