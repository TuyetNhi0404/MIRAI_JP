// src/redux/store.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import forumReducer from "./slices/forumSlice";
import questionReducer from "./slices/questionSlice";
import enrollmentReducer from "./slices/enrollmentSlice";
import quizReducer from "./slices/quizSlice";
import courseReducer from "./slices/courseSlice";
import chapterReducer from "./slices/chapterSlice";
import profileReducer from "./slices/profileSlice";

// ✅ QUAN TRỌNG: Đảm bảo các reducer được import đúng
const rootReducer = combineReducers({
  auth: authReducer,
  forum: forumReducer,
  question: questionReducer,
  enrollment: enrollmentReducer,
  quiz: quizReducer,
  course: courseReducer,
  chapter: chapterReducer,
  profile: profileReducer,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/loginUser/fulfilled", "auth/googleLoginUser/fulfilled"],
        ignoredActionPaths: ["payload.timestamp"],
        ignoredPaths: ["auth.user.lastLogin"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;