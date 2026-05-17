import axiosInstance from '../api/axiosInstance';
import courseMemberService, { type CourseMember } from './courseMember.service';

export interface Course {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  status: 'not_yet' | 'in_progress' | 'complete';
  homeroomTeacherId?: string;
  homeroomTeacher?: string;
  startDate?: string;
  endDate?: string;
  session: number;
  capacity: number;
  enrolledCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

export interface EnrolledStudentsResponse {
  course: {
    id: string;
    name: string;
    homeroomTeacher?: string;
    capacity: number;
    enrolledCount: number;
  };
  totalStudents: number;
  students: EnrolledStudent[];
}

const normalizeCourse = (raw: Course | null | undefined): Course | null => {
  if (!raw) return null;
  return {
    ...raw,
    id: raw._id || raw.id,
  } as Course;
};

export const courseService = {
  getManagers: async (): Promise<Array<{ id: string; name: string; email?: string }>> => {
    try {
      const response = await axiosInstance.get<{ data: Array<{ _id: string; id?: string; name: string; email?: string }>; total: number }>('/courses/homeroom-teachers/list');
      return (response.data.data || []).map((teacher) => ({
        id: teacher._id || teacher.id || '',
        name: teacher.name,
        email: teacher.email,
      }));
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error fetching homeroom teachers:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch homeroom teachers');
    }
  },

  getAll: async (): Promise<Course[]> => {
    try {
      const response = await axiosInstance.get<{ data: Course[]; total: number }>('/courses');
      return (response.data.data || []).map((c) => normalizeCourse(c)).filter((c): c is Course => c !== null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error fetching courses:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch courses');
    }
  },

  getById: async (id: string): Promise<Course | null> => {
    try {
      const response = await axiosInstance.get<{ data: Course }>(`/courses/${id}`);
      return normalizeCourse(response.data.data);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 404) {
        return null;
      }
      console.error('Error fetching course:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch course');
    }
  },

  create: async (courseData: Omit<Course, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>): Promise<Course> => {
    try {
      const response = await axiosInstance.post<{ message: string; data: Course }>('/courses', courseData);
      const normalized = normalizeCourse(response.data.data);
      if (!normalized) throw new Error('Failed to normalize course data');
      return normalized;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error creating course:', error);
      throw new Error(err.response?.data?.message || 'Failed to create course');
    }
  },

  update: async (id: string, courseData: Partial<Omit<Course, '_id' | 'id' | 'createdAt' | 'enrolledCount'>>): Promise<Course | null> => {
    try {
      const response = await axiosInstance.patch<{ message: string; data: Course }>(`/courses/${id}`, courseData);
      return normalizeCourse(response.data.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error updating course:', error);
      throw new Error(err.response?.data?.message || 'Failed to update course');
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await axiosInstance.delete<{ message: string }>(`/courses/${id}`);
      return true;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error deleting course:', error);
      throw new Error(err.response?.data?.message || 'Failed to delete course');
    }
  },

  search: async (query: string): Promise<Course[]> => {
    try {
      const response = await axiosInstance.get<{ data: Course[]; pagination: unknown }>('/courses/available', {
        params: { q: query },
      });
      return (response.data.data || []).map((c) => normalizeCourse(c)).filter((c): c is Course => c !== null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error searching courses:', error);
      throw new Error(err.response?.data?.message || 'Failed to search courses');
    }
  },

  getAvailableCourses: async (page: number = 1, limit: number = 10, query?: string): Promise<{ data: Course[]; pagination: unknown }> => {
    try {
      const response = await axiosInstance.get<{ data: Course[]; pagination: unknown }>('/courses/available', {
        params: {
          page,
          limit,
          ...(query && { q: query }),
        },
      });
      return {
        data: (response.data.data || []).map((c) => normalizeCourse(c)).filter((c): c is Course => c !== null),
        pagination: response.data.pagination,
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error fetching available courses:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch available courses');
    }
  },

  getTeacherCourses: async (): Promise<Course[]> => {
    try {
      const response = await axiosInstance.get<{ data: Course[]; total: number }>('/courses/teacher/courses');
      return (response.data.data || []).map((c) => normalizeCourse(c)).filter((c): c is Course => c !== null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error fetching teacher courses:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch teacher courses');
    }
  },

  getEnrolledStudents: async (id: string): Promise<EnrolledStudentsResponse> => {
    try {
      const courseMembers = await courseMemberService.getStudentsByCourse(id);
      
      const students: EnrolledStudent[] = courseMembers.map((member: CourseMember) => {
        const userId = typeof member.userId === 'string' ? null : member.userId;
        const userName = userId?.name || userId?.fullName || 'Unknown';
        const userEmail = userId?.email || '';
        return {
          id: member._id || '',
          name: userName,
          email: userEmail,
          enrolledAt: member.enrolledAt || member.createdAt || new Date().toISOString(),
        };
      });

      const course = await courseService.getById(id);

      return {
        course: {
          id: course?._id || course?.id || id,
          name: course?.name || '',
          homeroomTeacher: course?.homeroomTeacher,
          capacity: course?.capacity || 0,
          enrolledCount: course?.enrolledCount || students.length,
        },
        totalStudents: students.length,
        students,
      };
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error fetching enrolled students:', error);
      throw new Error(err.response?.data?.message || 'Failed to fetch enrolled students');
    }
  },
};

export default courseService;