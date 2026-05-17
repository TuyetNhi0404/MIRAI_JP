// src/services/assignmentService.ts - FIXED VERSION
import axios, { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import type { Assignment, Course, AssignmentQueryParams, AssignmentListResponse } from '../types/assignment.types';

interface ErrorResponse {
  message?: string;
}

interface CourseResponse {
  data: RawCourse[];
}

interface RawCourse {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  homeroomTeacher?: string;
  homeroomTeacherId?: string;
  capacity?: number;
  session?: number;
  enrolledCount?: number;
  createdAt?: string;
  createdBy?: string;
}

interface RawAssignment {
  _id?: string;
  id?: string;
  title?: string;
  courseId?: string;
  courseName?: string;
  course?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  maxScore?: number;
  fileUrls?: string | string[];
  createdBy?: string;
  teacherName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AllAssignmentsResponse {
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  assignments?: RawAssignment[];
}

interface AssignmentsResponse {
  assignments?: RawAssignment[];
}

interface SingleAssignmentResponse {
  assignment: RawAssignment;
}

interface CreateAssignmentResponse {
  data: RawAssignment;
  uploadedFiles?: string[];
}

interface UpdateAssignmentResponse {
  data: RawAssignment;
}

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ErrorResponse>) => {
    const msg = err.response?.data?.message || 'Server connection error';
    if (err.response?.status === 401) toast.error('Session expired, please log in again');
    else toast.error(msg);
    return Promise.reject(err);
  }
);

const normalizeFileUrls = (fileUrls: string | string[] | null | undefined): string[] => {
  if (!fileUrls) return [];
  if (Array.isArray(fileUrls)) return fileUrls;
  if (typeof fileUrls === 'string') return [fileUrls];
  return [];
};

const normalizeCourse = (c: RawCourse): Course => {
  const rawStatus = c.status || 'not_yet';
  const status: "not_yet" | "in_progress" | "complete" = 
    rawStatus === "in_progress" || rawStatus === "complete" 
      ? rawStatus 
      : "not_yet";

  return {
    id: c._id || c.id || '',
    _id: c._id || '',
    name: c.name || 'Unnamed Course',
    description: c.description || '',
    status,
    startDate: c.startDate || '',
    endDate: c.endDate || '',
    homeroomTeacher: c.homeroomTeacher || '',
    homeroomTeacherId: c.homeroomTeacherId || '',
    capacity: c.capacity || 0,
    session: c.session || 0,
    enrolledCount: c.enrolledCount || 0,
    createdAt: c.createdAt || '',
    createdBy: c.createdBy || ''
  };
};

const normalizeAssignment = (a: RawAssignment, courseId?: string): Assignment => {
  // ✅ FIX: Properly normalize status
  const rawStatus = a.status || 'draft';
  const status: "active" | "draft" | "closed" = 
    rawStatus === "active" || rawStatus === "closed" 
      ? rawStatus 
      : "draft";

  const fileUrls = normalizeFileUrls(a.fileUrls);

  const normalized: Assignment = {
    _id: a._id || a.id || '',
    id: a._id || a.id || '',
    title: a.title || '',
    courseId: a.courseId || courseId || '',
    courseName: a.courseName || a.course || '',
    description: a.description || '',
    status,
    dueDate: a.dueDate || '',
    maxScore: a.maxScore || 0,
    fileUrls, 
    createdBy: a.createdBy || '',
    teacherName: a.teacherName || '',
    createdAt: a.createdAt || '',
    updatedAt: a.updatedAt || ''
  };
  
  console.log('📦 Normalized assignment:', {
    title: normalized.title,
    fileUrls: normalized.fileUrls,
    fileUrlsLength: normalized.fileUrls?.length || 0 
  });
  
  return normalized;
};

