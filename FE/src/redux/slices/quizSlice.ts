// src/redux/slices/quizSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import quizService from "../../services/quiz.service";
import type {
  Quiz,
  QuizWithAttempt,
  QuizStartResponse,
  QuizSubmitResponse,
  QuizAttempt,
  AttemptDetailResponse,
  QuizStatistics,
  QuizQuestionsResponse,
  CreateQuizRequest,
  UpdateQuizRequest,
  QuizSubmitRequest,
} from "../../types/quiz.types";

interface QuizState {
  quizzes: (Quiz | QuizWithAttempt)[];
  currentQuiz: QuizStartResponse | null;
  quizQuestions: QuizQuestionsResponse | null;
  attempts: QuizAttempt[];
  attemptDetail: AttemptDetailResponse | null;
  statistics: QuizStatistics | null;
  loading: boolean;
  error: string | null;
  submitResult: QuizSubmitResponse | null;
  currentQuizId: string | null;
  currentStatisticsQuizId: string | null;
  currentQuizQuestionsId: string | null;
}

const initialState: QuizState = {
  quizzes: [],
  currentQuiz: null,
  quizQuestions: null,
  attempts: [],
  attemptDetail: null,
  statistics: null,
  loading: false,
  error: null,
  submitResult: null,
  currentQuizId: null,
  currentStatisticsQuizId: null,
  currentQuizQuestionsId: null,
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
      message?: string;
    };

    return axiosError.response?.data?.message || axiosError.message || 'An unknown error occurred';
  }

  return 'An unknown error occurred';
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchQuizzes = createAsyncThunk(
  "quiz/fetchQuizzes",
  async (
    params: { courseId?: string; chapterId?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await quizService.getQuizzes(params);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch quizzes");
    }
  }
);

