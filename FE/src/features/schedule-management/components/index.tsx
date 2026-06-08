'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Grid3x3,
  RotateCcw,
  User,
  Edit,
  Trash2,
  Menu as MenuIcon,
  BookOpen,
  Users,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';

// Type definitions
type ViewMode = 'day' | 'week' | 'month';
type StatusType = 'in_progress' | 'not_yet' | 'completed' | 'cancelled';
type ChipColor = 'success' | 'warning' | 'info' | 'error' | 'default';

interface Course {
  _id: string;
  name?: string;
  courseName?: string;
  status?: string;
  enrolledCount?: number;
  capacity?: number;
}

interface Session {
  _id: string;
  sessionName?: string;
  startTime?: string;
  endTime?: string;
}

interface Teacher {
  _id: string;
  name?: string;
  email?: string;
}

interface CalendarItem {
  _id: string;
  courseId: string | Course;
  sessionId: string | Session;
  teacherId: string | Teacher;
  date: string | Date;
  status: StatusType;
  note?: string;
}

interface EditFormData {
  courseId: string;
  sessionId: string;
  teacherId: string;
  date: string;
  note: string;
}

// ConfirmDialog Component
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Xác nhận",
  message,
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Xóa
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function ManageScheduleCalendar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const { calendars, courses, sessions, users, loading, error: fetchError, refetch } = useScheduleData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'day' : 'week');
  const [selectedSchedule, setSelectedSchedule] = useState<CalendarItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [editFormData, setEditFormData] = useState<EditFormData>({
    courseId: '',
    sessionId: '',
    teacherId: '',
    date: '',
    note: '',
  });

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const extractId = (value: string | { _id: string } | null | undefined): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && value._id) return value._id;
    return '';
  };

  const getWeekDates = (): Date[] => {
    const week: Date[] = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const getDayDate = (): Date[] => [new Date(currentDate)];

  const getMonthDates = (): Date[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1));
    
    const dates: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getCurrentDates = (): Date[] => {
    if (viewMode === 'day') return getDayDate();
    if (viewMode === 'week') return getWeekDates();
    return getMonthDates();
  };

  const handlePrev = (): void => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = (): void => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const getScheduleColor = (courseId: string): string => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    const uniqueCourses = [...new Set((calendars as CalendarItem[]).map((c) => extractId(c.courseId)))];
    const index = uniqueCourses.indexOf(courseId);
    return colors[index % colors.length];
  };

  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'in_progress': 'Đang học',
      'not_yet': 'Chưa bắt đầu',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): ChipColor => {
    const colorMap: Record<string, ChipColor> = {
      'completed': 'success',
      'in_progress': 'info',
      'not_yet': 'warning',
      'cancelled': 'error',
    };
    return colorMap[status] || 'default';
  };

  const getViewTitle = (): string => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates();
      const format: 'short' | 'long' = isMobile ? 'short' : 'long';
      return `${weekDates[0].getDate()} - ${weekDates[6].getDate()} ${weekDates[0].toLocaleDateString('vi-VN', { month: format, year: 'numeric' })}`;
    } else if (viewMode === 'month') {
      return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    }
    return formatDateDisplay(currentDate);
  };

  const handleOpenSchedule = (schedule: CalendarItem): void => {
    setSelectedSchedule(schedule);
    setIsEditing(false);
    setUpdateError('');
    setDeleteError('');
  };

  const handleEdit = (): void => {
    if (!selectedSchedule) return;
    
    setEditFormData({
      courseId: extractId(selectedSchedule.courseId),
      sessionId: extractId(selectedSchedule.sessionId),
      teacherId: extractId(selectedSchedule.teacherId),
      date: formatDate(selectedSchedule.date),
      note: selectedSchedule.note || '',
    });
    setIsEditing(true);
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedSchedule) return;

    try {
      setUpdating(true);
      setUpdateError('');

      await calendarAPI.update(selectedSchedule._id, editFormData);

      setSelectedSchedule(null);
      setIsEditing(false);
      refetch();
    } catch (err: unknown) {
      console.error('Error updating schedule:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setUpdateError(error.response?.data?.message || 'Không thể cập nhật lịch học');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (): void => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!selectedSchedule) return;

    try {
      setDeleting(true);
      setDeleteError('');
      setConfirmOpen(false);
      
      await calendarAPI.delete(selectedSchedule._id);
      
      setSelectedSchedule(null);
      setIsEditing(false);
      refetch();
    } catch (err: unknown) {
      console.error('Error deleting schedule:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setDeleteError(error.response?.data?.message || 'Không thể xóa lịch học');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = (): void => {
    setConfirmOpen(false);
  };

  const getCourseFromSchedule = (schedule: CalendarItem): Course | null => {
    return typeof schedule.courseId === 'object' ? schedule.courseId : null;
  };

  const getTeacherFromSchedule = (schedule: CalendarItem): Teacher | null => {
    return typeof schedule.teacherId === 'object' ? schedule.teacherId : null;
  };

  const renderScheduleCard = (schedule: CalendarItem, onClick: () => void): React.ReactNode => {
    const course = getCourseFromSchedule(schedule);
    const teacher = getTeacherFromSchedule(schedule);
    const courseId = extractId(schedule.courseId);
    const color = getScheduleColor(courseId);
    const studentCount = course?.enrolledCount ?? 0;
    const capacity = course?.capacity;

    return (
      <Card
        key={schedule._id}
        sx={{
          bgcolor: color,
          color: 'white',
          cursor: 'pointer',
          position: 'relative',
          '&:hover': {
            opacity: 0.96,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            '& .mira-slot-settings': { opacity: 1, transform: 'translateX(0)' },
          },
          transition: 'all 0.2s ease',
          mb: 1,
          borderRadius: 2,
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem', lineHeight: 1.3, flex: 1 }}>
              {course?.name || course?.courseName || 'Khóa học chưa xác định'}
            </Typography>
            <Box
              className="mira-slot-settings"
              sx={{
                opacity: 0,
                transform: 'translateX(4px)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                bgcolor: 'rgba(255,255,255,0.22)',
                borderRadius: 1,
                px: 0.6,
                py: 0.25,
                flexShrink: 0,
              }}
            >
              <Settings size={10} />
              <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>
                Cài đặt
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <User size={11} />
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.3 }}>
              {teacher?.name || 'Chưa xác định'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35 }}>
            <Users size={11} />
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.3 }}>
              {studentCount} học viên
              {capacity ? <Box component="span" sx={{ opacity: 0.85, fontWeight: 500 }}>{` / ${capacity}`}</Box> : null}
            </Typography>
          </Box>

          <Chip
            label={formatStatus(schedule.status)}
            size="small"
            sx={{
              mt: 0.75,
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: 'rgba(255,255,255,0.28)',
              color: 'white',
              backdropFilter: 'blur(4px)',
            }}
          />
        </CardContent>
      </Card>
    );
  };

  // Mobile Week View - theo layout mẫu
  const renderMobileWeekView = (): React.ReactNode => {
    const weekDates = getWeekDates();
    const calendarItems = calendars as CalendarItem[];
    
    // Group sessions by time period
    const morningSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour < 12;
    });
    
    const afternoonSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour >= 12;
    });

    return (
      <Box>
        {weekDates.map((date, dateIdx) => {
          const dateStr = formatDate(date);
          const isToday = formatDate(date) === formatDate(new Date());
          
          return (
            <Paper 
              key={dateIdx} 
              sx={{ 
                mb: 2,
                overflow: 'hidden',
                border: isToday ? 2 : 1,
                borderColor: isToday ? 'primary.main' : 'divider',
              }}
            >
              {/* Date Header */}
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: isToday ? 'primary.main' : 'grey.100',
                  color: isToday ? 'white' : 'text.primary',
                  borderBottom: 1,
                  borderColor: 'divider'
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Typography>
                <Typography variant="body2">
                  {formatDateDisplay(date)}
                </Typography>
              </Box>

              {/* Morning Section */}
              <Box sx={{ p: 2 }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight={600} 
                  sx={{ 
                    mb: 1.5,
                    color: '#d97706',
                    fontSize: '0.875rem'
                  }}
                >
                  Buổi sáng
                </Typography>
                
                {morningSessions.map((session: Session) => {
                  const schedules = calendarItems.filter((cal) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return schedules.length > 0 ? (
                    <Box key={session._id}>
                      {schedules.map((schedule) => 
                        renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                      )}
                    </Box>
                  ) : null;
                })}
                
                {morningSessions.every((session: Session) => {
                  const schedules = calendarItems.filter((cal) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });
                  return schedules.length === 0;
                }) && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    -
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Afternoon Section */}
              <Box sx={{ p: 2 }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight={600} 
                  sx={{ 
                    mb: 1.5,
                    color: '#d97706',
                    fontSize: '0.875rem'
                  }}
                >
                  Buổi chiều
                </Typography>
                
                {afternoonSessions.map((session: Session) => {
                  const schedules = calendarItems.filter((cal) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return schedules.length > 0 ? (
                    <Box key={session._id}>
                      {schedules.map((schedule) => 
                        renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                      )}
                    </Box>
                  ) : null;
                })}
                
                {afternoonSessions.every((session: Session) => {
                  const schedules = calendarItems.filter((cal) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });
                  return schedules.length === 0;
                }) && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    -
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  const renderWeekView = (): React.ReactNode => {
    if (isMobile) return renderMobileWeekView();

    const weekDates = getWeekDates();
    const calendarItems = calendars as CalendarItem[];
    const allSessions = [...new Set(calendarItems.map((c) => extractId(c.sessionId)))];
    const sessionMap = new Map<string, Session>();
    
    calendarItems.forEach((cal) => {
      const sessionId = extractId(cal.sessionId);
      if (!sessionMap.has(sessionId) && typeof cal.sessionId === 'object') {
        sessionMap.set(sessionId, cal.sessionId);
      }
    });

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${isTablet ? '100px' : '120px'} repeat(7, 1fr)`, minWidth: 'fit-content', width: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', fontWeight: 600 }}>
            Thời gian
          </Box>
          {weekDates.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <Box key={idx} sx={{ p: isTablet ? 1.5 : 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: isToday ? 'primary.50' : 'grey.50', textAlign: 'center', minWidth: 140 }}>
                <Typography sx={{ fontWeight: 600, color: isToday ? 'primary.main' : 'text.primary', fontSize: isTablet ? '0.875rem' : '1rem' }}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Typography>
                <Typography variant="body2" sx={{ color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {formatDateDisplay(date)}
                </Typography>
              </Box>
            );
          })}

          {allSessions.map((sessionId) => {
            const session = sessionMap.get(sessionId);
            
            return (
              <React.Fragment key={sessionId}>
                <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {session?.sessionName || 'Ca học'}
                  </Typography>
                  {session?.startTime && (
                    <Typography variant="caption" color="text.secondary">
                      {session.startTime} - {session.endTime}
                    </Typography>
                  )}
                </Box>
                {weekDates.map((date, idx) => {
                  const dateStr = formatDate(date);
                  
                  const schedules = calendarItems.filter((cal) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === sessionId;
                  });

                  return (
                    <Box key={idx} sx={{ p: 1.5, borderBottom: 1, borderRight: 1, borderColor: 'divider', minHeight: 120, bgcolor: 'background.paper', minWidth: 140 }}>
                      {schedules.map((schedule) => 
                        renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                      )}
                    </Box>
                  );
                })}
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderDayView = (): React.ReactNode => {
    const date = getCurrentDates()[0];
    const dateStr = formatDate(date);
    const isToday = formatDate(date) === formatDate(new Date());
    const calendarItems = calendars as CalendarItem[];
    
    // Group sessions by time period for mobile
    const morningSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour < 12;
    });
    
    const afternoonSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour >= 12;
    });

    if (isMobile) {
      return (
        <Paper sx={{ overflow: 'hidden' }}>
          {/* Date Header */}
          <Box sx={{ p: 2, bgcolor: isToday ? 'primary.main' : 'grey.100', color: isToday ? 'white' : 'text.primary' }}>
            <Typography variant="h6" fontWeight={600}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </Typography>
            <Typography variant="body1">
              {formatDateDisplay(date)}
            </Typography>
          </Box>

          {/* Morning Section */}
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600} 
              sx={{ mb: 1.5, color: '#d97706', fontSize: '0.875rem' }}
            >
              Buổi sáng
            </Typography>
            
            {morningSessions.map((session: Session) => {
              const schedules = calendarItems.filter((cal) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });

              return schedules.length > 0 ? (
                <Box key={session._id}>
                  {schedules.map((schedule) => 
                    renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                  )}
                </Box>
              ) : null;
            })}
            
            {morningSessions.every((session: Session) => {
              const schedules = calendarItems.filter((cal) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });
              return schedules.length === 0;
            }) && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                -
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Afternoon Section */}
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600} 
              sx={{ mb: 1.5, color: '#d97706', fontSize: '0.875rem' }}
            >
              Buổi chiều
            </Typography>
            
            {afternoonSessions.map((session: Session) => {
              const schedules = calendarItems.filter((cal) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });

              return schedules.length > 0 ? (
                <Box key={session._id}>
                  {schedules.map((schedule) => 
                    renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                  )}
                </Box>
              ) : null;
            })}
            
            {afternoonSessions.every((session: Session) => {
              const schedules = calendarItems.filter((cal) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });
              return schedules.length === 0;
            }) && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                -
              </Typography>
            )}
          </Box>
        </Paper>
      );
    }

    // Desktop day view
    const allSessions = [...new Set(calendarItems.map((c) => extractId(c.sessionId)))];
    const sessionMap = new Map<string, Session>();
    
    calendarItems.forEach((cal) => {
      const sessionId = extractId(cal.sessionId);
      if (!sessionMap.has(sessionId) && typeof cal.sessionId === 'object') {
        sessionMap.set(sessionId, cal.sessionId);
      }
    });

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${isTablet ? '100px' : '120px'} 1fr`, minWidth: 'fit-content', width: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', fontWeight: 600 }}>
            Thời gian
          </Box>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: isToday ? 'primary.50' : 'grey.50', textAlign: 'center', minWidth: 300 }}>
            <Typography sx={{ fontWeight: 600, color: isToday ? 'primary.main' : 'text.primary' }}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </Typography>
            <Typography variant="body2" sx={{ color: isToday ? 'primary.main' : 'text.secondary' }}>
              {formatDateDisplay(date)}
            </Typography>
          </Box>

          {allSessions.map((sessionId) => {
            const session = sessionMap.get(sessionId);
            
            return (
              <React.Fragment key={sessionId}>
                <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {session?.sessionName || 'Ca học'}
                  </Typography>
                  {session?.startTime && (
                    <Typography variant="caption" color="text.secondary">
                      {session.startTime} - {session.endTime}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ p: 1.5, borderBottom: 1, borderRight: 1, borderColor: 'divider', minHeight: 120, bgcolor: 'background.paper', minWidth: 300 }}>
                  {calendarItems
                    .filter((cal) => {
                      const calDate = formatDate(cal.date);
                      const calSessionId = extractId(cal.sessionId);
                      return calDate === dateStr && calSessionId === sessionId;
                    })
                    .map((schedule) => 
                      renderScheduleCard(schedule, () => handleOpenSchedule(schedule))
                    )}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderMonthView = (): React.ReactNode => {
    const monthDates = getMonthDates();
    const calendarItems = calendars as CalendarItem[];
    
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, gap: isMobile ? 0.5 : 1 }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <Box key={day} sx={{ p: isMobile ? 0.5 : 1, textAlign: 'center', fontWeight: 600, bgcolor: 'grey.50', fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
              {isMobile ? day.slice(0, 1) : day}
            </Box>
          ))}
          
          {monthDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const isToday = formatDate(date) === formatDate(new Date());
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            
            const daySchedules = calendarItems.filter((cal) => formatDate(cal.date) === dateStr);

            return (
              <Box 
                key={idx} 
                sx={{ 
                  p: isMobile ? 0.5 : 1, 
                  minHeight: isMobile ? 60 : 100, 
                  border: 1, 
                  borderColor: 'divider',
                  bgcolor: isToday ? 'primary.50' : isCurrentMonth ? 'background.paper' : 'grey.50',
                  opacity: isCurrentMonth ? 1 : 0.5
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'primary.main' : 'text.primary',
                    mb: 0.5,
                    fontSize: isMobile ? '0.7rem' : '0.875rem'
                  }}
                >
                  {date.getDate()}
                </Typography>
                {daySchedules.map((schedule) => {
                  const course = getCourseFromSchedule(schedule);
                  const courseId = extractId(schedule.courseId);
                  const color = getScheduleColor(courseId);

                  return (
                    <Box
                      key={schedule._id}
                      sx={{
                        p: isMobile ? 0.3 : 0.5,
                        mb: 0.5,
                        bgcolor: color,
                        color: 'white',
                        borderRadius: 1,
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.6rem' : '0.7rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': { opacity: 0.9 }
                      }}
                      onClick={() => handleOpenSchedule(schedule)}
                    >
                      {course?.name || course?.courseName || 'Chưa xác định'}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const activeCourses = (courses as Course[]).filter((c) => c.status === 'active' || c.status === 'not_yet');
  const teachers = users as Teacher[];
  const sessionList = sessions as Session[];

  const getSelectedCourse = (): Course | null => {
    if (!selectedSchedule) return null;
    return typeof selectedSchedule.courseId === 'object' ? selectedSchedule.courseId : null;
  };

  const getSelectedTeacher = (): Teacher | null => {
    if (!selectedSchedule) return null;
    return typeof selectedSchedule.teacherId === 'object' ? selectedSchedule.teacherId : null;
  };

  const getSelectedSession = (): Session | null => {
    if (!selectedSchedule) return null;
    return typeof selectedSchedule.sessionId === 'object' ? selectedSchedule.sessionId : null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError}
        </Alert>
      )}

      {/* Header Controls */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="space-between" alignItems="center">
          <Button 
            variant="outlined" 
            onClick={() => setCurrentDate(new Date())}
            size={isMobile ? 'small' : 'medium'}
            startIcon={<RotateCcw size={16} />}
            fullWidth={isMobile}
          >
            {isMobile ? 'Hôm nay' : 'Quay lại hôm nay'}
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: isMobile ? '100%' : 'auto' }}>
            <IconButton onClick={handlePrev} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {getViewTitle()}
            </Typography>
            <IconButton onClick={handleNext} size="small">
              <ChevronRight />
            </IconButton>
          </Stack>

          {isMobile ? (
            <IconButton onClick={() => setMobileMenuOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button variant={viewMode === 'day' ? 'contained' : 'outlined'} onClick={() => setViewMode('day')} size="small" startIcon={<Clock size={16} />}>
                Ngày
              </Button>
              <Button variant={viewMode === 'week' ? 'contained' : 'outlined'} onClick={() => setViewMode('week')} size="small" startIcon={<CalendarDays size={16} />}>
                Tuần
              </Button>
              <Button variant={viewMode === 'month' ? 'contained' : 'outlined'} onClick={() => setViewMode('month')} size="small" startIcon={<Grid3x3 size={16} />}>
                Tháng
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Mobile View Selector Drawer */}
      <Drawer anchor="bottom" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Chọn chế độ xem</Typography>
          <List>
            <ListItemButton onClick={() => { setViewMode('day'); setMobileMenuOpen(false); }}>
              <Clock size={20} style={{ marginRight: 12 }} />
              <ListItemText primary="Xem theo ngày" />
            </ListItemButton>
            <Divider />
            <ListItemButton onClick={() => { setViewMode('week'); setMobileMenuOpen(false); }}>
              <CalendarDays size={20} style={{ marginRight: 12 }} />
              <ListItemText primary="Xem theo tuần" />
            </ListItemButton>
            <Divider />
            <ListItemButton onClick={() => { setViewMode('month'); setMobileMenuOpen(false); }}>
              <Grid3x3 size={20} style={{ marginRight: 12 }} />
              <ListItemText primary="Xem theo tháng" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Calendar View */}
      <Paper sx={{ overflow: 'hidden', p: isMobile ? 2 : 0 }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Paper>

      {/* Schedule Detail/Edit Dialog */}
      <Dialog
        open={!!selectedSchedule}
        onClose={() => { setSelectedSchedule(null); setIsEditing(false); }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        {selectedSchedule && (
          <>
            <DialogTitle sx={{ pb: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: isEditing ? 'warning.50' : 'primary.50',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isEditing ? <Edit size={20} color={theme.palette.warning.main} /> : <CalendarDays size={20} color={theme.palette.primary.main} />}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {isEditing ? 'Sửa lịch học' : 'Chi tiết lịch học'}
                    </Typography>
                    {!isEditing && (
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        Nhấn Cài đặt để cập nhật thông tin
                      </Typography>
                    )}
                  </Box>
                </Stack>
                {!isEditing && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleEdit}
                    startIcon={<Settings size={16} />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 1.5,
                      boxShadow: '0 2px 8px rgba(185, 0, 0, 0.18)',
                    }}
                  >
                    Cài đặt
                  </Button>
                )}
              </Stack>
            </DialogTitle>
            <DialogContent>
              {(deleteError || updateError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setDeleteError(''); setUpdateError(''); }}>
                  {deleteError || updateError}
                </Alert>
              )}

              {!isEditing ? (
                <Stack spacing={2.25} sx={{ pt: 1 }}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <BookOpen size={15} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Khóa học
                      </Typography>
                    </Stack>
                    <Typography variant="body1" fontWeight={600}>
                      {getSelectedCourse()?.name || getSelectedCourse()?.courseName || 'Khóa học chưa xác định'}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <GraduationCap size={15} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Giáo viên phụ trách
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: 'primary.main',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                        }}
                      >
                        {getSelectedTeacher()?.name?.charAt(0).toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={600} noWrap>
                          {getSelectedTeacher()?.name || 'Chưa xác định'}
                        </Typography>
                        {getSelectedTeacher()?.email && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {getSelectedTeacher()?.email}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Users size={15} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Sĩ số học viên
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          bgcolor: 'rgba(185, 0, 0, 0.08)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Users size={18} color={theme.palette.primary.main} />
                      </Box>
                      <Box>
                        <Typography variant="body1" fontWeight={700}>
                          {getSelectedCourse()?.enrolledCount ?? 0}
                          {getSelectedCourse()?.capacity ? (
                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                              {` / ${getSelectedCourse()?.capacity}`}
                            </Box>
                          ) : null}
                          <Box component="span" sx={{ ml: 0.75, fontSize: '0.78rem', color: 'text.secondary', fontWeight: 500 }}>
                            học viên
                          </Box>
                        </Typography>
                        {getSelectedCourse()?.capacity && (
                          <Typography variant="caption" color="text.secondary">
                            Còn {(getSelectedCourse()?.capacity ?? 0) - (getSelectedCourse()?.enrolledCount ?? 0)} chỗ trống
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Clock size={15} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Ca học
                      </Typography>
                    </Stack>
                    <Typography variant="body1" fontWeight={500}>
                      {getSelectedSession()?.sessionName || 'Chưa xác định'}
                    </Typography>
                    {getSelectedSession()?.startTime && (
                      <Typography variant="caption" color="text.secondary">
                        {getSelectedSession()?.startTime} - {getSelectedSession()?.endTime}
                      </Typography>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <CalendarDays size={15} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Ngày
                      </Typography>
                    </Stack>
                    <Typography variant="body1">
                      {formatDateDisplay(selectedSchedule.date)}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom>
                      Trạng thái
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={formatStatus(selectedSchedule.status)}
                        size="small"
                        color={getStatusColor(selectedSchedule.status)}
                      />
                    </Box>
                  </Box>

                  {selectedSchedule.note && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom>
                          Ghi chú
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          {selectedSchedule.note}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              ) : (
                <Stack spacing={3} sx={{ pt: 1 }}>
                  <FormControl fullWidth required>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <BookOpen size={18} />
                      <InputLabel>Khóa học</InputLabel>
                    </Stack>
                    <Select
                      value={editFormData.courseId}
                      onChange={(e: SelectChangeEvent) => setEditFormData({ ...editFormData, courseId: e.target.value })}
                      label="Khóa học"
                      disabled={updating}
                    >
                      {activeCourses.map((course) => (
                        <MenuItem key={course._id} value={course._id}>
                          {course.courseName || course.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Clock size={18} />
                      <InputLabel>Ca học</InputLabel>
                    </Stack>
                    <Select
                      value={editFormData.sessionId}
                      onChange={(e: SelectChangeEvent) => setEditFormData({ ...editFormData, sessionId: e.target.value })}
                      label="Ca học"
                      disabled={updating}
                    >
                      {sessionList.map((session) => (
                        <MenuItem key={session._id} value={session._id}>
                          {session.sessionName} ({session.startTime} - {session.endTime})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <User size={18} />
                      <InputLabel>Giáo viên</InputLabel>
                    </Stack>
                    <Select
                      value={editFormData.teacherId}
                      onChange={(e: SelectChangeEvent) => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                      label="Giáo viên"
                      disabled={updating}
                    >
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher._id} value={teacher._id}>
                          {teacher.name} - {teacher.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CalendarDays size={18} />
                      <Typography variant="body2" fontWeight={600}>Ngày</Typography>
                    </Stack>
                    <TextField
                      fullWidth
                      type="date"
                      value={editFormData.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      disabled={updating}
                      required
                    />
                    {editFormData.date && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Hiển thị: {formatDateDisplay(editFormData.date)}
                      </Typography>
                    )}
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Ghi chú (Tùy chọn)"
                    multiline
                    rows={3}
                    value={editFormData.note}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, note: e.target.value })}
                    disabled={updating}
                  />
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ flexDirection: isMobile ? 'column' : 'row', gap: 1, p: 2, borderTop: 1, borderColor: 'divider' }}>
              {!isEditing ? (
                <>
                  <Button
                    onClick={() => { setSelectedSchedule(null); setIsEditing(false); }}
                    disabled={deleting}
                    fullWidth={isMobile}
                    variant="outlined"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Đóng
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    startIcon={deleting ? <CircularProgress size={20} /> : <Trash2 size={18} />}
                    fullWidth={isMobile}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {deleting ? 'Đang xóa...' : 'Xóa lịch học'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setIsEditing(false)}
                    disabled={updating}
                    fullWidth={isMobile}
                    variant="outlined"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdate}
                    disabled={updating}
                    startIcon={updating ? <CircularProgress size={20} /> : null}
                    fullWidth={isMobile}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Xóa lịch học"
        message={`Bạn có chắc chắn muốn xóa lịch học này không?\n\nKhóa học: ${getSelectedCourse()?.name || getSelectedCourse()?.courseName || 'Chưa xác định'}\nNgày: ${selectedSchedule ? formatDateDisplay(selectedSchedule.date) : ''}\n\nHành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
}
