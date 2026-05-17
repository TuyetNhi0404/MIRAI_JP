import axios, { AxiosError } from "axios";
import type {
  AssignmentListResponse,
  Assignment,
  SubmissionResponse,
  EnrolledCourse,
  BackendSubmission,
  BackendCourse,
  BackendAssignment,
} from "../types/submission.types";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    console.log(" Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error(" Request error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(" Response:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error(" Response error:", error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.error(" Unauthorized - Please login again");
    }
    return Promise.reject(error);
  }
);

const transformEnrolledCourse = (beCourse: BackendCourse): EnrolledCourse => {
  return {
    _id: beCourse._id,
    name: beCourse.name,
    description: beCourse.description || "",
    status: beCourse.status || "not_yet",
    startDate: beCourse.startDate,
    endDate: beCourse.endDate || "",
    homeroomTeacher: beCourse.homeroomTeacher || "Unknown",
    createdAt: beCourse.createdAt,
  };
};

const transformAssignment = (beAssignment: BackendAssignment): Assignment => {
  const courseId = typeof beAssignment.courseId === 'string' 
    ? beAssignment.courseId 
    : beAssignment.courseId._id;
    
  const courseName = beAssignment.courseName 
    || (typeof beAssignment.courseId === 'object' ? beAssignment.courseId.name : undefined)
    || "Unknown Course";

  return {
    _id: beAssignment._id,
    id: beAssignment._id,
    title: beAssignment.title,
    courseId,
    courseName,
    description: beAssignment.description || "",
    status: beAssignment.status === "closed" ? "closed" : "active",
    dueDate: beAssignment.dueDate,
    isLate: beAssignment.isLate || false,
    maxScore: beAssignment.maxScore,
    fileUrls: beAssignment.fileUrls || [],
    teacherName: beAssignment.teacherName || beAssignment.createdBy?.name || "Unknown",
    createdAt: beAssignment.createdAt,
    updatedAt: beAssignment.updatedAt,
  };
};



export const submissionService = {
  async getMyEnrolledCourses(): Promise<{
    message: string;
    total: number;
    courses: EnrolledCourse[];
  }> {
    try {
      const response = await api.get<{ data: BackendCourse[] }>("/courses/student/courses");
      const coursesData = response.data?.data || [];
      
      if (coursesData.length === 0) {
        return {
          message: "You haven't enrolled in any courses yet",
          total: 0,
          courses: [],
        };
      }

      const courses = coursesData.map(transformEnrolledCourse);

      return {
        message: "Successfully fetched enrolled courses",
        total: courses.length,
        courses,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        throw new Error("Unauthorized. Please login again.");
      }
      
      if (axiosError.response?.status === 404) {
        return {
          message: "You haven't enrolled in any courses yet",
          total: 0,
          courses: [],
        };
      }
      
      throw error;
    }
  },

  async getAllAssignments(
    courseId: string,
    params?: {
      search?: string;
      status?: string;
      limit?: number;
      page?: number;
    }
  ): Promise<AssignmentListResponse> {
    const response = await api.get<AssignmentListResponse & { assignments: BackendAssignment[] }>(
      `/assignments/get/${courseId}`, 
      { params }
    );
    const assignments = (response.data.assignments || []).map(transformAssignment);
    
    return {
      message: response.data.message || "Success",
      total: response.data.total || assignments.length,
      page: response.data.page || 1,
      limit: response.data.limit || 100,
      totalPages: response.data.totalPages || 1,
      assignments,
    };
  },

  async getAssignmentDetail(
    courseId: string,
    assignmentId: string
  ): Promise<{ message: string; courseId: string; assignment: Assignment }> {
    const response = await api.get<{ 
      message: string; 
      courseId: string; 
      assignment: BackendAssignment 
    }>(`/assignments/get/${courseId}/${assignmentId}`);
    
    return {
      ...response.data,
      assignment: transformAssignment(response.data.assignment),
    };
  },

  async submitAssignment(
    assignmentId: string,
    formData: FormData
  ): Promise<SubmissionResponse> {
    const response = await api.post<SubmissionResponse>(
      `/submissions/${assignmentId}/submit`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    
    return response.data;
  },

  async getMySubmission(assignmentId: string): Promise<{
    message: string;
    submission: BackendSubmission;
  }> {
    try {
      const response = await api.get<BackendSubmission>(
        `/submissions/${assignmentId}/my-submission`
      );
      
      return {
        message: "Submission found",
        submission: response.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw error;
      }
      throw error;
    }
  },

  async updateSubmission(
    submissionId: string,
    formData: FormData
  ): Promise<SubmissionResponse> {
    const response = await api.put<SubmissionResponse>(
      `/submissions/update/${submissionId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    
    return response.data;
  },

  async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      if (fileUrl.startsWith('http')) {
        window.open(fileUrl, "_blank");
        return;
      }
      
      const response = await api.get<Blob>(fileUrl, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed, opening in new tab:", error);
      window.open(fileUrl, "_blank");
    }
  },
};