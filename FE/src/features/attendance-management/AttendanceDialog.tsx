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
  if (!startTime || !endTime) return false;

  const now = new Date();
  const sessionDate = new Date(date);

  if (sessionDate.toDateString() !== now.toDateString()) return false;

  const [startHour, startMin] = startTime.trim().split(':').map(s => Number(s.trim()));
  const [endHour, endMin] = endTime.trim().split(':').map(s => Number(s.trim()));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionStart = startHour * 60 + startMin;
  const sessionEnd = endHour * 60 + endMin;

  return currentMinutes >= sessionStart && currentMinutes <= sessionEnd;
};

const canEditAttendance = (date: Date, startTime?: string, endTime?: string): boolean => {
  if (!startTime || !endTime) return false;

  const sessionDate = new Date(date);
  const now = new Date();

  if (sessionDate > now) return false;
  if (isSessionActive(sessionDate, startTime, endTime)) return true;

  const [endHour, endMin] = endTime.split(':').map(Number);
  const sessionEnd = new Date(sessionDate);
  sessionEnd.setHours(endHour, endMin, 0, 0);

  const hoursSinceEnd = (now.getTime() - sessionEnd.getTime()) / (1000 * 60 * 60);
  return hoursSinceEnd <= 24;
};

// Returns true when >24h has passed since session ended → students auto-counted absent
const isSessionAutoAbsent = (date: Date, endTime?: string): boolean => {
  if (!endTime) return false;
  const [endHour, endMin] = endTime.split(':').map(Number);
  const sessionEnd = new Date(date);
  sessionEnd.setHours(endHour, endMin, 0, 0);
  return (new Date().getTime() - sessionEnd.getTime()) > 24 * 60 * 60 * 1000;
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
      return 'Có mặt';
    case AttendanceStatus.ABSENT:
      return 'Vắng mặt';
    default:
      return 'Chưa điểm danh';
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

  const autoAbsent = session?.endTime
    ? isSessionAutoAbsent(sessionDate, session.endTime)
    : false;

  const handleStatusUpdate = async (userId: string, newStatus: AttendanceStatus) => {
    try {
      if (!calendar?._id) return;
      setUpdateError('');
      setSuccessMessage('');

      await updateStatus(calendar._id, userId, newStatus);

      setSuccessMessage('Cập nhật điểm danh thành công');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const error = err as ApiErrorResponse;
      setUpdateError(error.response?.data?.message || error.message || 'Cập nhật điểm danh thất bại');
    }
  };

  const renderMobileView = () => (
    <Box sx={{ pb: 2 }}>
      {students.map((student: AttendanceRecord) => {
        const effectiveStatus = (autoAbsent && student.status === AttendanceStatus.NOT_YET)
          ? AttendanceStatus.ABSENT
          : student.status;
        return (
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
                  Trạng thái
                </Typography>
                <Chip
                  icon={getStatusIcon(effectiveStatus)}
                  label={getStatusLabel(effectiveStatus)}
                  color={getStatusColor(effectiveStatus)}
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
                    Có mặt
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
                    Vắng mặt
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
        );
      })}
    </Box>
  );

  const renderDesktopView = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Họ và tên</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tên đăng nhập</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Trạng thái</TableCell>
            {canEdit && (
              <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Thao tác</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student: AttendanceRecord) => {
            const effectiveStatus = (autoAbsent && student.status === AttendanceStatus.NOT_YET)
              ? AttendanceStatus.ABSENT
              : student.status;
            return (
              <TableRow key={student.attendanceId} hover>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.username || '-'}</TableCell>
                <TableCell align="center">
                  <Chip
                    icon={getStatusIcon(effectiveStatus)}
                    label={getStatusLabel(effectiveStatus)}
                    color={getStatusColor(effectiveStatus)}
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
            );
          })}
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
              Điểm danh học viên
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.3 }}
            >
              {course?.name || course?.courseName || "Khóa học chưa xác định"}
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
                CA HỌC
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                {session?.sessionName || 'Chưa xác định'}
              </Typography>
              {session?.startTime && session?.endTime ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                  {session.startTime} - {session.endTime}
                </Typography>
              ) : (
                <Typography variant="caption" color="error">
                  ⚠️ Thiếu dữ liệu thời gian
                </Typography>
              )}
            </Box>

            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                NGÀY
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                {sessionDate.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Typography>
            </Box>

            {isActive && (
              <Box display="flex" alignItems="center">
                <Chip
                  icon={<AlertCircle size={16} />}
                  label="Đang trong giờ học"
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
          <Alert severity={autoAbsent ? 'error' : 'warning'} sx={{ mb: 3 }}>
            {!session?.startTime || !session?.endTime
              ? '⚠️ Thiếu thông tin thời gian. Không thể xác định quyền điểm danh.'
              : sessionDate > new Date()
                ? 'Ca học này chưa bắt đầu. Chỉ có thể điểm danh trong lúc học hoặc trong vòng 24 giờ sau khi kết thúc.'
                : autoAbsent
                  ? '🔴 Đã quá 24 giờ kể từ khi ca học kết thúc. Tất cả học sinh chưa được điểm danh đã tự động được tính là VẮNG MẶT.'
                  : 'Đã quá 24 giờ kể từ khi ca học kết thúc. Không thể chỉnh sửa điểm danh nữa.'}
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
              Không có học viên nào trong khóa học này
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
                TỔNG HỢP ĐIỂM DANH
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
                    Có mặt
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="error.main" fontWeight={700}>
                    {students.filter((s: AttendanceRecord) => s.status === AttendanceStatus.ABSENT).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                    Vắng mặt
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="text.secondary" fontWeight={700}>
                    {students.filter((s: AttendanceRecord) => s.status === AttendanceStatus.NOT_YET).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                    Chưa điểm danh
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
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceDialog;
