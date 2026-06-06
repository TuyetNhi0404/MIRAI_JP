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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Plus, RotateCcw, User, CalendarDays, BookOpen } from 'lucide-react';
import { AxiosError } from 'axios';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import type { User as UserType, Course, Session, Calendar, PopulatedCourse, PopulatedTeacher } from '../../../types/schedule.types';

interface SlotInfo {
  date: Date;
  sessionId: string;
}

export default function ScheduleCreatorCalendar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { courses, sessions, users, calendars, refetch } = useScheduleData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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

  const extractId = (value: string | { _id: string } | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in value) return value._id;
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

  const weekDates = getWeekDates();

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  const getScheduleColor = (courseId: string): string => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const index = courses.findIndex((c: Course) => c._id === courseId);
    return colors[index % colors.length];
  };

  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'in_progress': 'Đang tiến hành',
      'not_yet': 'Chưa bắt đầu',
      'completed': 'Đã hoàn thành',
      'cancelled': 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const handleSlotClick = (date: Date, sessionId: string) => {
    setSelectedSlot({ date, sessionId });
    setSelectedCourse('');
    setSelectedTeacher('');
    setNote('');
    setError('');
    setOpenDialog(true);
  };

  const handleCreateSchedule = async () => {
    if (!selectedSlot || !selectedCourse || !selectedTeacher) {
      setError('Vui lòng chọn cả khóa học và giáo viên');
      return;
    }

    try {
      setCreating(true);
      setError('');

      await calendarAPI.create({
        courseId: selectedCourse,
        sessionId: selectedSlot.sessionId,
        teacherId: selectedTeacher,
        date: formatDate(selectedSlot.date),
        note: note,
      });

      setOpenDialog(false);
      refetch();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error('Error creating schedule:', err);
      setError(axiosError.response?.data?.message || 'Không thể tạo lịch học');
    } finally {
      setCreating(false);
    }
  };

  const teachers = users;
  const activeCourses = courses.filter((c: Course) => 
    c.status === 'not_yet' || c.status === 'in_progress'
  );

  const renderScheduleCard = (schedule: Calendar) => {
    const course = typeof schedule.courseId === 'object' ? schedule.courseId as PopulatedCourse : null;
    const teacher = typeof schedule.teacherId === 'object' ? schedule.teacherId as PopulatedTeacher : null;
    const courseId = extractId(schedule.courseId);
    const color = getScheduleColor(courseId);

    return (
      <Card 
        key={schedule._id} 
        sx={{ 
          mb: 1, 
          bgcolor: color, 
          color: 'white',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, fontSize: '0.875rem' }}>
            {course?.name || course?.courseName || 'Khóa học không xác định'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <User size={12} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {teacher?.name || teacher?.username || 'Không xác định'}
            </Typography>
          </Box>
          <Chip
            label={formatStatus(schedule.status)}
            size="small"
            sx={{ 
              height: 18, 
              fontSize: '0.65rem', 
              bgcolor: 'rgba(255,255,255,0.3)', 
              color: 'white' 
            }}
          />
        </CardContent>
      </Card>
    );
  };

  // Mobile View - Theo layout mẫu
  const renderMobileView = () => {
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
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

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
                  Sáng
                </Typography>
                
                {morningSessions.length > 0 ? (
                  morningSessions.map((session: Session) => {
                    const schedules = calendars.filter((cal: Calendar) => {
                      const calDate = formatDate(cal.date);
                      const calSessionId = extractId(cal.sessionId);
                      return calDate === dateStr && calSessionId === session._id;
                    });

                    return (
                      <Box key={session._id} sx={{ mb: 2 }}>
                        {schedules.length > 0 ? (
                          schedules.map((schedule: Calendar) => renderScheduleCard(schedule))
                        ) : (
                          <Box 
                            sx={{ 
                              p: 2, 
                              border: 1, 
                              borderColor: 'divider',
                              borderStyle: 'dashed',
                              borderRadius: 2,
                              textAlign: 'center',
                              color: 'text.secondary',
                              cursor: !isPast ? 'pointer' : 'not-allowed',
                              '&:hover': !isPast ? { bgcolor: 'primary.50', borderColor: 'primary.main' } : {},
                            }}
                            onClick={() => !isPast && handleSlotClick(date, session._id)}
                          >
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                              {session.sessionName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            {!isPast && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <Plus size={16} />
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                ) : (
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
                  Chiều
                </Typography>
                
                {afternoonSessions.length > 0 ? (
                  afternoonSessions.map((session: Session) => {
                    const schedules = calendars.filter((cal: Calendar) => {
                      const calDate = formatDate(cal.date);
                      const calSessionId = extractId(cal.sessionId);
                      return calDate === dateStr && calSessionId === session._id;
                    });

                    return (
                      <Box key={session._id} sx={{ mb: 2 }}>
                        {schedules.length > 0 ? (
                          schedules.map((schedule: Calendar) => renderScheduleCard(schedule))
                        ) : (
                          <Box 
                            sx={{ 
                              p: 2, 
                              border: 1, 
                              borderColor: 'divider',
                              borderStyle: 'dashed',
                              borderRadius: 2,
                              textAlign: 'center',
                              color: 'text.secondary',
                              cursor: !isPast ? 'pointer' : 'not-allowed',
                              '&:hover': !isPast ? { bgcolor: 'primary.50', borderColor: 'primary.main' } : {},
                            }}
                            onClick={() => !isPast && handleSlotClick(date, session._id)}
                          >
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                              {session.sessionName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            {!isPast && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <Plus size={16} />
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                ) : (
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

  // Desktop View
  const renderDesktopView = () => {
    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '120px repeat(7, 1fr)',
          minWidth: 'fit-content',
          width: '100%',
        }}>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', fontWeight: 600 }}>
            Thời gian
          </Box>
          {weekDates.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <Box 
                key={idx} 
                sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderRight: 1, 
                  borderColor: 'divider', 
                  bgcolor: isToday ? 'primary.50' : 'grey.50', 
                  textAlign: 'center',
                  minWidth: 140,
                }}
              >
                <Typography sx={{ fontWeight: 600, color: isToday ? 'primary.main' : 'text.primary' }}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Typography>
                <Typography variant="body2" sx={{ color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {formatDateDisplay(date)}
                </Typography>
              </Box>
            );
          })}

          {sessions.map((session: Session) => (
            <React.Fragment key={session._id}>
              <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Typography variant="body2" fontWeight={600}>{session.sessionName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {session.startTime} - {session.endTime}
                </Typography>
              </Box>
              {weekDates.map((date, idx) => {
                const dateStr = formatDate(date);
                const schedules = calendars.filter((cal: Calendar) => {
                  const calDate = formatDate(cal.date);
                  const calSessionId = extractId(cal.sessionId);
                  return calDate === dateStr && calSessionId === session._id;
                });
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderBottom: 1,
                      borderRight: 1,
                      borderColor: 'divider',
                      minHeight: 120,
                      bgcolor: isPast ? 'grey.100' : 'background.paper',
                      cursor: !isPast ? 'pointer' : 'not-allowed',
                      '&:hover': !isPast ? { bgcolor: 'primary.50' } : {},
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      minWidth: 140,
                    }}
                    onClick={() => !isPast && handleSlotClick(date, session._id)}
                  >
                    {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                    {schedules.length === 0 && !isPast && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, opacity: 0.3 }}>
                        <Plus size={24} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center" justifyContent="space-between">
          <Button 
            variant="outlined" 
            onClick={handleToday}
            size={isMobile ? 'small' : 'medium'}
            startIcon={<RotateCcw size={16} />}
            fullWidth={isMobile}
          >
            Tuần này
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: isMobile ? '100%' : 'auto' }}>
            <IconButton onClick={handlePrev} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {weekDates[0].getDate()} - {weekDates[6].getDate()} {weekDates[0].toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={handleNext} size="small">
              <ChevronRight />
            </IconButton>
          </Stack>

          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Nhấp để tạo
              </Typography>
              <Plus size={16} />
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: isMobile ? 2 : 0, overflow: 'hidden' }}>
        {isMobile ? renderMobileView() : renderDesktopView()}
      </Paper>

      {/* Create Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarDays size={24} />
            <Typography variant="h6">Tạo lịch học</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack spacing={3} sx={{ pt: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Ngày</Typography>
              <Typography variant="body1" fontWeight={600}>
                {selectedSlot?.date && formatDateDisplay(selectedSlot.date)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Ca học</Typography>
              <Typography variant="body1" fontWeight={600}>
                {sessions.find((s: Session) => s._id === selectedSlot?.sessionId)?.sessionName}
              </Typography>
            </Box>

            <Divider />

            <FormControl fullWidth required>
              <InputLabel>Khóa học</InputLabel>
              <Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                label="Khóa học"
                disabled={creating}
              >
                <MenuItem value=""><em>Chọn một khóa học</em></MenuItem>
                {activeCourses.map((course: Course) => (
                  <MenuItem key={course._id} value={course._id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <BookOpen size={16} />
                      <span>{course.name || course.courseName}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Giáo viên</InputLabel>
              <Select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                label="Giáo viên"
                disabled={creating}
              >
                <MenuItem value=""><em>Chọn một giáo viên</em></MenuItem>
                {teachers.map((teacher: UserType) => (
                  <MenuItem key={teacher._id} value={teacher._id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <User size={16} />
                      <span>{teacher.name} - {teacher.email}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Ghi chú (Tùy chọn)"
              multiline
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={creating}
              placeholder="Thêm ghi chú bổ sung..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            disabled={creating} 
            variant="outlined"
            fullWidth={isMobile}
          >
            Hủy
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSchedule}
            disabled={creating || !selectedCourse || !selectedTeacher}
            startIcon={creating ? <CircularProgress size={20} /> : <Plus size={20} />}
            fullWidth={isMobile}
          >
            {creating ? 'Đang tạo...' : 'Tạo lịch học'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
