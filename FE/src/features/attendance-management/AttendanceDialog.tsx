import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from '@mui/material';
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAttendanceData } from '../../hooks/useAttendanceData';
import { AttendanceStatus, type AttendanceRecord } from '../../types/attendance.types';
import type { Calendar } from '../../types/schedule.types';

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  calendar: Calendar | null;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const isSessionActive = (date: Date, startTime?: string, endTime?: string): boolean => {
  if (!startTime || !endTime) {
    console.warn('⚠️ isSessionActive: Missing time data', { startTime, endTime });
    return false;
  }

  const now = new Date();
  const sessionDate = new Date(date);

  if (sessionDate.toDateString() !== now.toDateString()) {
    console.log('📅 Different day - session not active');
    return false;
  }

  const [startHour, startMin] = startTime.trim().split(':').map(s => Number(s.trim()));
  const [endHour, endMin] = endTime.trim().split(':').map(s => Number(s.trim()));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionStart = startHour * 60 + startMin;
  const sessionEnd = endHour * 60 + endMin;

  const isActive = currentMinutes >= sessionStart && currentMinutes <= sessionEnd;
  console.log('⏰ Session time check:', {
    currentMinutes,
    sessionStart,
    sessionEnd,
    isActive
  });

  return isActive;
};

const canEditAttendance = (date: Date, startTime?: string, endTime?: string): boolean => {
  console.log('🔍 canEditAttendance check:', {
    date: date.toISOString(),
    startTime,
    endTime,
    now: new Date().toISOString()
  });

  if (!startTime || !endTime) {
    console.warn('⚠️ Missing time data - cannot edit');
    return false;
  }

  const sessionDate = new Date(date);
  const now = new Date();

  if (sessionDate > now) {
    console.log('🔮 Session in future - cannot edit');
    return false;
  }

  if (isSessionActive(sessionDate, startTime, endTime)) {
    console.log('✅ Session is active - can edit');
    return true;
  }

  const [endHour, endMin] = endTime.split(':').map(Number);
  const sessionEnd = new Date(sessionDate);
  sessionEnd.setHours(endHour, endMin, 0, 0);

  const hoursSinceEnd = (now.getTime() - sessionEnd.getTime()) / (1000 * 60 * 60);
  const canEdit = hoursSinceEnd <= 24;

  console.log('⏱️ Time since session end:', {
    sessionEnd: sessionEnd.toISOString(),
    hoursSinceEnd,
    canEdit
  });

  return canEdit;
};

const getStatusColor = (status: AttendanceStatus): 'success' | 'error' | 'default' => {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return 'success';
    case AttendanceStatus.ABSENT:
      return 'error';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: AttendanceStatus) => {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return <CheckCircle size={16} />;
    case AttendanceStatus.ABSENT:
      return <XCircle size={16} />;
    default:
      return <Clock size={16} />;
  }
};

const getStatusLabel = (status: AttendanceStatus): string => {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return 'Present';
    case AttendanceStatus.ABSENT:
      return 'Absent';
    default:
      return 'Not Yet';
  }
};

