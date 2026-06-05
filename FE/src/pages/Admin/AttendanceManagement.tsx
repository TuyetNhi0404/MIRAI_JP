import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Stack,
  IconButton,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  RotateCcw,
  User,
  Menu as MenuIcon,
  UserCheck,
} from 'lucide-react';
import { useScheduleData } from '../../hooks/useScheduleData';
import { AttendanceDialog } from '../../features/attendance-management/AttendanceDialog';
import type { Calendar, PopulatedCourse, PopulatedSession, PopulatedTeacher } from '../../types/schedule.types';

type ViewMode = 'day' | 'week';

export default function ManageScheduleWithAttendance() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const { calendars, loading, error: fetchError } = useScheduleData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'day' : 'week');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Attendance Dialog State
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedCalendarForAttendance, setSelectedCalendarForAttendance] = useState<Calendar | null>(null);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const extractId = (value: string | PopulatedCourse | PopulatedSession | PopulatedTeacher | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in value) return value._id;
    return '';
  };

  const getWeekDates = () => {
    const week = [];
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

  const getDayDate = () => [new Date(currentDate)];

  const getCurrentDates = () => {
    if (viewMode === 'day') return getDayDate();
    return getWeekDates();
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const getScheduleColor = (courseId: string) => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    const uniqueCourses = [...new Set(calendars.map((c: Calendar) => extractId(c.courseId)))];
    const index = uniqueCourses.indexOf(courseId);
    return colors[index % colors.length];
  };

  const getViewTitle = () => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates();
      const format = isMobile ? 'short' : 'long';
      return `${weekDates[0].getDate()} - ${weekDates[6].getDate()} ${weekDates[0].toLocaleDateString('en-US', { month: format, year: 'numeric' })}`;
    }
    return formatDateDisplay(currentDate);
  };

  const handleOpenAttendance = (schedule: Calendar) => {
    setSelectedCalendarForAttendance(schedule);
    setAttendanceDialogOpen(true);
  };

  const renderScheduleCard = (schedule: Calendar) => {
    const course = typeof schedule.courseId === 'object' ? schedule.courseId as PopulatedCourse : null;
    const teacher = typeof schedule.teacherId === 'object' ? schedule.teacherId as PopulatedTeacher : null;
    const courseId = extractId(schedule.courseId);
    const color = getScheduleColor(courseId);

    return (
      <Card
        key={schedule._id}
        sx={{
          bgcolor: color,
          color: "white",
          mb: 1,
          borderRadius: 1.5,
          boxShadow: 1,
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: 2,
          },
        }}
      >
        <CardContent
          sx={{
            p: 1.25,
            "&:last-child": { pb: 1.25 },
          }}
        >
          {/* Course Name */}
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ fontSize: "0.85rem", mb: 0.5, lineHeight: 1.2 }}
          >
            {course?.name || course?.courseName || "Unknown Course"}
          </Typography>

          {/* Teacher */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
            <User size={12} />
            <Typography
              variant="caption"
              sx={{ fontSize: "0.7rem", opacity: 0.9 }}
            >
              {teacher?.name || "Unknown"}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mt: 1,
            }}
          >
            {/* Status Chip */}
            <Chip
              label={schedule.status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase())}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                bgcolor: "rgba(255,255,255,0.25)",
                color: "white",
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
                alignSelf: 'flex-start',
                px: 0.5
              }}
            />

            {/* Compact Attendance Button */}
            <Button
              size="small"
              variant="contained"
              fullWidth
              sx={{
                py: 0.5,
                bgcolor: "white",
                color: color,
                fontSize: "0.75rem",
                fontWeight: 700,
                '&:hover': { 
                  bgcolor: "rgba(255,255,255,0.9)",
                },
                boxShadow: "none",
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAttendance(schedule);
              }}
            >
              <UserCheck size={14} />
              <span>Attendance</span>
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Mobile Week View - theo layout mẫu (Morning/Afternoon)
  const renderMobileWeekView = () => {
    const weekDates = getWeekDates();
    
    // Group sessions by time period
    const morningSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))]
      .map(id => calendars.find((c: Calendar) => extractId(c.sessionId) === id))
      .filter((c): c is Calendar => !!c && typeof c.sessionId === 'object')
      .map(c => c.sessionId as PopulatedSession)
      .filter(s => {
        const startHour = parseInt(s.startTime?.split(':')[0] || '0');
        return startHour < 12;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    
    const afternoonSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))]
      .map(id => calendars.find((c: Calendar) => extractId(c.sessionId) === id))
      .filter((c): c is Calendar => !!c && typeof c.sessionId === 'object')
      .map(c => c.sessionId as PopulatedSession)
      .filter(s => {
        const startHour = parseInt(s.startTime?.split(':')[0] || '0');
        return startHour >= 12;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

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
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
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
                  Morning
                </Typography>
                
                {morningSessions.map((session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return schedules.length > 0 ? (
                    <Box key={session._id}>
                      {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                    </Box>
                  ) : null;
                })}
                
                {morningSessions.every((session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
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
                  Afternoon
                </Typography>
                
                {afternoonSessions.map((session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return schedules.length > 0 ? (
                    <Box key={session._id}>
                      {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                    </Box>
                  ) : null;
                })}
                
                {afternoonSessions.every((session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
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

  const renderWeekView = () => {
    if (isMobile) return renderMobileWeekView();

    const weekDates = getWeekDates();
    const allSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))];
    const sessionMap = new Map<string, PopulatedSession>();
    
    calendars.forEach((cal: Calendar) => {
      const sessionId = extractId(cal.sessionId);
      if (!sessionMap.has(sessionId) && typeof cal.sessionId === 'object') {
        sessionMap.set(sessionId, cal.sessionId);
      }
    });

    const sortedSessionIds = allSessions.sort((idA, idB) => {
      const sessionA = sessionMap.get(idA);
      const sessionB = sessionMap.get(idB);
      return (sessionA?.startTime || "").localeCompare(sessionB?.startTime || "");
    });

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${isTablet ? '100px' : '120px'} repeat(7, 1fr)`, minWidth: 'fit-content', width: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', fontWeight: 600 }}>
            Time
          </Box>
          {weekDates.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <Box key={idx} sx={{ p: isTablet ? 1.5 : 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: isToday ? 'primary.50' : 'grey.50', textAlign: 'center', minWidth: 140 }}>
                <Typography sx={{ fontWeight: 600, color: isToday ? 'primary.main' : 'text.primary', fontSize: isTablet ? '0.875rem' : '1rem' }}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
                <Typography variant="body2" sx={{ color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {formatDateDisplay(date)}
                </Typography>
              </Box>
            );
          })}

          {sortedSessionIds.map((sessionId: string) => {
            const session = sessionMap.get(sessionId);
            
            return (
              <React.Fragment key={sessionId}>
                <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {session?.sessionName || 'Session'}
                  </Typography>
                  {session?.startTime && (
                    <Typography variant="caption" color="text.secondary">
                      {session.startTime} - {session.endTime}
                    </Typography>
                  )}
                </Box>
                {weekDates.map((date, idx) => {
                  const dateStr = formatDate(date);
                  
                  const schedules = calendars.filter((cal: Calendar) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === sessionId;
                  });

                  return (
                    <Box key={idx} sx={{ p: 1.5, borderBottom: 1, borderRight: 1, borderColor: 'divider', minHeight: 120, bgcolor: 'background.paper', minWidth: 140 }}>
                      {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
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

  const renderDayView = () => {
    const date = getCurrentDates()[0];
    const dateStr = formatDate(date);
    const isToday = formatDate(date) === formatDate(new Date());

    // Group sessions by time period for mobile
    const morningSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))]
      .map(id => calendars.find((c: Calendar) => extractId(c.sessionId) === id))
      .filter((c): c is Calendar => !!c && typeof c.sessionId === 'object')
      .map(c => c.sessionId as PopulatedSession)
      .filter(s => {
        const startHour = parseInt(s.startTime?.split(':')[0] || '0');
        return startHour < 12;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    
    const afternoonSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))]
      .map(id => calendars.find((c: Calendar) => extractId(c.sessionId) === id))
      .filter((c): c is Calendar => !!c && typeof c.sessionId === 'object')
      .map(c => c.sessionId as PopulatedSession)
      .filter(s => {
        const startHour = parseInt(s.startTime?.split(':')[0] || '0');
        return startHour >= 12;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    if (isMobile) {
      return (
        <Paper sx={{ overflow: 'hidden' }}>
          {/* Date Header */}
          <Box sx={{ p: 2, bgcolor: isToday ? 'primary.main' : 'grey.100', color: isToday ? 'white' : 'text.primary' }}>
            <Typography variant="h6" fontWeight={600}>
              {date.toLocaleDateString('en-US', { weekday: 'long' })}
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
              Morning
            </Typography>
            
            {morningSessions.map((session) => {
              const schedules = calendars.filter((cal: Calendar) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });

              return schedules.length > 0 ? (
                <Box key={session._id}>
                  {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                </Box>
              ) : null;
            })}
            
            {morningSessions.every((session) => {
              const schedules = calendars.filter((cal: Calendar) => {
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
              Afternoon
            </Typography>
            
            {afternoonSessions.map((session) => {
              const schedules = calendars.filter((cal: Calendar) => {
                const calDate = formatDate(cal.date);
                const calSessionId = extractId(cal.sessionId);
                return calDate === dateStr && calSessionId === session._id;
              });

              return schedules.length > 0 ? (
                <Box key={session._id}>
                  {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                </Box>
              ) : null;
            })}
            
            {afternoonSessions.every((session) => {
              const schedules = calendars.filter((cal: Calendar) => {
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
    const allSessions = [...new Set(calendars.map((c: Calendar) => extractId(c.sessionId)))];
    const sessionMap = new Map<string, PopulatedSession>();
    
    calendars.forEach((cal: Calendar) => {
      const sessionId = extractId(cal.sessionId);
      if (!sessionMap.has(sessionId) && typeof cal.sessionId === 'object') {
        sessionMap.set(sessionId, cal.sessionId);
      }
    });

    const sortedSessionIds = allSessions.sort((idA, idB) => {
      const sessionA = sessionMap.get(idA);
      const sessionB = sessionMap.get(idB);
      return (sessionA?.startTime || "").localeCompare(sessionB?.startTime || "");
    });

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${isTablet ? '100px' : '120px'} 1fr`, minWidth: 'fit-content', width: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', fontWeight: 600 }}>
            Time
          </Box>
          <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: isToday ? 'primary.50' : 'grey.50', textAlign: 'center', minWidth: 300 }}>
            <Typography sx={{ fontWeight: 600, color: isToday ? 'primary.main' : 'text.primary' }}>
              {date.toLocaleDateString('en-US', { weekday: 'long' })}
            </Typography>
            <Typography variant="body2" sx={{ color: isToday ? 'primary.main' : 'text.secondary' }}>
              {formatDateDisplay(date)}
            </Typography>
          </Box>

          {sortedSessionIds.map((sessionId: string) => {
            const session = sessionMap.get(sessionId);
            
            return (
              <React.Fragment key={sessionId}>
                <Box sx={{ p: 2, borderBottom: 1, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {session?.sessionName || 'Session'}
                  </Typography>
                  {session?.startTime && (
                    <Typography variant="caption" color="text.secondary">
                      {session.startTime} - {session.endTime}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ p: 1.5, borderBottom: 1, borderRight: 1, borderColor: 'divider', minHeight: 120, bgcolor: 'background.paper', minWidth: 300 }}>
                  {calendars
                    .filter((cal: Calendar) => {
                      const calDate = formatDate(cal.date);
                      const calSessionId = extractId(cal.sessionId);
                      return calDate === dateStr && calSessionId === sessionId;
                    })
                    .map((schedule: Calendar) => renderScheduleCard(schedule))}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    );
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
            {isMobile ? 'Today' : 'Back to Today'}
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
                Day
              </Button>
              <Button variant={viewMode === 'week' ? 'contained' : 'outlined'} onClick={() => setViewMode('week')} size="small" startIcon={<CalendarDays size={16} />}>
                Week
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Mobile View Selector Drawer */}
      <Drawer anchor="bottom" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Select View</Typography>
          <List>
            <ListItemButton onClick={() => { setViewMode('day'); setMobileMenuOpen(false); }}>
              <Clock size={20} style={{ marginRight: 12 }} />
              <ListItemText primary="Day View" />
            </ListItemButton>
            <Divider />
            <ListItemButton onClick={() => { setViewMode('week'); setMobileMenuOpen(false); }}>
              <CalendarDays size={20} style={{ marginRight: 12 }} />
              <ListItemText primary="Week View" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Calendar View */}
      <Paper sx={{ overflow: 'hidden', p: isMobile ? 2 : 0 }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
      </Paper>

      {/* Attendance Dialog */}
      <AttendanceDialog
        open={attendanceDialogOpen}
        onClose={() => {
          setAttendanceDialogOpen(false);
          setSelectedCalendarForAttendance(null);
        }}
        calendar={selectedCalendarForAttendance}
      />
    </Box>
  );
}
