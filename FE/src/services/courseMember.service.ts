// src/services/courseMember.service.ts
import axiosInstance from "../api/axiosInstance";

export interface CourseMember {
  _id: string;
  courseId: string;
  userId: string | {
    _id: string;
    fullName?: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  role: "student" | "teacher";
  enrolledAt: string;
  deletedAt?: string | null;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteCourseMemberResponse {
  message: string;
  data: CourseMember;
  userAction?: "deleted" | "locked"; // Backend returns this field
}

export const courseMemberService = {
  // Get enrolled students for a course (active only)
  // Backend returns array directly: GET /api/course-members/:courseId/lists
  getStudentsByCourse: async (courseId: string): Promise<CourseMember[]> => {
    const response = await axiosInstance.get(`/course-members/${courseId}/lists`);
    // Backend returns array directly, not wrapped in { data: [...] }
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get deleted students for a course
  // Backend returns array directly: GET /api/course-members/:courseId/lists/deleted
  getDeletedStudentsByCourse: async (courseId: string): Promise<CourseMember[]> => {
    const response = await axiosInstance.get(`/course-members/${courseId}/lists/deleted`);
    // Backend returns array directly, not wrapped in { data: [...] }
    return Array.isArray(response.data) ? response.data : [];
  },

  // Delete (soft delete) a course member
  deleteCourseMember: async (
    courseId: string,
    memberId: string
  ): Promise<DeleteCourseMemberResponse> => {
    const response = await axiosInstance.delete(`/course-members/${courseId}/members/${memberId}`);
    return response.data;
  },

  // Restore a deleted course member
  // Logic:
  // 1. For "in_progress" courses: Unlock user (if locked), then add to active students
  // 2. For "not_yet" courses: Cannot restore (User was hard deleted)
  // Backend doesn't have restore endpoint, so we:
  // 1. Get course info to check status
  // 2. For "in_progress": Unlock user first
  // 3. Add course member to active students (creates new CourseMember record)
  // Note: The old record with deletedAt != null will still exist in database
  restoreCourseMember: async (
    courseId: string,
    userId: string // This is User._id, not CourseMember._id
  ): Promise<{ message: string; data: CourseMember }> => {
    try {
      // First, check if student already exists as active member
      const activeStudents = await courseMemberService.getStudentsByCourse(courseId);
      const studentExists = activeStudents.some((member: CourseMember) => {
        const memberUserId = typeof member.userId === 'string' 
          ? member.userId 
          : member.userId?._id?.toString();
        return memberUserId === userId;
      });

      if (studentExists) {
        throw new Error('Student is already active in this course');
      }

      // Get course info to check status
      const courseResponse = await axiosInstance.get(`/courses/${courseId}`);
      const course = courseResponse.data?.data || courseResponse.data;
      
      // For "in_progress" courses: Unlock user first (User was locked when removed)
      if (course?.status === 'in_progress') {
        try {
          await axiosInstance.post(`/admin/unlock/${userId}`);
          console.log(`User ${userId} unlocked successfully for restore`);
        } catch (unlockError: unknown) {
          // If user doesn't exist (hard deleted) or already active, continue
          // Only throw if it's a critical error (e.g., 401 unauthorized)
          const error = unlockError as { response?: { status?: number; data?: { message?: string } }; message?: string };
          if (error.response?.status === 401) {
            throw new Error('Unauthorized to unlock user. Please check your permissions.');
          }
          // For other errors (400, 404), continue - backend will validate when adding member
          console.warn(`Unlock user warning:`, error.response?.data?.message || error.message);
        }
      }

      // Add course member to active students (creates new CourseMember record)
      // This will add the student back to the active students list
      // Backend will validate if User exists
      try {
        const restored = await courseMemberService.addCourseMember(courseId, userId, "student");
        
        // Verify that student is now in active list
        const activeStudentsAfter = await courseMemberService.getStudentsByCourse(courseId);
        const isActive = activeStudentsAfter.some((member: CourseMember) => {
          const memberUserId = typeof member.userId === 'string' 
            ? member.userId 
            : member.userId?._id?.toString();
          return memberUserId === userId;
        });
        
        if (!isActive) {
          console.warn('Student restored but not found in active list. Please refresh the page.');
        }
        
        return {
          message: "Student restored successfully and added to active students",
          data: restored,
        };
      } catch (addError: unknown) {
        // If addCourseMember fails, check if it's a duplicate error
        const error = addError as { response?: { status?: number; data?: { message?: string } } };
        if (error.response?.status === 500 && error.response?.data?.message?.includes('duplicate')) {
          throw new Error('Student may already exist in this course. Please refresh the page.');
        }
        throw addError;
      }
    } catch (error: unknown) {
      // Handle specific error cases
      const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (err.response?.status === 400 || err.response?.status === 409) {
        // User may not exist (hard deleted) or duplicate member
        const errorMsg = err.response?.data?.message || err.message;
        if (errorMsg?.includes('not found') || errorMsg?.includes('does not exist') || errorMsg?.includes('User not found')) {
          throw new Error('Cannot restore: User account was permanently deleted (hard delete). This usually happens when removing students from courses with status "not_yet".');
        }
        if (errorMsg?.includes('already exist') || errorMsg?.includes('duplicate')) {
          throw new Error('Student may already exist in this course. Please refresh the page.');
        }
        throw new Error(errorMsg || 'Failed to restore student');
      }
      if (err.response?.status === 404) {
        const errorMsg = err.response?.data?.message || err.message;
        if (errorMsg?.includes('User') || errorMsg?.includes('user')) {
          throw new Error('Cannot restore: User account was permanently deleted (hard delete). This usually happens when removing students from courses with status "not_yet".');
        }
        throw new Error('Course or user not found. Please check your request.');
      }
      if (err.message && !err.message.includes('response')) {
        throw error;
      }
      throw new Error(err.response?.data?.message || err.message || 'Failed to restore student');
    }
  },

  // Add course member (for manual add or restore)
  // Backend route: POST /course-members/members
  // Body: { courseId, userId, role }
  addCourseMember: async (
    courseId: string,
    userId: string,
    role: "student" | "teacher" = "student"
  ): Promise<CourseMember> => {
    try {
      // Backend route is /course-members/members (not /course-members)
      const response = await axiosInstance.post("/course-members/members", {
        courseId,
        userId,
        role,
      });
      return response.data;
    } catch (error: unknown) {
      // Handle specific error cases
      const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || err.message;
        throw new Error(errorMsg || 'Failed to add course member');
      }
      if (err.response?.status === 404) {
        throw new Error('Course or user not found. Please check your request.');
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('Unauthorized. Please check your permissions.');
      }
      throw new Error(err.response?.data?.message || err.message || 'Failed to add course member');
    }
  },

  // Get teachers by course
  // Backend: GET /api/course-members/:courseId/teachers - returns array directly
  getTeachersByCourse: async (courseId: string): Promise<CourseMember[]> => {
    const response = await axiosInstance.get(`/course-members/${courseId}/teachers`);
    // Backend returns array directly, not wrapped in { data: [...] }
    return Array.isArray(response.data) ? response.data : [];
  },

  // Transfer student from one course to another (chuyển lớp)
  // Backend: POST /api/course-members/:studentId/transfer
  // Body: { fromCourseId, toCourseId }
  // Backend validates: both courses must have status "not_yet", duplicate check (does NOT validate capacity)
  transferStudent: async (
    studentUserId: string,
    fromCourseId: string,
    toCourseId: string
  ): Promise<{ success: boolean; message: string; error?: string; data?: unknown }> => {
    try {
      // Use backend's dedicated transfer endpoint
      const response = await axiosInstance.post(
        `/course-members/${studentUserId}/transfer`,
        {
          fromCourseId,
          toCourseId,
        }
      );
      
      console.log('Transfer API response:', response.data);
      
      return {
        success: true,
        message: response.data?.message || "Student transferred successfully",
        data: response.data?.data,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error("Error transferring student:", error);
      console.error("Error response:", err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || "Failed to transfer student";
      
      return {
        success: false,
        message: "Failed to transfer student",
        error: errorMessage,
      };
    }
  },

  // Batch delete course members
  batchDeleteCourseMembers: async (
    courseId: string,
    memberIds: string[]
  ): Promise<{ message: string; count: number }> => {
    // Backend doesn't have batch delete, so we'll delete one by one
    const results = await Promise.allSettled(
      memberIds.map(id => courseMemberService.deleteCourseMember(courseId, id))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    return {
      message: `${successCount} student(s) removed successfully`,
      count: successCount,
    };
  },
};

export default courseMemberService;

