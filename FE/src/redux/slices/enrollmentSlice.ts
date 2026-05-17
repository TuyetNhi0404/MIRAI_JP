// src/redux/slices/enrollmentSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { enrollmentService } from "../../services/enrollment.service";
import type { Enrollment, CVInfo } from "../../types/enrollment.types";

interface EnrollmentState {
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  uploadedCV: CVInfo | null;
  uploadLoading: boolean;
}

const initialState: EnrollmentState = {
  enrollments: [],
  loading: false,
  error: null,
  uploadedCV: null,
  uploadLoading: false,
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

// Upload CV và quét bằng AI
export const uploadCV = createAsyncThunk(
  "enrollment/uploadCV",
  async (file: File, { rejectWithValue }) => {
    try {
      const response = await enrollmentService.uploadCV(file);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.error || "Failed to upload CV"
        );
      }
      return rejectWithValue("Failed to upload CV");
    }
  }
);

// Đăng ký khóa học
export const enrollCourse = createAsyncThunk(
  "enrollment/enrollCourse",
  async (
    data: { courseId: string; cvInfo: CVInfo; file?: File },
    { rejectWithValue }
  ) => {
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
    clearUploadedCV: (state) => {
      state.uploadedCV = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload CV
      .addCase(uploadCV.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadCV.fulfilled, (state, action: PayloadAction<CVInfo>) => {
        state.uploadLoading = false;
        state.uploadedCV = action.payload;
      })
      .addCase(uploadCV.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload as string;
      })
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

export const { clearUploadedCV, clearError } = enrollmentSlice.actions;
export default enrollmentSlice.reducer;