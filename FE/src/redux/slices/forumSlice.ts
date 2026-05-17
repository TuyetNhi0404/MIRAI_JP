// FSA/src/redux/slices/forumSlice.ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as svc from '../../services/forum.service';
import type { ForumThread } from '../../types/forum.type';

interface ForumState {
  threads: ForumThread[];
  loading: boolean;
  error?: string | null;
}

const initialState: ForumState = { threads: [], loading: false, error: null };

export const fetchThreads = createAsyncThunk('forum/fetchThreads', async (currentUserId?: string) => {
  const data = await svc.getThreads(currentUserId);
  return data as ForumThread[];
});

export const createNewThread = createAsyncThunk(
  'forum/createThread',
  async (payload: { title: string; content: string; images?: File[] }, { rejectWithValue }) => {
    try {
      const res = await svc.createThread(payload);
      return res as ForumThread;
    } catch (error: unknown) {
      // Truyền error message từ backend, đặc biệt là message từ banStatus.reason
      // Backend trả về: { message: banStatus.reason } khi 403
      // handleError throw lại AxiosError, nên error.response.data.message sẽ có giá trị
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tạo bài viết. Vui lòng thử lại.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const pinPost = createAsyncThunk(
  'forum/pinPost',
  async (postId: string) => {
    await svc.pinPost(postId);
    return postId;
  }
);

export const unpinPost = createAsyncThunk(
  'forum/unpinPost',
  async (postId: string) => {
    await svc.unpinPost(postId);
    return postId;
  }
);

const forumSlice = createSlice({
  name: 'forum',
  initialState,
  reducers: {
    // nếu cần reducers đồng bộ, thêm ở đây
    setThreads(state, action: PayloadAction<ForumThread[]>) {
      state.threads = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action: PayloadAction<ForumThread[]>) => {
        state.loading = false;
        state.threads = action.payload;
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load threads';
      })
      .addCase(createNewThread.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewThread.fulfilled, (state) => {
        state.loading = false;
        // Không thêm bài viết pending vào danh sách - chỉ hiển thị sau khi được duyệt
        // if (action.payload.status === "approved") {
        //   state.threads.unshift(action.payload);
        // }
      })
      .addCase(createNewThread.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create thread';
      })
      .addCase(pinPost.fulfilled, (state, action) => {
        const postId = action.payload;
        const thread = state.threads.find((t) => String(t.threadId) === postId);
        if (thread) {
          thread.pinned = true;
        }
      })
      .addCase(unpinPost.fulfilled, (state, action) => {
        const postId = action.payload;
        const thread = state.threads.find((t) => String(t.threadId) === postId);
        if (thread) {
          thread.pinned = false;
        }
      });
  },
});

export const { setThreads } = forumSlice.actions;
export default forumSlice.reducer;