export const fetchQuizzesByCourse = createAsyncThunk(
  "quiz/fetchQuizzesByCourse",
  async (courseId: string, { rejectWithValue }) => {
    try {
      return await quizService.getQuizzesByCourse(courseId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch quizzes");
    }
  }
);

export const fetchStudentQuizzes = createAsyncThunk(
  "quiz/fetchStudentQuizzes",
  async (_, { rejectWithValue }) => {
    try {
      return await quizService.getStudentQuizzes();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch student quizzes");
    }
  }
);

export const createQuiz = createAsyncThunk(
  "quiz/createQuiz",
  async (data: CreateQuizRequest, { rejectWithValue }) => {
    try {
      console.log('🎯 Redux: Creating quiz with data:', JSON.stringify(data, null, 2));
      return await quizService.createQuiz(data);
    } catch (error: unknown) {
      console.error('❌ Redux: Create quiz failed:', error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateQuiz = createAsyncThunk(
  "quiz/updateQuiz",
  async (
    { quizId, data }: { quizId: string; data: UpdateQuizRequest },
    { rejectWithValue }
  ) => {
    try {
      return await quizService.updateQuiz(quizId, data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to update quiz");
    }
  }
);

export const deleteQuiz = createAsyncThunk(
  "quiz/deleteQuiz",
  async (
    { quizId, createdBy }: { quizId: string; createdBy?: string },
    { rejectWithValue }
  ) => {
    try {
      await quizService.deleteQuiz(quizId, createdBy);
      return quizId;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to delete quiz");
    }
  }
);

export const startQuiz = createAsyncThunk(
  "quiz/startQuiz",
  async (
    { quizId, studentId }: { quizId: string; studentId?: string },
    { rejectWithValue }
  ) => {
    try {
      const quiz = await quizService.startQuiz(quizId, studentId);
      return { quiz, quizId };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to start quiz");
    }
  }
);

export const submitQuiz = createAsyncThunk(
  "quiz/submitQuiz",
  async (
    { quizId, data }: { quizId: string; data: QuizSubmitRequest },
    { rejectWithValue }
  ) => {
    try {
      return await quizService.submitQuiz(quizId, data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to submit quiz");
    }
  }
);

export const fetchStudentQuizHistory = createAsyncThunk(
  "quiz/fetchStudentQuizHistory",
  async (
    params: { courseId?: string; studentId?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await quizService.getStudentQuizHistory(params);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch history");
    }
  }
);

export const fetchAttemptResult = createAsyncThunk(
  "quiz/fetchAttemptResult",
  async (
    { attemptId, studentId }: { attemptId: string; studentId?: string },
    { rejectWithValue }
  ) => {
    try {
      return await quizService.getAttemptResult(attemptId, studentId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch result");
    }
  }
);

export const fetchQuizStatistics = createAsyncThunk(
  "quiz/fetchQuizStatistics",
  async (
    { quizId, createdBy }: { quizId: string; createdBy?: string },
    { rejectWithValue }
  ) => {
    try {
      const statistics = await quizService.getQuizStatistics(quizId, createdBy);
      return { statistics, quizId };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch statistics");
    }
  }
);

export const fetchQuizQuestions = createAsyncThunk(
  "quiz/fetchQuizQuestions",
  async (
    { quizId, createdBy, includeCorrectAnswers }: { quizId: string; createdBy?: string; includeCorrectAnswers?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const result = await quizService.getQuizQuestions(quizId, createdBy, includeCorrectAnswers);
      return { ...result, quizId };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch quiz questions");
    }
  }
);

// ============================================
// SLICE
// ============================================

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    clearCurrentQuiz: (state) => {
      state.currentQuiz = null;
      state.currentQuizId = null;
    },
    clearQuizQuestions: (state) => {
      state.quizQuestions = null;
      state.currentQuizQuestionsId = null;
    },
    clearSubmitResult: (state) => {
      state.submitResult = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearStatistics: (state) => {
      state.statistics = null;
      state.currentStatisticsQuizId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ============================================
      // FETCH QUIZZES
      // ============================================
      .addCase(fetchQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuizzes.fulfilled, (state, action: PayloadAction<Quiz[]>) => {
        state.loading = false;
        state.quizzes = action.payload;
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH QUIZZES BY COURSE
      // ============================================
      .addCase(fetchQuizzesByCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuizzesByCourse.fulfilled, (state, action: PayloadAction<Quiz[]>) => {
        state.loading = false;
        state.quizzes = action.payload;
      })
      .addCase(fetchQuizzesByCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH STUDENT QUIZZES
      // ============================================
      .addCase(fetchStudentQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentQuizzes.fulfilled, (state, action: PayloadAction<QuizWithAttempt[]>) => {
        state.loading = false;
        state.quizzes = action.payload;
      })
      .addCase(fetchStudentQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // CREATE QUIZ
      // ============================================
      .addCase(createQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createQuiz.fulfilled, (state, action: PayloadAction<Quiz>) => {
        state.loading = false;
        state.quizzes.push(action.payload as QuizWithAttempt);
      })
      .addCase(createQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // UPDATE QUIZ
      // ============================================
      .addCase(updateQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateQuiz.fulfilled, (state, action: PayloadAction<Quiz>) => {
        state.loading = false;
        const index = state.quizzes.findIndex((q) => q._id === action.payload._id);
        if (index !== -1) {
          state.quizzes[index] = { ...state.quizzes[index], ...action.payload };
        }
      })
      .addCase(updateQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // DELETE QUIZ
      // ============================================
      .addCase(deleteQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteQuiz.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.quizzes = state.quizzes.filter((q) => q._id !== action.payload);
      })
      .addCase(deleteQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // START QUIZ
      // ============================================
      .addCase(startQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startQuiz.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuiz = action.payload.quiz;
        state.currentQuizId = action.payload.quizId;
      })
      .addCase(startQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // SUBMIT QUIZ
      // ============================================
      .addCase(submitQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitQuiz.fulfilled, (state, action: PayloadAction<QuizSubmitResponse>) => {
        state.loading = false;
        state.submitResult = action.payload;
      })
      .addCase(submitQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH STUDENT QUIZ HISTORY
      // ============================================
      .addCase(fetchStudentQuizHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentQuizHistory.fulfilled, (state, action: PayloadAction<QuizAttempt[]>) => {
        state.loading = false;
        state.attempts = action.payload;
      })
      .addCase(fetchStudentQuizHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH ATTEMPT RESULT
      // ============================================
      .addCase(fetchAttemptResult.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttemptResult.fulfilled, (state, action: PayloadAction<AttemptDetailResponse>) => {
        state.loading = false;
        state.attemptDetail = action.payload;
      })
      .addCase(fetchAttemptResult.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH QUIZ STATISTICS
      // ============================================
      .addCase(fetchQuizStatistics.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (state.currentStatisticsQuizId && state.currentStatisticsQuizId !== action.meta.arg.quizId) {
          state.statistics = null;
        }
      })
      .addCase(fetchQuizStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload.statistics;
        state.currentStatisticsQuizId = action.payload.quizId;
      })
      .addCase(fetchQuizStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ============================================
      // FETCH QUIZ QUESTIONS
      // ============================================
      .addCase(fetchQuizQuestions.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (state.currentQuizQuestionsId && state.currentQuizQuestionsId !== action.meta.arg.quizId) {
          state.quizQuestions = null;
        }
      })
      .addCase(fetchQuizQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.quizQuestions = {
          quiz: action.payload.quiz,
          questions: action.payload.questions,
        };
        state.currentQuizQuestionsId = action.payload.quizId;
      })
      .addCase(fetchQuizQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.quizQuestions = null;
      });
  },
});

export const {
  clearCurrentQuiz,
  clearQuizQuestions,
  clearSubmitResult,
  clearError,
  clearStatistics,
} = quizSlice.actions;

export default quizSlice.reducer;

export type { QuizState };