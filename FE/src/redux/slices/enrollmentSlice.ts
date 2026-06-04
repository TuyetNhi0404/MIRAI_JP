// src/redux/slices/enrollmentSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { enrollmentService } from "../../services/enrollment.service";
import type { Enrollment, EnrollmentRequest } from "../../types/enrollment.types";

interface EnrollmentState {
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
}

const initialState: EnrollmentState = {
  enrollments: [],
  loading: false,
  error: null,
};

// Type guard cho Axios errors
interface AxiosErrorResponse {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
}

function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error
  );
}

// Đăng ký khóa học
export const enrollCourse = createAsyncThunk(
  "enrollment/enrollCourse",
  async (data: EnrollmentRequest, { rejectWithValue }) => {
    try {
      const response = await enrollmentService.enrollCourse(data);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to enroll"
        );
      }
      return rejectWithValue("Failed to enroll");
    }
  }
);

// Lấy tất cả đơn đăng ký
export const fetchEnrollments = createAsyncThunk(
  "enrollment/fetchAll",
  async (status: string = "", { rejectWithValue }) => {
    try {
      const response = await enrollmentService.getAllEnrollments(
        status || undefined
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to fetch enrollments"
        );
      }
      return rejectWithValue("Failed to fetch enrollments");
    }
  }
);

// Duyệt đơn đăng ký
export const approveEnrollment = createAsyncThunk(
  "enrollment/approve",
  async (enrollmentId: string, { rejectWithValue }) => {
    try {
      const response = await enrollmentService.approveEnrollment(enrollmentId);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to approve"
        );
      }
      return rejectWithValue("Failed to approve");
    }
  }
);

// Từ chối đơn đăng ký
export const rejectEnrollment = createAsyncThunk(
  "enrollment/reject",
  async (enrollmentId: string, { rejectWithValue }) => {
    try {
      const response = await enrollmentService.rejectEnrollment(enrollmentId);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to reject"
        );
      }
      return rejectWithValue("Failed to reject");
    }
  }
);

const enrollmentSlice = createSlice({
  name: "enrollment",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Enroll course
      .addCase(enrollCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enrollCourse.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(enrollCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch enrollments
      .addCase(fetchEnrollments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEnrollments.fulfilled,
        (state, action: PayloadAction<Enrollment[]>) => {
          state.loading = false;
          state.enrollments = action.payload;
        }
      )
      .addCase(fetchEnrollments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Approve enrollment
      .addCase(
        approveEnrollment.fulfilled,
        (state, action: PayloadAction<Enrollment>) => {
          const index = state.enrollments.findIndex(
            (e) => e._id === action.payload._id
          );
          if (index !== -1) {
            state.enrollments[index] = action.payload;
          }
        }
      )
      .addCase(approveEnrollment.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Reject enrollment
      .addCase(
        rejectEnrollment.fulfilled,
        (state, action: PayloadAction<Enrollment>) => {
          const index = state.enrollments.findIndex(
            (e) => e._id === action.payload._id
          );
          if (index !== -1) {
            state.enrollments[index] = action.payload;
          }
        }
      )
      .addCase(rejectEnrollment.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = enrollmentSlice.actions;
export default enrollmentSlice.reducer;
