// src/pages/Teacher/QuizzesPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Slide,
} from "@mui/material";
import type { TransitionProps } from '@mui/material/transitions';
import {
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useQuiz } from "../../hooks/useQuiz";
import { useCourse } from "../../hooks/useCourse";
import { useChapter } from "../../hooks/useChapter";
import { useAppSelector } from "../../hooks/hooks";
import QuizList from "../../components/quiz/QuizList";
import CreateQuizDialog from "../../components/quiz/CreateQuizDialog";
import QuizStatisticsDialog from "../../components/quiz/QuizStatisticsDialog";
import QuizQuestionsDialog from "../../components/quiz/QuizQuestionsDialog";
import type { Quiz, CreateQuizRequest, UpdateQuizRequest, UserWithId } from "../../types/quiz.types";

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationState {
  open: boolean;
  message: string;
  type: NotificationType;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ✅ FIX: Slide transition for Snackbar
const SlideTransition = (props: TransitionProps & { children: React.ReactElement }) => {
  return <Slide {...props} direction="left" />;
};

const TeacherQuizzesPage: React.FC = () => {
  const {
    quizzes,
    loading,
    error,
    statistics,
    quizQuestions,
    loadQuizzes,
    createNewQuiz,
    updateExistingQuiz,
    removeQuiz,
    loadQuizStatistics,
    loadQuizQuestions,
    resetError,
    resetStatistics,
    resetQuizQuestions,
  } = useQuiz();

  const { courses, loadAllCourses } = useCourse();
  const { chapters, loadAllChapters } = useChapter();
  const user = useAppSelector((state) => state.auth.user);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [filterCourse, setFilterCourse] = useState<string>("");
  const [filterChapter, setFilterChapter] = useState<string>("");

  // ✨ Notification states
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    type: 'info',
  });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // ✨ Notification helpers
  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ open: true, message, type });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <SuccessIcon sx={{ mr: 1 }} />;
      case 'error':
        return <ErrorIcon sx={{ mr: 1 }} />;
      case 'warning':
        return <WarningIcon sx={{ mr: 1 }} />;
      case 'info':
        return <InfoIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  // Load initial data
  useEffect(() => {
    loadAllCourses();
    loadAllChapters();
  }, [loadAllCourses, loadAllChapters]);

  // Load quizzes when filters change
  useEffect(() => {
    const params: { courseId?: string; chapterId?: string } = {};
    if (filterCourse) params.courseId = filterCourse;
    if (filterChapter) params.chapterId = filterChapter;
    loadQuizzes(params);
  }, [loadQuizzes, filterCourse, filterChapter]);

  const handleCreateQuiz = async (data: CreateQuizRequest) => {
    try {
      const userId = user?._id || (user as UserWithId)?.id;
      if (!userId) {
        showNotification('User not logged in or user ID not found!', 'error');
        console.error('❌ User state:', user);
        return;
      }

      const quizData: CreateQuizRequest = {
        ...data,
        createdBy: userId,
      };

      console.log('📝 Creating quiz with data:', JSON.stringify(quizData, null, 2));
      const result = await createNewQuiz(quizData);

      if (result.type.endsWith('/fulfilled')) {
        setCreateDialogOpen(false);
        setEditQuiz(null);
        showNotification('Quiz created successfully!', 'success');
      }
    } catch (err) {
      const error = err as Error;
      console.error("Failed to create quiz:", err);
      showNotification(error.message || 'Failed to create quiz. Please check the console for details.', 'error');
    }
  };

  const handleUpdateQuiz = async (data: UpdateQuizRequest) => {
    if (!editQuiz) return;

    try {
      const userId = user?._id || (user as UserWithId)?.id;
      const updateData: UpdateQuizRequest = {
        ...data,
        createdBy: userId,
      };

      await updateExistingQuiz(editQuiz._id, updateData);
      setCreateDialogOpen(false);
      setEditQuiz(null);
      showNotification('Quiz updated successfully!', 'success');
    } catch (err) {
      const error = err as Error;
      console.error("Failed to update quiz:", err);
      showNotification(error.message || 'Failed to update quiz', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    showConfirmDialog(
      'Delete Quiz',
      'Are you sure you want to delete this quiz? This action cannot be undone.',
      async () => {
        try {
          const userId = user?._id || (user as UserWithId)?.id;
          await removeQuiz(quizId, userId);
          closeConfirmDialog();
          showNotification('✅ Quiz deleted successfully', 'success');
        } catch (err) {
          const error = err as Error;
          console.error("Failed to delete quiz:", err);
          showNotification(error.message || 'Failed to delete quiz', 'error');
        }
      }
    );
  };

  const handleViewStats = async (quizId: string) => {
    if (selectedQuizId !== quizId) {
      resetStatistics();
    }
    setSelectedQuizId(quizId);
    setStatsDialogOpen(true);
    const userId = user?._id || (user as UserWithId)?.id;
    await loadQuizStatistics(quizId, userId);
  };

  const handleViewQuestions = async (quizId: string) => {
    if (selectedQuizId !== quizId) {
      resetQuizQuestions();
    }
    setSelectedQuizId(quizId);
    setQuestionsDialogOpen(true);
    const userId = user?._id || (user as UserWithId)?.id;
    await loadQuizQuestions(quizId, userId, true);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditQuiz(quiz);
    setCreateDialogOpen(true);
  };

  const handleCloseStatsDialog = () => {
    setStatsDialogOpen(false);
    setTimeout(() => {
      resetStatistics();
      setSelectedQuizId("");
    }, 300);
  };

  const handleCloseQuestionsDialog = () => {
    setQuestionsDialogOpen(false);
    setTimeout(() => {
      resetQuizQuestions();
      setSelectedQuizId("");
    }, 300);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: "#B90000",
            fontWeight: 700,
          }}
        >
          Quiz Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditQuiz(null);
            setCreateDialogOpen(true);
          }}
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0e" },
            textTransform: 'none',
            px: 3,
            py: 1,
            fontWeight: 600,
          }}
        >
          Create Quiz
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          select
          label="Filter by Course"
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          sx={{ minWidth: 200 }}
          size="small"
        >
          <MenuItem value="">All Courses</MenuItem>
          {courses.map((course) => (
            <MenuItem key={course._id} value={course._id}>
              {course.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Filter by Chapter"
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          sx={{ minWidth: 200 }}
          size="small"
        >
          <MenuItem value="">All Chapters</MenuItem>
          {chapters.map((chapter) => (
            <MenuItem key={chapter._id} value={chapter._id}>
              {chapter.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={resetError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: "#B90000" }} />
        </Box>
      )}

      {/* Quiz List */}
      {!loading && (
        <QuizList
          quizzes={quizzes}
          onEdit={handleEdit}
          onDelete={handleDeleteQuiz}
          onViewStats={handleViewStats}
          onViewQuestions={handleViewQuestions}
          isTeacher={true}
        />
      )}

      {/* Create/Edit Dialog */}
      <CreateQuizDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditQuiz(null);
        }}
        onSubmit={(data) => {
          if (editQuiz) {
            handleUpdateQuiz(data as UpdateQuizRequest);
          } else {
            handleCreateQuiz(data as CreateQuizRequest);
          }
        }}
        editQuiz={editQuiz}
      />

      {/* Statistics Dialog */}
      <QuizStatisticsDialog
        open={statsDialogOpen}
        onClose={handleCloseStatsDialog}
        statistics={statistics}
        quizId={selectedQuizId}
      />

      {/* Questions Dialog */}
      <QuizQuestionsDialog
        open={questionsDialogOpen}
        onClose={handleCloseQuestionsDialog}
        quizQuestions={quizQuestions}
        loading={loading}
      />

      {/* ✨ FIXED: Enhanced Snackbar Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
        sx={{ 
          mt: { xs: 8, sm: 9 },
          '& .MuiSnackbarContent-root': {
            minWidth: { xs: '90vw', sm: 'auto' },
            maxWidth: { xs: '90vw', sm: 500 },
          }
        }}
      >
        <Alert
          onClose={closeNotification}
          severity={notification.type}
          variant="filled"
          icon={getNotificationIcon(notification.type)}
          sx={{
            width: '100%',
            minWidth: { xs: 280, sm: 350 },
            maxWidth: { xs: '90vw', sm: 500 },
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              fontSize: { xs: '0.875rem', sm: '0.95rem' },
              fontWeight: 500,
              padding: '4px 0',
              wordBreak: 'break-word',
            },
            '& .MuiAlert-icon': {
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            },
            '& .MuiAlert-action': {
              paddingTop: 0,
            },
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* ✨ Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid #e0e0e0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" sx={{ fontSize: 28 }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              {confirmDialog.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={closeConfirmDialog}
            sx={{
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.04)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <DialogContentText sx={{ fontSize: '0.95rem', color: '#555' }}>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={closeConfirmDialog}
            variant="outlined"
            sx={{
              textTransform: 'none',
              px: 3,
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.onConfirm}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{
              textTransform: 'none',
              minWidth: 100,
              px: 3,
              fontWeight: 600,
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherQuizzesPage;