export const assignmentService = {
  getCourses: async (): Promise<Course[]> => {
    try {
      const res = await api.get<CourseResponse>('/courses');
      const courses = res.data.data || [];
      return courses.map(normalizeCourse);
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      toast.error(error.response?.data?.message || 'Failed to load courses');
      throw e;
    }
  },

  getAllAssignments: async (params?: Omit<AssignmentQueryParams, 'courseId'>): Promise<AssignmentListResponse> => {
    try {
      const res = await api.get<AllAssignmentsResponse>('/assignments/all', { params });
      
      console.log('🔍 getAllAssignments response:', res.data);
      
      const assignments = (res.data.assignments || []).map((a) => normalizeAssignment(a));

      return {
        message: res.data.message || 'Success',
        total: res.data.total || 0,
        page: res.data.page || 1,
        limit: res.data.limit || 20,
        totalPages: res.data.totalPages || 1,
        assignments
      };
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      toast.error(error.response?.data?.message || 'Failed to load assignments');
      throw e;
    }
  },

  getAll: async ({ courseId, status, search }: AssignmentQueryParams): Promise<Assignment[]> => {
    try {
      if (!courseId) throw new Error('courseId is required');

      const res = await api.get<AssignmentsResponse>(`/assignments/get/${courseId}`, {
        params: { status: status !== 'all' ? status : undefined, search }
      });

      console.log('🔍 getAll response:', res.data);

      return (res.data.assignments || []).map((a) => normalizeAssignment(a, courseId));
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      toast.error(error.response?.data?.message || 'Failed to load assignment list');
      throw e;
    }
  },

  getOne: async (courseId: string, idOrTitle: string): Promise<Assignment> => {
    try {
      const res = await api.get<SingleAssignmentResponse>(`/assignments/get/${courseId}/${idOrTitle}`);
      return normalizeAssignment(res.data.assignment, courseId);
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      toast.error(error.response?.data?.message || 'Failed to load assignment');
      throw e;
    }
  },

  create: async (formData: {
    title: string;
    courseId: string;
    dueDate: string;
    maxScore: number;
    status: string;
    description?: string;
  }, files: File[]): Promise<Assignment> => {
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('courseId', formData.courseId);
      data.append('dueDate', formData.dueDate);
      data.append('maxScore', formData.maxScore.toString());
      data.append('status', formData.status);
      if (formData.description) data.append('description', formData.description);
      
      console.log('📤 Uploading files:', files.length);
      files.forEach((f, index) => {
        console.log(`  File ${index + 1}:`, f.name, f.size, f.type);
        data.append('files', f);
      });

      const res = await api.post<CreateAssignmentResponse>('/assignments/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Create response:', res.data);
      console.log('📎 Uploaded fileUrls:', res.data.data?.fileUrls || res.data.uploadedFiles);
      
      toast.success('Assignment created successfully');
      
      return normalizeAssignment(res.data.data);
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      console.error('❌ Create failed:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to create assignment');
      throw e;
    }
  },

  update: async (
    originalCourseId: string,
    idOrTitle: string,
    formData: {
      courseId?: string;
      title?: string;
      description?: string;
      dueDate?: string;
      maxScore?: number;
      status?: string;
    },
    newFiles: File[],
    deleteFiles: string[]
  ): Promise<Assignment> => {
    try {
      const data = new FormData();
      if (formData.courseId && formData.courseId !== originalCourseId) data.append('courseId', formData.courseId);
      if (formData.title) data.append('title', formData.title);
      if (formData.description !== undefined) data.append('description', formData.description);
      if (formData.dueDate) data.append('dueDate', formData.dueDate);
      if (formData.maxScore) data.append('maxScore', formData.maxScore.toString());
      if (formData.status) data.append('status', formData.status);
      if (deleteFiles.length > 0) data.append('deleteFiles', JSON.stringify(deleteFiles));
      
      console.log('📤 Uploading new files:', newFiles.length);
      console.log('🗑️ Deleting files:', deleteFiles.length);
      newFiles.forEach((f, index) => {
        console.log(`  New file ${index + 1}:`, f.name, f.size, f.type);
        data.append('files', f);
      });

      const res = await api.put<UpdateAssignmentResponse>(
        `/assignments/update/${originalCourseId}/${idOrTitle}`, 
        data, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('✅ Update response:', res.data);
      console.log('📎 Updated fileUrls:', res.data.data?.fileUrls);
      
      toast.success('Assignment updated successfully');
      
      return normalizeAssignment(res.data.data);
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      console.error('❌ Update failed:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update assignment');
      throw e;
    }
  },

  delete: async (courseId: string, idOrTitle: string): Promise<void> => {
    try {
      await api.delete(`/assignments/delete/${courseId}/${idOrTitle}`);
      toast.success('Assignment deleted successfully');
    } catch (e) {
      const error = e as AxiosError<ErrorResponse>;
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
      throw e;
    }
  },
};