import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Card,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  CalendarDays,
} from 'lucide-react';

import { teacherScheduleService } from '../../services/scheduleTeacherService';
import RequestModal from './RequestModal';
import type { Session, TeacherScheduleView, RequestStatus } from '../../types/scheduleTeacher.types';

type ScheduleGridItem = TeacherScheduleView;

interface ScheduleGrid {
  [periodName: string]: {
    [dateStr: string]: ScheduleGridItem | null;
  };
}

interface SelectedSchedule {
  calendarId: string;
  dateStr: string;
  sessionId: string;
  courseName: string;
  startTime: string;
  endTime: string;
  sessionName: string;
}

const ScheduleTeacher = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [schedule, setSchedule] = useState<TeacherScheduleView[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SelectedSchedule | null>(null);
  const [weekOptions, setWeekOptions] = useState<{ value: string; label: string }[]>([]);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const toLocalDateString = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  };

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  useEffect(() => {
    const options: { value: string; label: string }[] = [];
    const startYear = 2004;
    const endYear = 2050;

    for (let year = startYear; year <= endYear; year++) {
      const currentDate = getMonday(new Date(year, 0, 1));
      while (currentDate.getFullYear() <= year) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekStart.getFullYear() === year || weekEnd.getFullYear() === year) {
          const value = toLocalDateString(weekStart);
          const label = `${weekStart.getDate().toString().padStart(2, '0')}.${(weekStart.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${weekStart.getFullYear()} - ${weekEnd
              .getDate()
              .toString()
              .padStart(2, '0')}.${(weekEnd.getMonth() + 1)
                .toString()
                .padStart(2, '0')}.${weekEnd.getFullYear()}`;
          options.push({ value, label });
        }
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }
    setWeekOptions(options);
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        console.log('Fetching sessions first...');
        const response = await teacherScheduleService.getSessions();
        if (response.success && response.data) {
          setSessions(response.data);
          console.log('Sessions loaded:', response.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (sessions.length === 0) {
        console.log('Waiting for sessions to load...');
        return;
      }

      try {
        setLoading(true);

        const weekStart = toLocalDateString(currentWeekStart);
        const response = await teacherScheduleService.getScheduleByWeek(weekStart);

        if (response.success && response.data) {
          setSchedule(response.data);
          console.log('Schedule loaded with sessions:', response.data.length);
        } else {
          showToast(response.message || 'Không thể tải lịch dạy', 'error');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Không thể tải lịch dạy';
        showToast(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentWeekStart, sessions]);

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const periods = useMemo(
    () => [
      { name: 'Morning', displayTime: '08:00 - 12:00', label: 'Buổi sáng' },
      { name: 'Afternoon', displayTime: '13:00 - 17:00', label: 'Buổi chiều' },
    ],
    []
  );

  const scheduleGrid = useMemo(() => {
    const grid: ScheduleGrid = {};
    periods.forEach(period => {
      grid[period.name] = {};
      weekDates.forEach(date => {
        const dateStr = toLocalDateString(date);
        const schedulesForDate = schedule.filter(s => s.date === dateStr);
        const daySchedules = schedulesForDate.filter(s => {
          if (!s.startTime) return false;
          const hour = parseInt(s.startTime.split(':')[0]);
          const timeInMinutes = hour * 60;
          const belongsToPeriod =
            period.name === 'Morning'
              ? timeInMinutes >= 6 * 60 && timeInMinutes < 13 * 60
              : timeInMinutes >= 13 * 60 && timeInMinutes < 19 * 60;
          return belongsToPeriod;
        });
        grid[period.name][dateStr] = daySchedules[0] || null;
      });
    });
    return grid;
  }, [schedule, periods, weekDates]);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentWeekStart(newDate);
  };

  const handleWeekChange = (event: SelectChangeEvent<string>) => {
    const selectedValue = event.target.value;
    const selectedDate = new Date(selectedValue);
    setCurrentWeekStart(selectedDate);
  };

  const handleTodayClick = () => {
    const today = getMonday(new Date());
    setCurrentWeekStart(today);
  };

  const canRegister = (dateStr: string, startTime: string) => {
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const scheduleDateTime = new Date(dateStr);
    scheduleDateTime.setHours(hours, minutes, 0, 0);
    const hoursDiff = (scheduleDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  };

  const handleRegisterClick = (scheduleItem: ScheduleGridItem) => {
    setSelectedSchedule({
      calendarId: scheduleItem.calendarId,
      dateStr: scheduleItem.date,
      sessionId: scheduleItem.sessionId,
      courseName: scheduleItem.courseName,
      startTime: scheduleItem.startTime,
      endTime: scheduleItem.endTime,
      sessionName: scheduleItem.sessionName,
    });
    setModalOpen(true);
  };

  const handleSubmitRequest = async (reason: string) => {
    if (!selectedSchedule?.calendarId) {
      return;
    }

    try {
      const response = await teacherScheduleService.createRequest({
        calendarId: selectedSchedule.calendarId,
        reason: reason.trim(),
      });

      if (response.success) {
        setModalOpen(false);

        setSchedule(prevSchedule =>
          prevSchedule.map(item =>
            item.calendarId === selectedSchedule.calendarId
              ? {
                ...item,
                request: {
                  _id: response.data?._id || 'temp-id',
                  status: 'pending' as RequestStatus,
                  reason: reason.trim(),
                },
              }
              : item
          )
        );

        setSelectedSchedule(null);

        const weekStart = toLocalDateString(currentWeekStart);
        const scheduleResponse = await teacherScheduleService.getScheduleByWeek(weekStart);
        if (scheduleResponse.success && scheduleResponse.data) {
          setSchedule(scheduleResponse.data);
        }

        showToast('Gửi yêu cầu nghỉ học thành công', 'success');
      } else {
        showToast(response.message || 'Không thể gửi yêu cầu', 'error');
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message
          : error instanceof Error
            ? error.message
            : 'Lỗi kết nối máy chủ';
      showToast(errorMsg, 'error');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSchedule(null);
  };

  const renderScheduleItemMobile = (scheduleItem: ScheduleGridItem | null, date: Date) => {
    const dateStr = toLocalDateString(date);

    if (!scheduleItem) {
      return (
        <Box
          sx={{
            p: 2,
            textAlign: 'center',
            color: '#999',
            fontStyle: 'italic',
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.85rem' }}>Không có lớp</Typography>
        </Box>
      );
    }

    const canReg = canRegister(dateStr, scheduleItem.startTime || '00:00');
    const hasRequest = scheduleItem.request?.status;

    return (
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookOpen size={16} color="#1976d2" />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1976d2' }}>
              {scheduleItem.courseName}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={14} color="#4caf50" />
            <Typography sx={{ fontSize: '0.85rem', color: '#4caf50', fontWeight: 500 }}>
              {scheduleItem.startTime} - {scheduleItem.endTime}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
            {hasRequest ? (
              <Button
                disabled
                fullWidth
                size="small"
                variant="contained"
                sx={{
                  bgcolor: getStatusColor(scheduleItem.request!.status),
                  color: 'white',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-disabled': {
                    bgcolor: getStatusColor(scheduleItem.request!.status),
                    color: 'white'
                  },
                }}
              >
                {getStatusText(scheduleItem.request!.status)}
              </Button>
            ) : canReg ? (
              <Button
                fullWidth
                size="small"
                variant="contained"
                onClick={() => handleRegisterClick(scheduleItem)}
                sx={{
                  bgcolor: '#1976d2',
                  color: 'white',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#1565c0' },
                }}
              >
                Xin nghỉ
              </Button>
            ) : (
              <Button
                disabled
                fullWidth
                size="small"
                variant="contained"
                sx={{
                  bgcolor: '#424242',
                  color: 'white',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-disabled': { bgcolor: '#424242', color: 'white' },
                }}
              >
                Hết hạn
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderScheduleItemDesktop = (scheduleItem: ScheduleGridItem | null, date: Date) => {
    const dateStr = toLocalDateString(date);

    if (!scheduleItem) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={140}>
          <Typography sx={{ color: '#f44336', fontSize: 20, fontWeight: 300 }}>—</Typography>
        </Box>
      );
    }

    const canReg = canRegister(dateStr, scheduleItem.startTime || '00:00');
    const hasRequest = scheduleItem.request?.status;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 1.5,
          minHeight: 140,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <BookOpen size={14} color="#1976d2" />
            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{scheduleItem.courseName}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Clock size={14} color="#4caf50" />
            <Typography sx={{ fontSize: 10.5, color: '#4caf50', fontWeight: 600 }}>
              {scheduleItem.startTime} - {scheduleItem.endTime}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <CalendarDays size={14} color="#1976d2" />
            <Typography sx={{ fontSize: 10.5 }}>
              {date.getDate().toString().padStart(2, '0')}.{(date.getMonth() + 1).toString().padStart(2, '0')}.
              {date.getFullYear()}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 2,
          }}
        >
          {hasRequest ? (
            <Button
              disabled
              size="small"
              variant="contained"
              sx={btnStyle(getStatusColor(scheduleItem.request!.status))}
            >
              {getStatusText(scheduleItem.request!.status)}
            </Button>
          ) : canReg ? (
            <Button
              size="small"
              variant="contained"
              onClick={() => handleRegisterClick(scheduleItem)}
              sx={btnStyle('#1976d2', true)}
            >
              Xin nghỉ
            </Button>
          ) : (
            <Button
              disabled
              size="small"
              variant="contained"
              sx={{
                bgcolor: '#424242',
                color: 'white',
                fontSize: 9,
                textTransform: 'none',
                fontWeight: 700,
                px: 1,
                py: 0.3,
                '&.Mui-disabled': { bgcolor: '#424242', color: 'white' },
              }}
            >
              Hết hạn
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  const renderMobileView = () => {
    return (
      <Grid container spacing={2}>
        {weekDates.map((date, dayIndex) => {
          const dateStr = toLocalDateString(date);
          const dayName = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'][dayIndex];

          return (
            <Grid item xs={12} key={dayIndex}>
              <Card
                elevation={3}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Box
                  sx={{
                    bgcolor: '#B90000',
                    color: 'white',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarDays size={18} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {dayName}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {date.getDate().toString().padStart(2, '0')}/{(date.getMonth() + 1).toString().padStart(2, '0')}/
                    {date.getFullYear()}
                  </Typography>
                </Box>

                <Box sx={{ borderBottom: '1px solid #e0e0e0' }}>
                  <Box
                    sx={{
                      bgcolor: '#f5f5f5',
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Clock size={14} color="#666" />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>
                      Buổi sáng (08:00 - 12:00)
                    </Typography>
                  </Box>
                  {renderScheduleItemMobile(scheduleGrid['Morning']?.[dateStr], date)}
                </Box>

                <Box>
                  <Box
                    sx={{
                      bgcolor: '#f5f5f5',
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Clock size={14} color="#666" />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>
                      Buổi chiều (13:00 - 17:00)
                    </Typography>
                  </Box>
                  {renderScheduleItemMobile(scheduleGrid['Afternoon']?.[dateStr], date)}
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderDesktopView = () => {
    return (
      <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        <Table
          sx={{
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            '& th, & td': {
              border: '1px solid #e0e0e0',
            },
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600, width: 100 }}>Buổi</TableCell>
              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((day, idx) => (
                <TableCell key={idx} align="center" sx={{ minWidth: 120 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {day}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {['Morning', 'Afternoon'].map(period => (
              <TableRow key={period}>
                <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>{period === 'Morning' ? 'Sáng' : 'Chiều'}</TableCell>
                {weekDates.map((date, idx) => {
                  const dateStr = toLocalDateString(date);
                  const item = scheduleGrid[period]?.[dateStr];
                  return (
                    <TableCell key={idx} sx={{ p: 0, verticalAlign: 'top' }}>
                      {renderScheduleItemDesktop(item, date)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading && schedule.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress sx={{ color: '#B90000' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1600px', mx: 'auto', px: isMobile ? 2 : 2, pb: 12 }}>
      <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
        Teaching Schedule
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigateWeek(-1)} size="small">
          <ChevronLeft size={20} />
        </IconButton>

        <Button
          variant="outlined"
          size="small"
          onClick={handleTodayClick}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#B90000',
            color: '#B90000',
            minWidth: isMobile ? 100 : 120,
            height: 40,
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            '&:hover': {
              borderColor: '#d66a0e',
              bgcolor: 'rgba(236, 117, 16, 0.04)',
            },
          }}
        >
          Tuần này
        </Button>

        <FormControl sx={{ minWidth: isMobile ? 200 : 270, maxWidth: isMobile ? 200 : 270, flexGrow: isMobile ? 1 : 0 }}>
          <Select
            value={toLocalDateString(currentWeekStart)}
            onChange={handleWeekChange}
            size="small"
            startAdornment={<Calendar size={18} style={{ marginRight: 8, marginLeft: 8 }} />}
            sx={{ height: 40, fontSize: isMobile ? '0.85rem' : '1rem' }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
              },
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
            }}
          >
            {weekOptions.map(option => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton onClick={() => navigateWeek(1)} size="small">
          <ChevronRight size={20} />
        </IconButton>
      </Box>

      {isMobile ? renderMobileView() : renderDesktopView()}

      <RequestModal
        open={modalOpen}
        onClose={handleCloseModal}
        scheduleItem={selectedSchedule}
        sessions={sessions}
        onSubmit={handleSubmitRequest}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{
            width: '100%',
            backgroundColor:
              toast.severity === 'success' ? '#4caf50' : toast.severity === 'error' ? '#f44336' : '#B90000',
            color: 'white',
            fontWeight: 500,
            '& .MuiAlert-icon': { color: 'white' },
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
const btnStyle = (color: string, isActive = false) => ({
  bgcolor: color,
  color: 'white',
  fontSize: 9,
  textTransform: 'none',
  fontWeight: 700,
  px: 1,
  py: 0.3,
  '&:hover': { bgcolor: isActive ? '#1565c0' : color },
  '&.Mui-disabled': { bgcolor: color, color: 'white' },
});

const getStatusColor = (status: RequestStatus) => {
  switch (status) {
    case 'accepted':
      return '#4caf50';
    case 'rejected':
      return '#f44336';
    case 'pending':
      return '#B90000';
    default:
      return '#9e9e9e';
  }
};

const getStatusText = (status: RequestStatus) => {
  switch (status) {
    case 'accepted':
      return 'Đã chấp nhận';
    case 'rejected':
      return 'Đã từ chối';
    case 'pending':
      return 'Đang chờ duyệt';
    default:
      return 'Không xác định';
  }
};

export default ScheduleTeacher;
