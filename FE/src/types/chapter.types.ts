// src/types/chapter.types.ts

export interface Chapter {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  courseId: string;
}

export interface CreateChapterRequest {
  name: string;
  description?: string;
  courseId: string;
}

export interface UpdateChapterRequest {
  name?: string;
  description?: string;
  courseId: string;
}

export interface ChapterListResponse {
  chapters: Chapter[];
}