import axios from 'axios';
import { toast } from 'react-toastify';
import type Submission from '../types/Grade';
import type { GradeSubmissionData } from '../types/Grade';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

interface PopulatedStudent {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
}

interface PopulatedAssignment {
  _id?: string;
  id?: string;
  title?: string;
  createdBy?: string | { _id?: string };
  courseId?: string | PopulatedCourse;
}

interface PopulatedCourse {
  _id?: string;
  id?: string;
  name?: string;
}

interface PopulatedGradedBy {
  _id?: string;
}

interface RawSubmission {
  _id?: string;
  id?: string;
  studentId?: string | PopulatedStudent;
  assignmentId?: string | PopulatedAssignment;
  courseId?: string | PopulatedCourse;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'submitted' | 'graded' | 'pending';
  files?: string[];
  fileUrls?: string[];
  fileUrl?: string;
  score?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string | PopulatedGradedBy;
  note?: string;
  comment?: string;
}

interface ApiResponse<T> {
  data?: T;
  submission?: T;
  submissions?: T;
  items?: T;
  result?: T;
}

interface AssignmentDetailsResponse {
  data?: unknown;
  assignment?: unknown;
}

api.interceptors.response.use(
  (res) => res,
  (err: ApiError) => {
    const msg = err.response?.data?.message || 'Server connection error';
    if (err.response?.status === 401) {
      toast.error('Session expired, please log in again');
    } else {
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

const normalizeSubmission = (s: RawSubmission): Submission => {
  let studentName = 'Unknown Student';
  let studentEmail = 'no-email@example.com';
  let studentId = '';

  if (s.studentId) {
    if (typeof s.studentId === 'object') {
      const student = s.studentId as PopulatedStudent;
      studentId = student._id || student.id || '';
      studentName = student.name || student.fullName || 'Unknown Student';
      studentEmail = student.email || 'no-email@example.com';
    } else {
      studentId = s.studentId;
    }
  }

  let assignmentTitle = 'Unknown Assignment';
  let assignmentId = '';
  let assignmentCreatedBy = '';

  if (s.assignmentId) {
    if (typeof s.assignmentId === 'object') {
      const assignment = s.assignmentId as PopulatedAssignment;
      assignmentId = assignment._id || assignment.id || '';
      assignmentTitle = assignment.title || 'Unknown Assignment';
      
      if (assignment.createdBy) {
        if (typeof assignment.createdBy === 'object') {
          assignmentCreatedBy = assignment.createdBy._id || '';
        } else {
          assignmentCreatedBy = assignment.createdBy;
        }
      }
    } else {
      assignmentId = s.assignmentId;
    }
  }

  let courseId = '';
  let courseName = '';

  if (s.courseId) {
    if (typeof s.courseId === 'object') {
      const course = s.courseId as PopulatedCourse;
      courseId = course._id || '';
      courseName = course.name || '';
    } else {
      courseId = s.courseId;
    }
  } else if (s.assignmentId && typeof s.assignmentId === 'object') {
    const assignment = s.assignmentId as PopulatedAssignment;
    if (assignment.courseId) {
      if (typeof assignment.courseId === 'object') {
        const course = assignment.courseId as PopulatedCourse;
        courseId = course._id || '';
        courseName = course.name || '';
      } else {
        courseId = assignment.courseId;
      }
    }
  }

  // Xác định status với type-safe
  const status: 'submitted' | 'graded' | 'pending' = 
    s.status === 'graded' || s.status === 'pending'
      ? s.status 
      : 'submitted';

  return {
    _id: s._id || s.id || '',
    studentId,
    studentName,
    studentEmail,
    assignmentId,
    assignmentTitle,
    assignmentCreatedBy,
    courseId,
    courseName,
    submittedAt: s.submittedAt || s.createdAt || new Date().toISOString(),
    status,
    fileUrls: Array.isArray(s.files) ? s.files :
              Array.isArray(s.fileUrls) ? s.fileUrls :
              s.fileUrl ? [s.fileUrl] : [],
    score: s.score !== undefined && s.score !== null ? s.score : undefined,
    feedback: s.feedback || '',
    gradedAt: s.gradedAt || '',
    gradedBy: typeof s.gradedBy === 'object' 
      ? (s.gradedBy as PopulatedGradedBy)?._id || '' 
      : s.gradedBy || '',
    comment: s.note || s.comment || '',
    graded: status === 'graded' || s.score !== undefined,
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString()
  };
};

export const GradeService = {
  getByAssignment: async (assignmentId: string): Promise<Submission[]> => {
    try {
      console.log('🔍 Fetching submissions for assignment:', assignmentId);

      const response = await api.get<ApiResponse<RawSubmission[]>>(`/submissions/assignment/${assignmentId}`);
      
      console.log('✅ Response received:', response.data);

      let data: RawSubmission[] = [];
      const payload = response.data;
      
      if (Array.isArray(payload)) {
        data = payload;
      } else if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) {
          data = payload.data;
        } else if (Array.isArray(payload.submissions)) {
          data = payload.submissions;
        } else if (Array.isArray(payload.items)) {
          data = payload.items;
        } else if (Array.isArray(payload.result)) {
          data = payload.result;
        }
      }

      console.log('📦 Raw submissions fetched:', data.length);

      return data.map(normalizeSubmission);
    } catch (e) {
      const error = e as ApiError;
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load submissions';
      console.error('❌ Error fetching submissions:', errorMsg);
      toast.error(errorMsg);
      throw e;
    }
  },

  gradeSubmission: async (
    submissionId: string,
    data: GradeSubmissionData
  ): Promise<Submission> => {
    try {
      console.log('📝 Grading submission:', submissionId, data);
      const response = await api.put<ApiResponse<RawSubmission>>(`/submissions/${submissionId}/grade`, data);
      toast.success('Grade saved successfully!');
      
      let submission: RawSubmission;
      if (response.data.submission) {
        submission = response.data.submission;
      } else if (response.data.data) {
        submission = response.data.data;
      } else {
        submission = response.data as unknown as RawSubmission;
      }
      
      return normalizeSubmission(submission);
    } catch (e) {
      const error = e as ApiError;
      const errorMsg = error.response?.data?.message || 'Failed to save grade';
      console.error('❌ Error grading submission:', errorMsg);
      
      if (error.response?.status === 403) {
        toast.error('You can only grade assignments you created');
      } else {
        toast.error(errorMsg);
      }
      throw e;
    }
  },

  getOne: async (submissionId: string): Promise<Submission> => {
    try {
      console.log('🔍 Fetching submission:', submissionId);
      const response = await api.get<ApiResponse<RawSubmission>>(`/submissions/${submissionId}`);
      
      let submission: RawSubmission;
      if (response.data.data) {
        submission = response.data.data;
      } else if (response.data.submission) {
        submission = response.data.submission;
      } else {
        submission = response.data as unknown as RawSubmission;
      }
      
      return normalizeSubmission(submission);
    } catch (e) {
      const error = e as ApiError;
      const errorMsg = error.response?.data?.message || 'Failed to load submission';
      console.error('❌ Error fetching submission:', errorMsg);
      toast.error(errorMsg);
      throw e;
    }
  },

  downloadFile: async (fileUrl: string): Promise<void> => {
    try {
      console.log('📥 Downloading file:', fileUrl);
      const fileName = decodeURIComponent(fileUrl.split('/').pop() || 'file');
      const response = await axios.get<Blob>(fileUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (e) {
      console.error('❌ Error downloading file:', e);
      toast.error('Failed to download file');
      throw e;
    }
  },

  getAssignmentDetails: async (assignmentId: string): Promise<unknown> => {
    try {
      const response = await api.get<AssignmentDetailsResponse>(`/assignments/${assignmentId}`);
      return response.data?.data || response.data?.assignment || response.data;
    } catch (e) {
      console.error('❌ Error fetching assignment:', e);
      throw e;
    }
  }
};

export default GradeService;