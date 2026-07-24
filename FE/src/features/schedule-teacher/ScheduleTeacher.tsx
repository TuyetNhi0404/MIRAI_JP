import { useState, useMemo, useEffect, Fragment } from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
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

  const periods = useMemo(() => {
    if (sessions.length > 0) {
      return sessions.map(s => {
        const label = s.sessionName.replace(/Slot\s*/i, "Ca ");
        return {
          id: s._id,
          name: s.sessionName,
          displayTime: `${s.startTime} - ${s.endTime}`,
          label: label,
          startTime: s.startTime,
        };
      });
    }
    return [
      { id: '1', name: 'Slot 1', displayTime: '07:30 - 09:30', label: 'Ca 1', startTime: '07:30' },
      { id: '2', name: 'Slot 2', displayTime: '09:45 - 11:45', label: 'Ca 2', startTime: '09:45' },
      { id: '3', name: 'Slot 3', displayTime: '12:30 - 14:30', label: 'Ca 3', startTime: '12:30' },
      { id: '4', name: 'Slot 4', displayTime: '14:45 - 16:45', label: 'Ca 4', startTime: '14:45' },
    ];
  }, [sessions]);

  const scheduleGrid = useMemo(() => {
    const grid: ScheduleGrid = {};
    periods.forEach(period => {
      grid[period.name] = {};
      weekDates.forEach(date => {
        const dateStr = toLocalDateString(date);
        const schedulesForDate = schedule.filter(s => s.date === dateStr);
        const daySchedule = schedulesForDate.find(s => {
          return (
            s.sessionId === period.id ||
            s.sessionName === period.name ||
            (s.startTime && s.startTime.trim() === period.startTime.trim())
          );
        });
        grid[period.name][dateStr] = daySchedule || null;
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
      return null;
    }

    const canReg = canRegister(dateStr, scheduleItem.startTime || '00:00');
    const hasRequest = scheduleItem.request?.status;

    return (
      <Box sx={{ p: 1 }}>
        <div
          className="mira-fade-in"
          style={{
            background: "#ffffff",
            borderRadius: 8,
            padding: "10px 12px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
            border: `1px solid #E2E8F0`,
            borderLeft: `5px solid #B90000`,
            color: "#1F2238",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            justifyContent: "space-between",
            minHeight: 110,
            fontFamily: '"Comfortaa", sans-serif',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div 
              style={{ 
                fontWeight: 800, 
                fontSize: 13, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}
              title={scheduleItem.courseName}
            >
              {scheduleItem.courseName}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#595959' }}>
              <Clock size={12} style={{ color: '#8C8C8C' }} />
              <span>{scheduleItem.startTime} - {scheduleItem.endTime}</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
            {hasRequest ? (
              <div
                style={{
                  width: '100%',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "5px 6px",
                  borderRadius: 4,
                  textAlign: 'center',
                  background: scheduleItem.request!.status === 'accepted' ? '#52C41A' : scheduleItem.request!.status === 'rejected' ? '#f44336' : '#FAAD14',
                  color: 'white',
                  border: `1px solid ${scheduleItem.request!.status === 'accepted' ? '#389E0D' : scheduleItem.request!.status === 'rejected' ? '#d32f2f' : '#D46B08'}`,
                }}
              >
                {getStatusText(scheduleItem.request!.status)}
              </div>
            ) : canReg ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegisterClick(scheduleItem);
                }}
                style={{
                  width: '100%',
                  padding: "5px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  backgroundColor: '#52C41A',
                  color: 'white',
                  border: '1px solid #389E0D',
                  cursor: 'pointer',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                  transition: 'all 150ms ease',
                  boxShadow: "0 1px 3px rgba(82,196,26,0.12)",
                }}
                onMouseEnter={(btn) => {
                  btn.currentTarget.style.backgroundColor = '#389E0D';
                }}
                onMouseLeave={(btn) => {
                  btn.currentTarget.style.backgroundColor = '#52C41A';
                }}
              >
                Xin nghỉ
              </button>
            ) : (
              <div
                style={{
                  width: '100%',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "5px 6px",
                  borderRadius: 4,
                  background: '#B90000',
                  color: 'white',
                  textTransform: 'uppercase',
                  border: '1px solid #8A0000',
                  letterSpacing: 0.3,
                  textAlign: 'center',
                }}
              >
                Hết hạn
              </div>
            )}
          </div>
        </div>
      </Box>
    );
  };

  const renderScheduleItemDesktop = (scheduleItem: ScheduleGridItem | null, date: Date) => {
    const dateStr = toLocalDateString(date);

    if (!scheduleItem) {
      return null;
    }

    const canReg = canRegister(dateStr, scheduleItem.startTime || '00:00');
    const hasRequest = scheduleItem.request?.status;

    return (
      <div
        className="mira-fade-in"
        style={{
          background: "#ffffff",
          borderRadius: 8,
          padding: "10px 12px",
          transition: "all 200ms ease",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          border: `1px solid #E2E8F0`,
          borderLeft: `5px solid #B90000`,
          color: "#1F2238",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          alignSelf: "stretch",
          justifyContent: "space-between",
          minHeight: 110,
          fontFamily: '"Comfortaa", sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.04)";
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div 
            style={{ 
              fontWeight: 800, 
              fontSize: 13, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}
            title={scheduleItem.courseName}
          >
            {scheduleItem.courseName}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#595959' }}>
            <Clock size={12} style={{ color: '#8C8C8C' }} />
            <span>{scheduleItem.startTime} - {scheduleItem.endTime}</span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
          {hasRequest ? (
            <div
              style={{
                width: '100%',
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 6px",
                borderRadius: 4,
                textAlign: 'center',
                background: scheduleItem.request!.status === 'accepted' ? '#52C41A' : scheduleItem.request!.status === 'rejected' ? '#f44336' : '#FAAD14',
                color: 'white',
                border: `1px solid ${scheduleItem.request!.status === 'accepted' ? '#389E0D' : scheduleItem.request!.status === 'rejected' ? '#d32f2f' : '#D46B08'}`,
              }}
            >
              {getStatusText(scheduleItem.request!.status)}
            </div>
          ) : canReg ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRegisterClick(scheduleItem);
              }}
              style={{
                width: '100%',
                padding: "5px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 800,
                backgroundColor: '#52C41A',
                color: 'white',
                border: '1px solid #389E0D',
                cursor: 'pointer',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                transition: 'all 150ms ease',
                boxShadow: "0 1px 3px rgba(82,196,26,0.12)",
              }}
              onMouseEnter={(btn) => {
                btn.currentTarget.style.backgroundColor = '#389E0D';
              }}
              onMouseLeave={(btn) => {
                btn.currentTarget.style.backgroundColor = '#52C41A';
              }}
            >
              Xin nghỉ
            </button>
          ) : (
            <div
              style={{
                width: '100%',
                fontSize: 9,
                fontWeight: 800,
                padding: "5px 6px",
                borderRadius: 4,
                background: '#B90000',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                textAlign: 'center',
                border: '1px solid #8A0000',
              }}
            >
              Hết hạn
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobileView = () => {
    return (
      <div style={{ padding: 0 }} className="mira-stagger">
        {weekDates.map((date, dayIndex) => {
          const dateStr = toLocalDateString(date);
          const dayName = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'][dayIndex];
          const isToday = dayjs(date).isSame(dayjs(), 'day');

          const daySchedules: { period: typeof periods[0]; item: ScheduleGridItem }[] = [];
          periods.forEach(period => {
            const item = scheduleGrid[period.name]?.[dateStr];
            if (item) {
              daySchedules.push({ period, item });
            }
          });

          return (
            <div
              key={dateStr}
              style={{
                marginBottom: 12,
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${isToday ? '#B90000' : '#E2E8F0'}`,
                background: '#ffffff',
                transition: 'all 200ms ease',
                boxShadow: isToday ? '0 4px 12px rgba(185, 0, 0, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: isToday
                    ? 'linear-gradient(135deg, #B90000, #8A0000)'
                    : '#F8FAFC',
                  color: isToday ? 'white' : '#1F2238',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  fontFamily: '"Comfortaa", sans-serif',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, display: 'block', fontSize: 14 }}>
                    {dayName}
                  </span>
                  <span style={{ fontSize: 12, opacity: isToday ? 0.9 : 0.6, fontWeight: 500 }}>
                    {date.getDate().toString().padStart(2, '0')}/{(date.getMonth() + 1).toString().padStart(2, '0')}/
                    {date.getFullYear()}
                  </span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    background: isToday ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                    color: isToday ? 'white' : '#64748B',
                    fontWeight: 600,
                  }}
                >
                  {daySchedules.length} ca dạy
                </span>
              </div>
              <div style={{ padding: 12 }}>
                {daySchedules.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {daySchedules.map(({ period, item }) => (
                      <div key={item.calendarId}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748B',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: '"Comfortaa", sans-serif',
                        }}>
                          <Clock size={12} />
                          <span>{period.label} ({period.displayTime})</span>
                        </div>
                        {renderScheduleItemMobile(item, date)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#8C8C8C', fontFamily: '"Comfortaa", sans-serif' }}>
                      Không có lịch dạy
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDesktopView = () => {
    return (
      <div 
        className="mira-fade-in" 
        style={{ 
          border: `1px solid #E2E8F0`, 
          borderRadius: 12, 
          overflow: "hidden",
          background: "#fff",
          width: "100%",
          maxWidth: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: `110px repeat(7, minmax(0, 1fr))`, width: "100%" }}>
          {/* Row 1: Headers */}
          <div style={{ 
            padding: 16, 
            borderBottom: '1px solid #E2E8F0', 
            borderRight: '1px solid #E2E8F0', 
            backgroundColor: '#F8FAFC', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 13,
            color: '#1F2238',
            fontFamily: '"Comfortaa", sans-serif',
          }}>
            Ca học
          </div>
          {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((day, idx) => {
            const date = weekDates[idx];
            const isToday = date ? dayjs(date).isSame(dayjs(), 'day') : false;
            const dateStr = date ? ` (${date.getDate()}/${date.getMonth() + 1})` : '';
            return (
              <div
                key={idx}
                style={{
                  padding: 16,
                  textAlign: "center",
                  borderBottom: '1px solid #E2E8F0', 
                  borderRight: '1px solid #E2E8F0', 
                  backgroundColor: isToday ? '#FFF1F0' : '#F8FAFC',
                  fontFamily: '"Comfortaa", sans-serif',
                }}
              >
                <span style={{ 
                  display: "block", 
                  color: isToday ? '#B90000' : '#1F2238', 
                  fontSize: 14, 
                  fontWeight: 700 
                }}>
                  {day}
                </span>
                <span style={{ 
                  color: isToday ? '#B90000' : '#64748B', 
                  fontSize: 12, 
                  fontWeight: 500 
                }}>
                  {dateStr.replace(/[()]/g, '')}
                </span>
              </div>
            );
          })}

          {/* Rows for each slot/period */}
          {periods.map((period) => (
            <Fragment key={period.name}>
              {/* Column Ca học */}
              <div style={{
                padding: 12,
                borderBottom: '1px solid #E2E8F0', 
                borderRight: '1px solid #E2E8F0', 
                backgroundColor: '#F8FAFC', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                fontFamily: '"Comfortaa", sans-serif',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: 'block', color: '#1F2238' }}>{period.label}</span>
                <span style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{period.displayTime}</span>
              </div>

              {/* Day cells for this period */}
              {weekDates.map((date, _idx) => {
                const dateStr = toLocalDateString(date);
                const item = scheduleGrid[period.name]?.[dateStr];

                return (
                  <div
                    key={`${dateStr}-${period.name}`}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid #E2E8F0', 
                      borderRight: '1px solid #E2E8F0', 
                      minHeight: 120, 
                      backgroundColor: 'white',
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "stretch",
                      gap: 8,
                    }}
                  >
                    {renderScheduleItemDesktop(item, date)}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
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
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', px: isMobile ? 2 : 2, pb: 12, boxSizing: 'border-box' }}>

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
