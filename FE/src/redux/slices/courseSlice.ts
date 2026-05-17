// src/redux/slices/courseSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { courseApi } from "../../api/course.axios";
import type {
  Course,
  HomeroomTeacher,
  CourseWithStudents,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "../../types/course.types";

interface CourseState {
  courses: Course[];
  availableCourses: Course[];
  currentCourse: Course | null;
  homeroomTeachers: HomeroomTeacher[];
  enrolledStudents: CourseWithStudents | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

const initialState: CourseState = {
  courses: [],
  availableCourses: [],
  currentCourse: null,
  homeroomTeachers: [],
  enrolledStudents: null,
  loading: false,
  error: null,
  pagination: null,
};

// Async thunks
export const fetchAllCourses = createAsyncThunk(
  "course/fetchAllCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await courseApi.getAllCourses();
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch courses");
    }
  }
);

export const fetchAvailableCourses = createAsyncThunk(
  "course/fetchAvailableCourses",
  async (
    params: { page?: number; limit?: number; q?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await courseApi.getAvailableCourses(params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch available courses");
    }
  }
);

export const fetchCourseById = createAsyncThunk(
  "course/fetchCourseById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await courseApi.getCourseById(id);
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch course");
    }
  }
);

export const createCourse = createAsyncThunk(
  "course/createCourse",
  async (data: CreateCourseRequest, { rejectWithValue }) => {
    try {
      const response = await courseApi.createCourse(data);
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to create course");
    }
  }
);

export const updateCourse = createAsyncThunk(
  "course/updateCourse",
  async (
    { id, data }: { id: string; data: UpdateCourseRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await courseApi.updateCourse(id, data);
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to update course");
    }
  }
);

export const deleteCourse = createAsyncThunk(
  "course/deleteCourse",
  async (id: string, { rejectWithValue }) => {
    try {
      await courseApi.deleteCourse(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to delete course");
    }
  }
);

export const fetchEnrolledStudents = createAsyncThunk(
  "course/fetchEnrolledStudents",
  async (courseId: string, { rejectWithValue }) => {
    try {
      const response = await courseApi.getEnrolledStudents(courseId);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch enrolled students");
    }
  }
);

export const fetchHomeroomTeachers = createAsyncThunk(
  "course/fetchHomeroomTeachers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await courseApi.getHomeroomTeachers();
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch homeroom teachers");
    }
  }
);

const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {
    clearCurrentCourse: (state) => {
      state.currentCourse = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all courses
      .addCase(fetchAllCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchAllCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch available courses
      .addCase(fetchAvailableCourses.fulfilled, (state, action) => {
        state.availableCourses = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      // Fetch course by ID
      .addCase(fetchCourseById.fulfilled, (state, action: PayloadAction<Course>) => {
        state.currentCourse = action.payload;
      })
      // Create course
      .addCase(createCourse.fulfilled, (state, action: PayloadAction<Course>) => {
        state.courses.unshift(action.payload);
      })
      // Update course
      .addCase(updateCourse.fulfilled, (state, action: PayloadAction<Course>) => {
        const index = state.courses.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
      })
      // Delete course
      .addCase(deleteCourse.fulfilled, (state, action: PayloadAction<string>) => {
        state.courses = state.courses.filter((c) => c._id !== action.payload);
      })
      // Fetch enrolled students
      .addCase(fetchEnrolledStudents.fulfilled, (state, action: PayloadAction<CourseWithStudents>) => {
        state.enrolledStudents = action.payload;
      })
      // Fetch homeroom teachers
      .addCase(fetchHomeroomTeachers.fulfilled, (state, action: PayloadAction<HomeroomTeacher[]>) => {
        state.homeroomTeachers = action.payload;
      });
  },
});

export const { clearCurrentCourse, clearError } = courseSlice.actions;
export default courseSlice.reducer;