export const AttendanceDialog: React.FC<AttendanceDialogProps> = ({
  open,
  onClose,
  calendar,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { students, loading, error, fetchStudents, updateStatus, updating } = useAttendanceData();
  const [updateError, setUpdateError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const session = calendar?.sessionId && typeof calendar.sessionId === 'object'
    ? calendar.sessionId
    : calendar?.session;

  const course = calendar?.courseId && typeof calendar.courseId === 'object'
    ? calendar.courseId
    : calendar?.course;

  const sessionDate = calendar?.date ? new Date(calendar.date) : new Date();

  useEffect(() => {
    if (open && calendar) {
      if (calendar._id) {
        fetchStudents(calendar._id);
      } else {
        console.error('❌ Calendar ID is missing!');
      }

      setUpdateError('');
      setSuccessMessage('');
    }
  }, [open, calendar?._id, fetchStudents]);

  const canEdit = session?.startTime && session?.endTime
    ? canEditAttendance(sessionDate, session.startTime, session.endTime)
    : false;

  const isActive = session?.startTime && session?.endTime
    ? isSessionActive(sessionDate, session.startTime, session.endTime)
    : false;

  console.log('🔐 Permissions:', { canEdit, isActive });

  const handleStatusUpdate = async (userId: string, newStatus: AttendanceStatus) => {
    try {
      if (!calendar?._id) return;
      setUpdateError('');
      setSuccessMessage('');

      console.log('🔄 Updating status:', { calendarId: calendar._id, userId, newStatus });

      await updateStatus(calendar._id, userId, newStatus);

      setSuccessMessage('Attendance updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('❌ Update failed:', err);
      const error = err as ApiErrorResponse;
      setUpdateError(error.response?.data?.message || error.message || 'Failed to update attendance');
    }
  };

  const renderMobileView = () => (
    <Box sx={{ pb: 2 }}>
      {students.map((student: AttendanceRecord) => (
        <Card
          key={student.attendanceId}
          sx={{
            mb: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Student Info */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                  {student.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {student.email}
                </Typography>
                {student.username && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    @{student.username}
                  </Typography>
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                  p: 1.5,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Status
                </Typography>
                <Chip
                  icon={getStatusIcon(student.status)}
                  label={getStatusLabel(student.status)}
                  color={getStatusColor(student.status)}
                  size="small"
                />
              </Box>

              {/* Action Buttons */}
              {canEdit && (
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant={student.status === AttendanceStatus.PRESENT ? 'contained' : 'outlined'}
                    color="success"
                    size="medium"
                    fullWidth
                    startIcon={<CheckCircle size={18} />}
                    onClick={() => handleStatusUpdate(student.userId._id, AttendanceStatus.PRESENT)}
                    disabled={updating}
                    sx={{
                      py: 1,
                      fontWeight: 600,
                    }}
                  >
                    Present
                  </Button>
                  <Button
                    variant={student.status === AttendanceStatus.ABSENT ? 'contained' : 'outlined'}
                    color="error"
                    size="medium"
                    fullWidth
                    startIcon={<XCircle size={18} />}
                    onClick={() => handleStatusUpdate(student.userId._id, AttendanceStatus.ABSENT)}
                    disabled={updating}
                    sx={{
                      py: 1,
                      fontWeight: 600,
                    }}
                  >
                    Absent
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderDesktopView = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Username</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Status</TableCell>
            {canEdit && (
              <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Actions</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student: AttendanceRecord) => (
            <TableRow key={student.attendanceId} hover>
              <TableCell>{student.name}</TableCell>
              <TableCell>{student.email}</TableCell>
              <TableCell>{student.username || '-'}</TableCell>
              <TableCell align="center">
                <Chip
                  icon={getStatusIcon(student.status)}
                  label={getStatusLabel(student.status)}
                  color={getStatusColor(student.status)}
                  size="small"
                />
              </TableCell>
              {canEdit && (
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleStatusUpdate(student.userId._id, AttendanceStatus.PRESENT)}
                      disabled={updating || student.status === AttendanceStatus.PRESENT}
                      sx={{
                        bgcolor: student.status === AttendanceStatus.PRESENT ? 'success.main' : 'transparent',
                        color: student.status === AttendanceStatus.PRESENT ? 'white' : 'success.main',
                        '&:hover': {
                          bgcolor: student.status === AttendanceStatus.PRESENT ? 'success.dark' : 'success.light',
                        },
                      }}
                    >
                      <CheckCircle size={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleStatusUpdate(student.userId._id, AttendanceStatus.ABSENT)}
                      disabled={updating || student.status === AttendanceStatus.ABSENT}
                      sx={{
                        bgcolor: student.status === AttendanceStatus.ABSENT ? 'error.main' : 'transparent',
                        color: student.status === AttendanceStatus.ABSENT ? 'white' : 'error.main',
                        '&:hover': {
                          bgcolor: student.status === AttendanceStatus.ABSENT ? 'error.dark' : 'error.light',
                        },
                      }}
                    >
                      <XCircle size={18} />
                    </IconButton>
                  </Stack>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              bgcolor: 'primary.50',
              borderRadius: 2,
              p: 1,
            }}
          >
            <UserCheck size={isMobile ? 28 : 32} color={theme.palette.primary.main} />
          </Box>

          <Box flex={1}>
            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={600}>
              Check Attendance
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.3 }}
            >
              {course?.name || course?.courseName || "Unknown Course"}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3 }}>
        {/* Session Info */}
        <Paper
          sx={{
            p: isMobile ? 2 : 2.5,
            mb: 3,
            bgcolor: isActive ? 'success.50' : 'grey.50',
            border: 1,
            borderColor: isActive ? 'success.200' : 'divider',
          }}
        >
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 2 : 3}
            justifyContent="space-between"
          >
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                SESSION
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                {session?.sessionName || 'Unknown'}
              </Typography>
              {session?.startTime && session?.endTime ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                  {session.startTime} - {session.endTime}
                </Typography>
              ) : (
                <Typography variant="caption" color="error">
                  ⚠️ Missing time data
                </Typography>
              )}
            </Box>

            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                DATE
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                {sessionDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Typography>
            </Box>

            {isActive && (
              <Box display="flex" alignItems="center">
                <Chip
                  icon={<AlertCircle size={16} />}
                  label="Session Active"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Alerts */}
        {!canEdit && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {!session?.startTime || !session?.endTime
              ? '⚠️ Session time data is missing. Cannot determine edit permission.'
              : sessionDate > new Date()
                ? 'This session has not started yet. Attendance can only be taken during or within 24 hours after the session.'
                : 'More than 24 hours have passed since this session. Attendance can no longer be edited.'}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {updateError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setUpdateError('')}>
            {updateError}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              No students enrolled in this course
            </Typography>
          </Box>
        ) : (
          <>
            {isMobile ? renderMobileView() : renderDesktopView()}

            {/* Summary */}
            <Paper
              sx={{
                p: isMobile ? 2.5 : 3,
                mt: 3,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 2, textAlign: 'center' }}>
                ATTENDANCE SUMMARY
              </Typography>
              <Stack
                direction="row"
                spacing={isMobile ? 2 : 4}
                justifyContent="center"
                divider={<Box sx={{ width: 1, bgcolor: 'divider' }} />}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main" fontWeight={700}>
                    {students.filter((s: AttendanceRecord) => s.status === AttendanceStatus.PRESENT).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                    Present
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="error.main" fontWeight={700}>
                    {students.filter((s: AttendanceRecord) => s.status === AttendanceStatus.ABSENT).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                    Absent
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="text.secondary" fontWeight={700}>
                    {students.filter((s: AttendanceRecord) => s.status === AttendanceStatus.NOT_YET).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                    Not Yet
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: isMobile ? 2 : 3, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth={isMobile}
          size="large"
          sx={{
            bgcolor: '#f59e0b',
            '&:hover': { bgcolor: '#d97706' },
            minWidth: isMobile ? '100%' : 120,
            py: 1.2,
            fontWeight: 600,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceDialog;
