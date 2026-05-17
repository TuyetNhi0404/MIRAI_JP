// src/redux/slices/questionSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import questionService from "../../services/question.service";
import type { IChapter, IQuestion, CreateChapterPayload, UpdateChapterPayload, CreateQuestionPayload, UpdateQuestionPayload } from "../../types/question.types";

interface QuestionState {
  chapters: IChapter[];
  questions: IQuestion[];
  selectedChapter: IChapter | null;
  loading: boolean;
  error: string | null;
}

const initialState: QuestionState = {
  chapters: [],
  questions: [],
  selectedChapter: null,
  loading: false,
  error: null,
};

// ========== CHAPTER THUNKS ==========
export const fetchChapters = createAsyncThunk(
  "question/fetchChapters",
  async (_, { rejectWithValue }) => {
    try {
      return await questionService.getAllChapters();
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const createChapter = createAsyncThunk(
  "question/createChapter",
  async (payload: CreateChapterPayload, { rejectWithValue }) => {
    try {
      return await questionService.createChapter(payload);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const updateChapter = createAsyncThunk(
  "question/updateChapter",
  async ({ id, payload }: { id: string; payload: UpdateChapterPayload }, { rejectWithValue }) => {
    try {
      return await questionService.updateChapter(id, payload);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const deleteChapter = createAsyncThunk(
  "question/deleteChapter",
  async (id: string, { rejectWithValue }) => {
    try {
      await questionService.deleteChapter(id);
      return id;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

// ========== QUESTION THUNKS ==========
export const fetchQuestionsByChapter = createAsyncThunk(
  "question/fetchQuestionsByChapter",
  async (chapterId: string, { rejectWithValue }) => {
    try {
      return await questionService.getQuestionsByChapter(chapterId);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const createQuestion = createAsyncThunk(
  "question/createQuestion",
  async (payload: CreateQuestionPayload, { rejectWithValue }) => {
    try {
      return await questionService.createQuestion(payload);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const updateQuestion = createAsyncThunk(
  "question/updateQuestion",
  async ({ id, payload }: { id: string; payload: UpdateQuestionPayload }, { rejectWithValue }) => {
    try {
      return await questionService.updateQuestion(id, payload);
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

export const deleteQuestion = createAsyncThunk(
  "question/deleteQuestion",
  async (id: string, { rejectWithValue }) => {
    try {
      await questionService.deleteQuestion(id);
      return id;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message);
    }
  }
);

// ========== SLICE ==========
const questionSlice = createSlice({
  name: "question",
  initialState,
  reducers: {
    setSelectedChapter: (state, action: PayloadAction<IChapter | null>) => {
      state.selectedChapter = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch chapters
    builder
      .addCase(fetchChapters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChapters.fulfilled, (state, action) => {
        state.loading = false;
        state.chapters = action.payload;
      })
      .addCase(fetchChapters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create chapter
    builder
      .addCase(createChapter.fulfilled, (state, action) => {
        state.chapters.unshift(action.payload);
      });

    // Update chapter
    builder
      .addCase(updateChapter.fulfilled, (state, action) => {
        const index = state.chapters.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.chapters[index] = action.payload;
        }
        if (state.selectedChapter?._id === action.payload._id) {
          state.selectedChapter = action.payload;
        }
      });

    // Delete chapter
    builder
      .addCase(deleteChapter.fulfilled, (state, action) => {
        state.chapters = state.chapters.filter(c => c._id !== action.payload);
        if (state.selectedChapter?._id === action.payload) {
          state.selectedChapter = null;
          state.questions = [];
        }
      });

    // Fetch questions by chapter
    builder
      .addCase(fetchQuestionsByChapter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestionsByChapter.fulfilled, (state, action) => {
        state.loading = false;
        state.questions = action.payload;
      })
      .addCase(fetchQuestionsByChapter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create question
    builder
      .addCase(createQuestion.fulfilled, (state, action) => {
        state.questions.unshift(action.payload);
      });

    // Update question
    builder
      .addCase(updateQuestion.fulfilled, (state, action) => {
        const index = state.questions.findIndex(q => q._id === action.payload._id);
        if (index !== -1) {
          state.questions[index] = action.payload;
        }
      });

    // Delete question
    builder
      .addCase(deleteQuestion.fulfilled, (state, action) => {
        state.questions = state.questions.filter(q => q._id !== action.payload);
      });
  },
});

export const { setSelectedChapter, clearError } = questionSlice.actions;
export default questionSlice.reducer;