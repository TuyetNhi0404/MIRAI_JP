import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, Search, X, ArrowRight, MoreVertical } from 'lucide-react';
import { 
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Menu,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { courseService, type Course } from '../../services/courseService';
import courseMemberService from '../../services/courseMember.service';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosInstance';

/** --------- Types --------- */

interface EnrolledStudent {
  id: string;
  memberId: string; // CourseMember._id
  userId: string;   // User._id - used for delete/restore operations
  name: string;
  email: string;
  enrolledAt: string;
}

interface RemovedStudent {
  memberId: string; // CourseMember._id
  userId: string;
  studentName: string;
  studentEmail: string;
  deletedBy?: string;
  deletedAt?: string;
}

interface PopulatedUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
}

interface CourseMember {
  _id?: string;
  id?: string;
  userId: string | PopulatedUser;
  user?: PopulatedUser;
  enrolledAt?: string;
  createdAt?: string;
  deletedAt?: string;
  deletedBy?: string | PopulatedUser;
}

type ExtendedCourse = Course & {
  managerName?: string;
};

interface CourseInfo {
  id: string;
  name: string;
  homeroomTeacher?: string;
  capacity: number;
  enrolledCount: number;
  status?: Course['status'];
}

interface AdminUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
}

interface AdminUsersResponse {
  users?: AdminUser[];
  data?: AdminUser[];
}

interface TransferResult {
  success: boolean;
  error?: string;
  message?: string;
}

type ErrorWithResponse = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  request?: unknown;
  message?: string;
};

/** --------- Helpers --------- */

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message?: string }).message ?? fallback;
  }
  return fallback;
};

// Helper: Extract userId from member object (handles both string and populated object)
const extractUserId = (member: Pick<CourseMember, 'userId'>): string => {
  if (typeof member.userId === 'string') {
    return member.userId;
  }
  if (!member.userId || typeof member.userId !== 'object') {
    return '';
  }
  const userObj = member.userId as PopulatedUser;
  return userObj?._id?.toString() ?? userObj?.id ?? '';
};

const EnrolledStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // const isTablet = useMediaQuery(theme.breakpoints.down('md')); // Unused for now

  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [removedStudents, setRemovedStudents] = useState<RemovedStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRemoved, setLoadingRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [removedPage, setRemovedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ studentName: string; userId: string } | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedTargetCourse, setSelectedTargetCourse] = useState<string>('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  const studentsPerPage = 10;

  /** --------- Effects --------- */

  useEffect(() => {
    if (id) {
      // loadEnrolledStudents already loads course info
      void loadEnrolledStudents();
      if (tabValue === 1) {
        void loadRemovedStudents();
      }
    }
    // Backend automatically updates course status based on dates
  }, [id, tabValue]);

  // Debounce search query - only filter after user stops typing for 300ms
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    filterStudents();
  }, [enrolledStudents, debouncedSearchQuery]);

  /** --------- Course Info Helper --------- */

  const setCourseInfoFromCourse = (course: ExtendedCourse, enrolledCount?: number) => {
    setCourseInfo(prev => ({
      id: (course.id || course._id || '') as string,
      name: course.name,
      homeroomTeacher: course.homeroomTeacher || course.managerName,
      capacity: course.capacity,
      enrolledCount: enrolledCount ?? prev?.enrolledCount ?? 0,
      status: course.status,
    }));
  };

  /** --------- Loaders --------- */

  const loadEnrolledStudents = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Load course info and enrolled students in parallel
      const [courseMembersRaw, courseRaw] = await Promise.all([
        courseMemberService.getStudentsByCourse(id),
        courseService.getById(id),
      ]);

      const courseMembers = courseMembersRaw as CourseMember[];
      const course = courseRaw as ExtendedCourse | null;

      // Transform CourseMember data to EnrolledStudent format
      const activeStudents: EnrolledStudent[] = courseMembers.map((member) => {
        const memberId = (member._id ?? member.id ?? '').toString();
        const userId = extractUserId(member);

        const userFromUserId =
          typeof member.userId === 'object' ? (member.userId as PopulatedUser) : undefined;
        const userFromUserField = member.user;
        const user: PopulatedUser | undefined = userFromUserId ?? userFromUserField;

        let userName = 'Unknown';
        let userEmail = '';

        if (user && typeof user === 'object') {
          userName = user.name || user.fullName || user.username || 'Unknown';
          userEmail = user.email || '';
          if (userName === 'Unknown' && userEmail) {
            userName = userEmail.split('@')[0];
          }
        }

        return {
          id: memberId,
          memberId: memberId,
          userId: userId || '',
          name: userName,
          email: userEmail,
          enrolledAt: member.enrolledAt || member.createdAt || new Date().toISOString(),
        };
      });

      setEnrolledStudents(activeStudents);

      if (course) {
        setCourseInfoFromCourse(course, activeStudents.length);
      }
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Failed to load enrolled students');
      console.error('Error loading enrolled students:', error);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadRemovedStudents = async () => {
    if (!id) return;
    setLoadingRemoved(true);
    try {
      const deletedMembersRaw = await courseMemberService.getDeletedStudentsByCourse(id);
      const deletedMembers = deletedMembersRaw as CourseMember[];

      // Also get active students to filter out restored students
      const activeStudentsRaw = await courseMemberService.getStudentsByCourse(id);
      const activeStudents = activeStudentsRaw as CourseMember[];

      const activeUserIds = new Set(
        activeStudents.map((member) => extractUserId(member))
      );

      // Get all courses to check if deleted students have been transferred to other courses
      const allCourses = await courseService.getAll();
      const transferredUserIds = new Set<string>();

      // Check each deleted student to see if they're active in any other course
      for (const deletedMember of deletedMembers) {
        const userId = extractUserId(deletedMember);

        if (!userId) continue;
        if (activeUserIds.has(userId)) continue;

        for (const course of allCourses) {
          const courseId = (course.id || course._id) as string | undefined;
          if (!courseId || courseId === id) continue;

          try {
            const otherCourseStudentsRaw = await courseMemberService.getStudentsByCourse(courseId);
            const otherCourseStudents = otherCourseStudentsRaw as CourseMember[];

            const isInOtherCourse = otherCourseStudents.some((member) => {
              const memberUserId = extractUserId(member);
              return memberUserId === userId;
            });

            if (isInOtherCourse) {
              transferredUserIds.add(userId);
              break;
            }
          } catch (err) {
            console.warn(`Error checking course ${course.id}:`, err);
          }
        }
      }

      // Get unique user IDs (for students and deletedBy) to fetch user info
      const userIdsToFetch = new Set<string>();
      deletedMembers.forEach((member) => {
        const userId = extractUserId(member);
        if (userId) userIdsToFetch.add(userId);

        if (typeof member.deletedBy === 'string') {
          userIdsToFetch.add(member.deletedBy);
        }
      });

      // Fetch user info for all user IDs (students and deletedBy)
      const usersMap = new Map<string, { name: string; email: string }>();
      if (userIdsToFetch.size > 0) {
        try {
          const usersResponse = await axiosInstance.get<AdminUsersResponse>('/admin/users');
          const allUsers: AdminUser[] = usersResponse.data.users ?? usersResponse.data.data ?? [];
          allUsers.forEach((u) => {
            const userId = u._id?.toString() ?? u.id;
            if (userId && userIdsToFetch.has(userId)) {
              usersMap.set(userId, {
                name: u.name || u.fullName || u.email?.split('@')[0] || 'Unknown',
                email: u.email || '',
              });
            }
          });
        } catch (err) {
          console.warn('Failed to fetch user info:', err);
        }
      }

      // Transform CourseMember data to RemovedStudent format
      const removedMap = new Map<string, RemovedStudent>();

      deletedMembers
        .filter((member) => {
          const userId = extractUserId(member);
          return !!userId && !activeUserIds.has(userId) && !transferredUserIds.has(userId);
        })
        .forEach((member) => {
          const memberId = (member._id ?? member.id ?? '').toString();
          const userId = extractUserId(member);
          if (!userId) return;

          const userFromUserId =
            typeof member.userId === 'object' ? (member.userId as PopulatedUser) : undefined;
          const userFromUserField = member.user;
          const user: PopulatedUser | undefined = userFromUserId ?? userFromUserField;

          let userName = 'Unknown';
          let userEmail = '';

          if (user && typeof user === 'object') {
            userName = user.name || user.fullName || user.username || 'Unknown';
            userEmail = user.email || '';
            if (userName === 'Unknown' && userEmail) {
              userName = userEmail.split('@')[0];
            }
          }

          if (userName === 'Unknown' && usersMap.has(userId)) {
            const userInfo = usersMap.get(userId)!;
            userName = userInfo.name;
            if (!userEmail && userInfo.email) {
              userEmail = userInfo.email;
            }
          }

          let deletedByName: string | undefined;
          if (typeof member.deletedBy === 'string') {
            deletedByName = usersMap.get(member.deletedBy)?.name ?? member.deletedBy;
          } else if (member.deletedBy && typeof member.deletedBy === 'object') {
            const d = member.deletedBy as PopulatedUser;
            deletedByName = d.name || d.fullName || d.username || d.email;
          }

          const deletedAt = member.deletedAt ? new Date(member.deletedAt) : null;

          const existing = removedMap.get(userId);
          if (!existing) {
            removedMap.set(userId, {
              memberId,
              userId,
              studentName: userName,
              studentEmail: userEmail,
              deletedBy: deletedByName,
              deletedAt: member.deletedAt,
            });
          } else {
            const existingDeletedAt = existing.deletedAt ? new Date(existing.deletedAt) : null;
            if (deletedAt && existingDeletedAt && deletedAt > existingDeletedAt) {
              removedMap.set(userId, {
                memberId,
                userId,
                studentName: userName,
                studentEmail: userEmail,
                deletedBy: deletedByName,
                deletedAt: member.deletedAt,
              });
            }
          }
        });

      const removed: RemovedStudent[] = Array.from(removedMap.values());
      setRemovedStudents(removed);
    } catch (error: unknown) {
      console.error('Error loading removed students:', error);
      const err = error as ErrorWithResponse;
      const errorMessage =
        err.response?.data?.message ??
        err.message ??
        'Failed to load removed students';
      toast.error(errorMessage);
    } finally {
      setLoadingRemoved(false);
    }
  };

  /** --------- Filtering --------- */

  const filterStudents = () => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredStudents(enrolledStudents);
      return;
    }
    const query = debouncedSearchQuery.toLowerCase();
    const filtered = enrolledStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
    setStudentPage(1);
  };

  /** --------- Delete / Restore / Transfer --------- */

  const handleDeleteClick = (id: string) => {
    setDeleteTarget({ id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !id) return;

    try {
      const courseRaw = await courseService.getById(id);
      const course = courseRaw as ExtendedCourse | null;

      if (!course) {
        toast.error('Course not found');
        return;
      }

      if (course.status === 'complete') {
        toast.error('Cannot remove member from a completed course.');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        return;
      }

      const userIdTrimmed = deleteTarget.id.trim();
      const student = enrolledStudents.find(
        (s) =>
          s.userId === userIdTrimmed ||
          s.memberId === userIdTrimmed ||
          s.id === userIdTrimmed
      );
      if (!student) {
        toast.error('Student not found');
        return;
      }

      const memberId = student.userId || student.memberId;
      const response = await courseMemberService.deleteCourseMember(id, memberId);

      const resp = response as { message?: string; userAction?: 'deleted' | 'locked' };
      const userAction =
        resp.userAction || (course.status === 'not_yet' ? 'deleted' : 'locked');

      const actionMessage =
        userAction === 'deleted'
          ? 'Student removed and user account deleted'
          : 'Student removed and user account locked';

      toast.success(`${resp.message || 'Student removed successfully'}. ${actionMessage}.`);

      await loadEnrolledStudents();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: unknown) {
      console.error('Error removing student(s):', error);
      const err = error as ErrorWithResponse;
      let errorMessage = 'Failed to remove student(s)';

      if (err.response) {
        const status = err.response.status;
        if (status === 404) {
          errorMessage = 'Student not found. It may have been already deleted or does not exist.';
        } else if (status === 400) {
          errorMessage =
            err.response.data?.message ||
            `Cannot remove member. ${err.response.data?.error ?? ''}`;
        } else {
          errorMessage =
            err.response.data?.message ||
            err.response.data?.error ||
            `Server error: ${status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  };

  const handleRestore = async (userId: string) => {
    if (!id) return;
    try {
      await courseMemberService.restoreCourseMember(id, userId);
      toast.success('Student restored successfully');
      await Promise.all([
        loadRemovedStudents(),
        loadEnrolledStudents(),
      ]);
    } catch (error: unknown) {
      console.error('Error restoring student:', error);
      const err = error as ErrorWithResponse;
      const errorMessage =
        err.response?.data?.message ??
        err.message ??
        'Failed to restore student';
      toast.error(errorMessage);
    }
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    event.stopPropagation();
    setActionMenuAnchor({ [userId]: event.currentTarget });
  };

  const closeActionMenu = (userId?: string) => {
    if (userId) {
      setActionMenuAnchor(prev => ({ ...prev, [userId]: null }));
    } else {
      setActionMenuAnchor({});
    }
  };

  const loadAvailableCourses = async () => {
    setLoadingCourses(true);
    try {
      const allCourses = await courseService.getAll();
      const available = allCourses.filter((course) => {
        const courseId = (course.id || course._id) as string | undefined;
        if (!courseId || courseId === id) return false;
        return course.status === 'not_yet';
      });
      setAvailableCourses(available);
    } catch (error: unknown) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load available courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleTransferClick = (student: EnrolledStudent) => {
    setTransferTarget({
      studentName: student.name,
      userId: student.userId,
    });
    setSelectedTargetCourse('');
    void loadAvailableCourses();
    setTransferDialogOpen(true);
    closeActionMenu(student.userId);
  };

  const handleTransferConfirm = async () => {
    if (!transferTarget || !id || !selectedTargetCourse) {
      toast.error('Please select a target course');
      return;
    }

    setTransferring(true);
    try {
      const resultRaw = await courseMemberService.transferStudent(
        transferTarget.userId,
        id,
        selectedTargetCourse
      );
      const result = resultRaw as TransferResult;

      if (result.success) {
        toast.success(
          `Student "${transferTarget.studentName}" transferred successfully. Please check the target course.`
        );
        setTransferDialogOpen(false);
        setTransferTarget(null);
        setSelectedTargetCourse('');
        await loadEnrolledStudents();
      } else {
        toast.error(result.error || result.message || 'Failed to transfer student');
      }
    } catch (error: unknown) {
      const err = error as ErrorWithResponse;
      const errorMessage =
        err.response?.data?.message ?? err.message ?? 'Failed to transfer student';
      toast.error(errorMessage);
    } finally {
      setTransferring(false);
    }
  };

  /** --------- Pagination Helper Component --------- */

  const PaginationComponent: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = isMobile ? 3 : 7;
    const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const visiblePages = pagesArray.slice(startPage - 1, endPage);

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: { xs: 3, sm: 4 },
          gap: { xs: 0.5, sm: 1 },
          flexWrap: 'wrap',
        }}
      >
        <Button
          size={isMobile ? 'small' : 'medium'}
          variant="outlined"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          sx={{
            borderRadius: '8px',
            minWidth: { xs: 36, sm: 40 },
            height: { xs: 32, sm: 36 },
            borderColor: '#e0e3e7',
            color: currentPage === 1 ? '#ccc' : '#023665',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            '&:hover': {
              borderColor: '#023665',
              backgroundColor: '#f0f7ff',
            },
            '&:disabled': {
              borderColor: '#e0e3e7',
              color: '#ccc',
            },
          }}
        >
          {'<'}
        </Button>
        {startPage > 1 && (
          <>
            <Button
              size={isMobile ? 'small' : 'medium'}
              variant="outlined"
              onClick={() => onPageChange(1)}
              sx={{
                borderRadius: '8px',
                minWidth: { xs: 36, sm: 40 },
                height: { xs: 32, sm: 36 },
                borderColor: '#e0e3e7',
                color: '#023665',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  borderColor: '#B90000',
                  backgroundColor: '#fff5e6',
                  color: '#B90000',
                },
              }}
            >
              1
            </Button>
            {startPage > 2 && (
              <Box
                sx={{
                  px: { xs: 0.5, sm: 1 },
                  color: '#666',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                ...
              </Box>
            )}
          </>
        )}
        {visiblePages.map((p) =>
          p === currentPage ? (
            <Box
              key={p}
              sx={{
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.5 },
                fontWeight: 700,
                color: 'white',
                borderRadius: '8px',
                backgroundColor: '#B90000',
                minWidth: { xs: 36, sm: 40 },
                height: { xs: 32, sm: 36 },
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(236, 117, 16, 0.2)',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              {p}
            </Box>
          ) : (
            <Button
              key={p}
              size={isMobile ? 'small' : 'medium'}
              variant="outlined"
              onClick={() => onPageChange(p)}
              sx={{
                borderRadius: '8px',
                minWidth: { xs: 36, sm: 40 },
                height: { xs: 32, sm: 36 },
                borderColor: '#e0e3e7',
                color: '#023665',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  borderColor: '#B90000',
                  backgroundColor: '#fff5e6',
                  color: '#B90000',
                },
              }}
            >
              {p}
            </Button>
          )
        )}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <Box
                sx={{
                  px: { xs: 0.5, sm: 1 },
                  color: '#666',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                ...
              </Box>
            )}
            <Button
              size={isMobile ? 'small' : 'medium'}
              variant="outlined"
              onClick={() => onPageChange(totalPages)}
              sx={{
                borderRadius: '8px',
                minWidth: { xs: 36, sm: 40 },
                height: { xs: 32, sm: 36 },
                borderColor: '#e0e3e7',
                color: '#023665',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '&:hover': {
                  borderColor: '#B90000',
                  backgroundColor: '#fff5e6',
                  color: '#B90000',
                },
              }}
            >
              {totalPages}
            </Button>
          </>
        )}
        <Button
          size={isMobile ? 'small' : 'medium'}
          variant="outlined"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          sx={{
            borderRadius: '8px',
            minWidth: { xs: 36, sm: 40 },
            height: { xs: 32, sm: 36 },
            borderColor: '#e0e3e7',
            color: currentPage === totalPages ? '#ccc' : '#023665',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            '&:hover': {
              borderColor: '#023665',
              backgroundColor: '#f0f7ff',
            },
            '&:disabled': {
              borderColor: '#e0e3e7',
              color: '#ccc',
            },
          }}
        >
          {'>'}
        </Button>
      </Box>
    );
  };

  /** --------- Pagination Calculations --------- */

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
  const currentStudentPage = Math.min(studentPage, totalStudentPages);
  const startIdx = (currentStudentPage - 1) * studentsPerPage;
  const endIdx = startIdx + studentsPerPage;
  const visibleStudents = filteredStudents.slice(startIdx, endIdx);

  const totalRemovedPages = Math.max(1, Math.ceil(removedStudents.length / studentsPerPage));
  const currentRemovedPage = Math.min(removedPage, totalRemovedPages);
  const removedStartIdx = (currentRemovedPage - 1) * studentsPerPage;
  const removedEndIdx = removedStartIdx + studentsPerPage;
  const visibleRemoved = removedStudents.slice(removedStartIdx, removedEndIdx);

  /** --------- Render --------- */

  return (
    <Box sx={{ padding: { xs: '16px', sm: '20px' }, minHeight: '100vh', width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: '12px' },
          mb: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Button
          onClick={() => navigate('/dashboard/admin/courses')}
          startIcon={<ArrowLeft size={16} />}
          sx={{
            backgroundColor: '#6c757d',
            color: 'white',
            '&:hover': {
              backgroundColor: '#5a6268',
            },
            fontSize: { xs: '12px', sm: '14px' },
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.75, sm: 1 },
            minWidth: 'auto',
            alignSelf: { xs: 'flex-start', sm: 'center' },
          }}
        >
          {isMobile ? '' : 'Back'}
        </Button>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
            flex: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              color: '#023665',
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
              margin: 0,
            }}
          >
            Enrolled Students
          </Typography>
          {courseInfo && (
            <Chip
              label={`${courseInfo.enrolledCount || 0} students`}
              sx={{
                backgroundColor: '#B90000',
                color: 'white',
                fontWeight: 600,
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                height: { xs: '22px', sm: '24px' },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Course Info */}
      {courseInfo && (
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 2, sm: 3 },
            p: { xs: 2, sm: 3 },
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e0e3e7',
            boxShadow: '0 2px 12px rgba(2, 54, 101, 0.08)',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(2, 54, 101, 0.12)',
            },
          }}
        >
          <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{
                color: '#023665',
                fontWeight: 600,
                mb: 0.5,
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              }}
            >
              {courseInfo.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Course Information
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 1.5, sm: 3 },
              pt: { xs: 1.5, sm: 2 },
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#999',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Capacity
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#023665',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {courseInfo.capacity} seats
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#999',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Enrolled
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#B90000',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {courseInfo.enrolledCount || 0} students
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: { xs: 2, sm: 3 },
          borderRadius: '12px',
          border: '1px solid #e0e3e7',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_e, newValue) => {
            setTabValue(newValue);
            if (newValue === 1) {
              void loadRemovedStudents();
            }
          }}
          variant={isMobile ? 'fullWidth' : 'standard'}
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #e0e3e7',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: 160 },
              padding: { xs: '12px 8px', sm: '12px 16px' },
            },
          }}
        >
          <Tab
            label={
              isMobile
                ? `Active (${enrolledStudents.length})`
                : `Active Students (${enrolledStudents.length})`
            }
            value={0}
          />
          <Tab
            label={
              isMobile
                ? `Removed (${removedStudents.length})`
                : `Removed Students (${removedStudents.length})`
            }
            value={1}
          />
        </Tabs>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Active Students Tab */}
      {tabValue === 0 && (
        <>
          {/* Search */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: { xs: 2, sm: 3 },
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth={isMobile}
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 250 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="#666" />
                  </InputAdornment>
                ),
                endAdornment:
                  searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        sx={{ p: 0.5 }}
                      >
                        <X size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
              }}
            />
          </Box>

          {/* Students List */}
          {loading ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid #e0e3e7',
              }}
            >
              <CircularProgress sx={{ color: '#B90000', mb: 2 }} />
              <Typography
                variant="body1"
                sx={{ color: '#666', fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Loading students...
              </Typography>
            </Paper>
          ) : filteredStudents.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid #e0e3e7',
                backgroundColor: '#fafafa',
              }}
            >
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                sx={{
                  color: '#666',
                  mb: 1,
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                }}
              >
                {searchQuery ? 'No students found' : 'No students enrolled'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#999', fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {searchQuery
                  ? 'Try adjusting your search query.'
                  : 'There are no students enrolled in this course yet.'}
              </Typography>
            </Paper>
          ) : isMobile ? (
            <>
              {/* Mobile cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleStudents.map((student) => {
                  const userId = student.userId || student.memberId || student.id;
                  return (
                    <Card key={student.id} elevation={2}>
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            sx={{ color: '#023665', mb: 0.5 }}
                          >
                            {student.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            {student.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Enrolled:{' '}
                            {new Date(student.enrolledAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        {(courseInfo?.status === 'not_yet' ||
                          courseInfo?.status === 'in_progress') && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {courseInfo?.status === 'not_yet' && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ArrowRight size={16} />}
                                onClick={() => handleTransferClick(student)}
                                sx={{ flex: 1, minWidth: '120px' }}
                              >
                                Transfer
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Trash2 size={16} />}
                              onClick={() => handleDeleteClick(userId)}
                              sx={{ flex: 1, minWidth: '120px' }}
                            >
                              Remove
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>

              <PaginationComponent
                currentPage={currentStudentPage}
                totalPages={totalStudentPages}
                onPageChange={setStudentPage}
              />
            </>
          ) : (
            <>
              {/* Desktop table */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e0e3e7',
                  boxShadow: '0 2px 12px rgba(2, 54, 101, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Student Name
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Email
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Enrolled Date
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                            textAlign: 'center',
                          }}
                        />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleStudents.map((student) => {
                        const userId = student.userId || student.memberId || student.id;
                        return (
                          <TableRow
                            key={student.id}
                            sx={{
                              '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                              '&:hover': {
                                backgroundColor: '#f0f7ff',
                                transition: 'background-color 0.2s ease',
                              },
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <TableCell
                              sx={{
                                py: 1.5,
                                fontWeight: 600,
                                color: '#023665',
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                              }}
                            >
                              {student.name}
                            </TableCell>
                            <TableCell
                              sx={{
                                py: 1.5,
                                color: '#666',
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                              }}
                            >
                              {student.email}
                            </TableCell>
                            <TableCell
                              sx={{
                                py: 1.5,
                                color: '#666',
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                              }}
                            >
                              {new Date(student.enrolledAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                              {(courseInfo?.status === 'not_yet' ||
                                courseInfo?.status === 'in_progress') && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleOpenActionMenu(e, userId)}
                                    sx={{
                                      color: '#6b7280',
                                      '&:hover': {
                                        backgroundColor: '#f3f4f6',
                                        color: '#023665',
                                      },
                                    }}
                                  >
                                    <MoreVertical size={18} />
                                  </IconButton>
                                  <Menu
                                    anchorEl={actionMenuAnchor[userId]}
                                    open={Boolean(actionMenuAnchor[userId])}
                                    onClose={() => closeActionMenu(userId)}
                                    anchorOrigin={{
                                      vertical: 'bottom',
                                      horizontal: 'right',
                                    }}
                                    transformOrigin={{
                                      vertical: 'top',
                                      horizontal: 'right',
                                    }}
                                  >
                                    {courseInfo?.status === 'not_yet' && (
                                      <MenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTransferClick(student);
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                          }}
                                        >
                                          <ArrowRight size={16} />
                                          <span>Transfer to another course</span>
                                        </Box>
                                      </MenuItem>
                                    )}
                                    <MenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(userId);
                                        closeActionMenu(userId);
                                      }}
                                      sx={{ color: '#f44336' }}
                                    >
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                        }}
                                      >
                                        <Trash2 size={16} />
                                        <span>Remove student</span>
                                      </Box>
                                    </MenuItem>
                                  </Menu>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <PaginationComponent
                currentPage={currentStudentPage}
                totalPages={totalStudentPages}
                onPageChange={setStudentPage}
              />
            </>
          )}
        </>
      )}

      {/* Removed Students Tab */}
      {tabValue === 1 && (
        <>
          {loadingRemoved ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid #e0e3e7',
              }}
            >
              <CircularProgress sx={{ color: '#B90000', mb: 2 }} />
              <Typography
                variant="body1"
                sx={{ color: '#666', fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Loading removed students...
              </Typography>
            </Paper>
          ) : removedStudents.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid #e0e3e7',
                backgroundColor: '#fafafa',
              }}
            >
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                sx={{
                  color: '#666',
                  mb: 1,
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                }}
              >
                No removed students
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#999', fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                There are no removed students for this course.
              </Typography>
            </Paper>
          ) : isMobile ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleRemoved.map((student) => (
                  <Card key={student.memberId} elevation={2}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          sx={{ color: '#023665', mb: 0.5 }}
                        >
                          {student.studentName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          {student.studentEmail}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Removed:{' '}
                            {student.deletedAt
                              ? new Date(student.deletedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            By: {student.deletedBy || '-'}
                          </Typography>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      {(courseInfo?.status === 'not_yet' ||
                        courseInfo?.status === 'in_progress') && (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<RotateCcw size={16} />}
                          onClick={() => handleRestore(student.userId)}
                        >
                          Restore Student
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <PaginationComponent
                currentPage={currentRemovedPage}
                totalPages={totalRemovedPages}
                onPageChange={setRemovedPage}
              />
            </>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e0e3e7',
                  boxShadow: '0 2px 12px rgba(2, 54, 101, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Student Name
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Email
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Removed Date
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                          }}
                        >
                          Removed By
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: '#023665',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            py: 2,
                            borderBottom: '2px solid #e0e3e7',
                            textAlign: 'center',
                          }}
                        />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleRemoved.map((student) => (
                        <TableRow
                          key={student.memberId}
                          sx={{
                            '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                            '&:hover': {
                              backgroundColor: '#f0f7ff',
                              transition: 'background-color 0.2s ease',
                            },
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <TableCell
                            sx={{
                              py: 1.5,
                              fontWeight: 600,
                              color: '#023665',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {student.studentName}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 1.5,
                              color: '#666',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {student.studentEmail}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 1.5,
                              color: '#666',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {student.deletedAt
                              ? new Date(student.deletedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 1.5,
                              color: '#666',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {student.deletedBy || '-'}
                          </TableCell>
                          <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                            {(courseInfo?.status === 'not_yet' ||
                              courseInfo?.status === 'in_progress') && (
                              <Tooltip title="Restore student">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRestore(student.userId)}
                                  sx={{ color: '#4caf50' }}
                                >
                                  <RotateCcw size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <PaginationComponent
                currentPage={currentRemovedPage}
                totalPages={totalRemovedPages}
                onPageChange={setRemovedPage}
              />
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Are you sure you want to remove this student?
          </DialogContentText>
          {courseInfo && (
            <Alert
              severity="warning"
              sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              {courseInfo.status === 'not_yet'
                ? 'Warning: This will permanently delete the user account(s).'
                : courseInfo.status === 'in_progress'
                ? 'Warning: This will lock the user account(s).'
                : courseInfo.status === 'complete'
                ? 'Cannot remove members from a completed course.'
                : 'This action may affect user accounts.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2 },
          }}
        >
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={courseInfo?.status === 'complete'}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Student Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={() => !transferring && setTransferDialogOpen(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          Transfer Student
        </DialogTitle>
        <DialogContent>
          {transferTarget && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                Student to transfer:
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: '#023665', fontWeight: 600 }}
              >
                {transferTarget.studentName}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="target-course-label">Select Target Course</InputLabel>
            <Select
              labelId="target-course-label"
              value={selectedTargetCourse}
              onChange={(e) => setSelectedTargetCourse(e.target.value)}
              label="Select Target Course"
              disabled={loadingCourses || transferring}
            >
              {loadingCourses ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading courses...
                </MenuItem>
              ) : availableCourses.length === 0 ? (
                <MenuItem disabled>No available courses</MenuItem>
              ) : (
                availableCourses.map((course) => {
                  const enrolled = course.enrolledCount || 0;
                  const capacity = course.capacity || 0;
                  const available = capacity - enrolled;
                  return (
                    <MenuItem
                      key={(course.id || course._id) as string}
                      value={(course.id || course._id) as string}
                    >
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {course.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          Available: {available}/{capacity} seats
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })
              )}
            </Select>
            <FormHelperText>
              Only courses with status "not_yet" are shown (backend requirement)
            </FormHelperText>
          </FormControl>

          {selectedTargetCourse && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The student will be removed from the current course and added to the
              selected course.
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2 },
          }}
        >
          <Button
            onClick={() => setTransferDialogOpen(false)}
            disabled={transferring}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransferConfirm}
            variant="contained"
            disabled={!selectedTargetCourse || transferring || loadingCourses}
            startIcon={
              transferring ? <CircularProgress size={16} /> : <ArrowRight size={16} />
            }
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            {transferring ? 'Transferring...' : 'Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnrolledStudentsPage;
