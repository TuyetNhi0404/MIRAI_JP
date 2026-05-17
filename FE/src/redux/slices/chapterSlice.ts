// src/redux/slices/chapterSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { chapterApi } from "../../api/chapter.axios";
import type { Chapter, CreateChapterRequest, UpdateChapterRequest } from "../../types/chapter.types";

interface ChapterState {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
}

const initialState: ChapterState = {
  chapters: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchAllChapters = createAsyncThunk(
  "chapter/fetchAllChapters",
  async (_, { rejectWithValue }) => {
    try {
      const response = await chapterApi.getAllChapters();
      return response.data.chapters;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch chapters");
    }
  }
);

export const createChapter = createAsyncThunk(
  "chapter/createChapter",
  async (data: CreateChapterRequest, { rejectWithValue }) => {
    try {
      const response = await chapterApi.createChapter(data);
      return response.data.chapter;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to create chapter");
    }
  }
);

export const updateChapter = createAsyncThunk(
  "chapter/updateChapter",
  async (
    { id, data }: { id: string; data: UpdateChapterRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await chapterApi.updateChapter(id, data);
      return response.data.chapter;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to update chapter");
    }
  }
);

export const deleteChapter = createAsyncThunk(
  "chapter/deleteChapter",
  async (id: string, { rejectWithValue }) => {
    try {
      await chapterApi.deleteChapter(id);
      return id;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to delete chapter");
    }
  }
);

const chapterSlice = createSlice({
  name: "chapter",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all chapters
      .addCase(fetchAllChapters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllChapters.fulfilled, (state, action: PayloadAction<Chapter[]>) => {
        state.loading = false;
        state.chapters = action.payload;
      })
      .addCase(fetchAllChapters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create chapter
      .addCase(createChapter.fulfilled, (state, action: PayloadAction<Chapter>) => {
        state.chapters.unshift(action.payload);
      })
      // Update chapter
      .addCase(updateChapter.fulfilled, (state, action: PayloadAction<Chapter>) => {
        const index = state.chapters.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.chapters[index] = action.payload;
        }
      })
      // Delete chapter
      .addCase(deleteChapter.fulfilled, (state, action: PayloadAction<string>) => {
        state.chapters = state.chapters.filter((c) => c._id !== action.payload);
      });
  },
});

export const { clearError } = chapterSlice.actions;
export default chapterSlice.reducer;