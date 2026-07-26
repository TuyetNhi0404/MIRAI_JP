'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Modal,
  Button,
  Typography,
  Card,
  Avatar,
  Form,
  Select,
  Input,
  DatePicker,
  Space,
  Divider,
  Alert,
  Grid,
  Segmented,
  Tooltip,
  Drawer,
  List,
  Spin,
  App,
} from 'antd';
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
  Settings,
  X,
} from 'lucide-react';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import { brandColors } from '../../../theme/theme';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

type ViewMode = 'day' | 'week' | 'month';
type StatusType = 'in_progress' | 'not_yet' | 'completed' | 'cancelled';

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



interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Xác nhận',
  message,
  onConfirm,
  onCancel,
}) => (
  <Modal
    title={title}
    open={open}
    onOk={onConfirm}
    onCancel={onCancel}
    okText="Xác nhận"
    cancelText="Hủy"
    width={400}
    centered
    okButtonProps={{ danger: true, style: { borderRadius: 8 } }}
    cancelButtonProps={{ style: { borderRadius: 8 } }}
  >
    {typeof message === 'string' ? (
      <Text>
        {message.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </Text>
    ) : (
      message
    )}
  </Modal>
);

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'Đang học',      color: '#185FA5', bg: '#E6F1FB' },
  not_yet:     { label: 'Chưa bắt đầu', color: '#5F5E5A', bg: '#F1EFE8' },
  completed:   { label: 'Hoàn thành',   color: '#3B6D11', bg: '#EAF3DE' },
  cancelled:   { label: 'Đã hủy',       color: '#A32D2D', bg: '#FCEBEB' },
};

export default function ManageScheduleCalendar() {
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;

  const { calendars, courses, sessions, users, loading, error: fetchError, refetch } =
    useScheduleData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode]       = useState<ViewMode>('week');
  const [selectedSchedule, setSelectedSchedule] = useState<CalendarItem | null>(null);
  const [isEditing, setIsEditing]     = useState(false);
  const [editForm]                    = Form.useForm();
  const [deleting, setDeleting]       = useState(false);
  const [updating, setUpdating]       = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isFromLeaveRequest, setIsFromLeaveRequest] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const editCalendarId = searchParams.get('editCalendarId');
  const fromLeaveRequest = searchParams.get('fromLeaveRequest') === 'true';

  useEffect(() => {
    if (editCalendarId && calendars.length > 0 && !selectedSchedule) {
      const cal = calendars.find((c: any) => c._id === editCalendarId);
      if (cal) {
        setSelectedSchedule(cal);
        setIsFromLeaveRequest(fromLeaveRequest);
        const formData = {
          courseId:  extractId(cal.courseId),
          sessionId: extractId(cal.sessionId),
          teacherId: extractId(cal.teacherId),
          date:      formatDate(cal.date),
          note:      cal.note || '',
        };
        editForm.resetFields();
        editForm.setFieldsValue({
          ...formData,
          date: dayjs(formData.date)
        });
        setIsEditing(true);

        // Immediately consume search params to prevent query param race conditions
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('editCalendarId');
        newParams.delete('fromLeaveRequest');
        setSearchParams(newParams);
      }
    }
  }, [editCalendarId, calendars, selectedSchedule, editForm, fromLeaveRequest, searchParams, setSearchParams]);

  const handleCancelOrClose = async () => {
    if (isFromLeaveRequest && selectedSchedule) {
      try {
        setDeleting(true);
        await calendarAPI.delete(selectedSchedule._id);
        refetch();
      } catch (err) {
        console.error('Lỗi khi xóa lịch học:', err);
      } finally {
        setDeleting(false);
      }
      setViewMode('week');
    }
    setSelectedSchedule(null);
    setIsEditing(false);
    setIsFromLeaveRequest(false);
    
    // Clear search parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('editCalendarId');
    newParams.delete('fromLeaveRequest');
    setSearchParams(newParams);
  };


  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const extractId = (value: string | { _id: string } | null | undefined): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && value._id) return value._id;
    return '';
  };

  const getWeekDates = (): Date[] => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const getDayDate  = (): Date[] => [new Date(currentDate)];

  const getMonthDates = (): Date[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1));
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  };

  const getCurrentDates = (): Date[] => {
    if (viewMode === 'day')   return getDayDate();
    if (viewMode === 'week')  return getWeekDates();
    return getMonthDates();
  };

  const handlePrev = (): void => {
    const d = new Date(currentDate);
    if (viewMode === 'week')  d.setDate(d.getDate() - 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = (): void => {
    const d = new Date(currentDate);
    if (viewMode === 'week')  d.setDate(d.getDate() + 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const getScheduleColor = (courseId: string): string => {
    const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    const unique = [...new Set((calendars as CalendarItem[]).map((c) => extractId(c.courseId)))];
    return palette[unique.indexOf(courseId) % palette.length];
  };

  const getViewTitle = (): string => {
    if (viewMode === 'week') {
      const w = getWeekDates();
      const fmt: 'short' | 'long' = isMobile ? 'short' : 'long';
      return `${w[0].getDate()} – ${w[6].getDate()} ${w[0].toLocaleDateString('vi-VN', { month: fmt, year: 'numeric' })}`;
    }
    if (viewMode === 'month')
      return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
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
    const formData = {
      courseId:  extractId(selectedSchedule.courseId),
      sessionId: extractId(selectedSchedule.sessionId),
      teacherId: extractId(selectedSchedule.teacherId),
      date:      formatDate(selectedSchedule.date),
      note:      selectedSchedule.note || '',
    };
    editForm.resetFields();
    editForm.setFieldsValue({
      ...formData,
      date: dayjs(formData.date)
    });
    setIsEditing(true);
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedSchedule) return;

    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      setUpdateError('');

      if (isFromLeaveRequest) {
        const originalTeacherId = extractId(selectedSchedule.teacherId);
        if (values.teacherId === originalTeacherId) {
          await calendarAPI.delete(selectedSchedule._id);
          setSelectedSchedule(null);
          setIsEditing(false);
          setIsFromLeaveRequest(false);
          setViewMode('week');
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('editCalendarId');
          newParams.delete('fromLeaveRequest');
          setSearchParams(newParams);
          refetch();
          message.warning('Lịch học này đã được xóa do giáo viên cũ nghỉ dạy và không có giáo viên mới thay thế.');
          return;
        }
      }

      await calendarAPI.update(selectedSchedule._id, {
        ...values,
        date: values.date.format('YYYY-MM-DD')
      });

      setSelectedSchedule(null);
      setIsEditing(false);
      if (isFromLeaveRequest) {
        setViewMode('week');
      }
      setIsFromLeaveRequest(false);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('editCalendarId');
      newParams.delete('fromLeaveRequest');
      setSearchParams(newParams);
      refetch();
    } catch (err: unknown) {
      if ((err as any).errorFields) {
        // Form validation error - Ant Design handles UI
        return;
      }
      console.error('Error updating schedule:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setUpdateError(error.response?.data?.message || 'Không thể cập nhật lịch học');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick    = () => setConfirmOpen(true);
  const handleCancelDelete   = () => setConfirmOpen(false);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!selectedSchedule) return;
    try {
      setDeleting(true);
      setDeleteError('');
      setConfirmOpen(false);
      await calendarAPI.delete(selectedSchedule._id);
      setSelectedSchedule(null);
      setIsEditing(false);
      if (isFromLeaveRequest) {
        setViewMode('week');
      }
      setIsFromLeaveRequest(false);
      
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('editCalendarId');
      newParams.delete('fromLeaveRequest');
      setSearchParams(newParams);

      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setDeleteError(e.response?.data?.message || 'Không thể xóa lịch học');
    } finally {
      setDeleting(false);
    }
  };

  const getCourseFromSchedule  = (s: CalendarItem): Course | null =>
    typeof s.courseId  === 'object' ? s.courseId  : null;
  const getTeacherFromSchedule = (s: CalendarItem): Teacher | null =>
    typeof s.teacherId === 'object' ? s.teacherId : null;
  const getSelectedCourse  = () => selectedSchedule ? getCourseFromSchedule(selectedSchedule)  : null;
  const getSelectedTeacher = () => selectedSchedule ? getTeacherFromSchedule(selectedSchedule) : null;
  const getSelectedSession = (): Session | null => {
    if (!selectedSchedule) return null;
    return typeof selectedSchedule.sessionId === 'object' ? selectedSchedule.sessionId : null;
  };

  const renderScheduleCard = (schedule: CalendarItem, onClick: () => void): React.ReactNode => {
    const course   = getCourseFromSchedule(schedule);
    const teacher  = getTeacherFromSchedule(schedule);
    const color    = getScheduleColor(extractId(schedule.courseId));
    const statusCfg = STATUS_CONFIG[schedule.status] ?? STATUS_CONFIG.not_yet;

    return (
      <div
        key={schedule._id}
        onClick={onClick}
        style={{
          marginBottom: 0,
          flex: 1,
          height: "100%",
          backgroundColor: color,
          borderRadius: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'transform 0.15s, opacity 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <Text strong style={{ color: 'white', fontSize: '0.7rem', lineHeight: 1.3, flex: 1 }}>
            {course?.name || course?.courseName || 'Khóa học chưa xác định'}
          </Text>
          <Tooltip title="Cài đặt">
            <Settings size={11} style={{ opacity: 0.75, flexShrink: 0 }} color="white" />
          </Tooltip>
        </div>

        <Space size={4} style={{ display: 'flex', marginBottom: 4 }}>
          <User size={10} color="white" />
          <Text style={{ color: 'white', fontSize: '0.7rem' }}>
            {teacher?.name || 'Chưa xác định'}
          </Text>
        </Space>

        <span style={{
          fontSize: '0.63rem',
          backgroundColor: statusCfg.bg,
          color: statusCfg.color,
          padding: '1px 7px',
          borderRadius: 4,
          fontWeight: 600,
        }}>
          {statusCfg.label}
        </span>
      </div>
    );
  };

  const renderMobileWeekView = (): React.ReactNode => {
    const weekDates     = getWeekDates();
    const calendarItems = calendars as CalendarItem[];
    const morningSessions    = sessions.filter((s: Session) => parseInt(s.startTime?.split(':')[0] || '0') < 12);
    const afternoonSessions  = sessions.filter((s: Session) => parseInt(s.startTime?.split(':')[0] || '0') >= 12);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
        {weekDates.map((date, idx) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === formatDate(new Date());
          return (
            <Card
              key={idx}
              styles={{ body: { padding: 0 } }}
              style={{ overflow: 'hidden', borderRadius: 12, border: isToday ? `1px solid ${brandColors.red}` : undefined }}
            >
              <div style={{ padding: '12px 16px', backgroundColor: isToday ? brandColors.red : '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: isToday ? 'white' : 'inherit', fontSize: 15 }}>
                    {date.toLocaleDateString('vi-VN', { weekday: 'long' })}
                  </Text>
                  <Text style={{ color: isToday ? 'rgba(255,255,255,0.8)' : '#64748B', fontSize: 12 }}>
                    {formatDateDisplay(date)}
                  </Text>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                {[{ label: 'Buổi sáng', list: morningSessions }, { label: 'Buổi chiều', list: afternoonSessions }].map(({ label, list }, i) => (
                  <React.Fragment key={i}>
                    {i === 1 && <Divider style={{ margin: '12px 0' }} />}
                    <Text strong style={{ color: '#d97706', fontSize: 11, display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>
                      {label}
                    </Text>
                    {list.map((session: Session) => {
                      const schedules = calendarItems.filter((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === session._id);
                      return schedules.length > 0
                        ? schedules.map((sch) => renderScheduleCard(sch, () => handleOpenSchedule(sch)))
                        : null;
                    })}
                    {list.every((s: Session) => !calendarItems.some((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === s._id)) && (
                      <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>–</Text>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderWeekView = (): React.ReactNode => {
    if (isMobile) return renderMobileWeekView();

    const weekDates     = getWeekDates();
    const calendarItems = calendars as CalendarItem[];
    const sessionMap    = new Map<string, Session>();

    calendarItems.forEach((cal) => {
      const id = extractId(cal.sessionId);
      if (!sessionMap.has(id) && typeof cal.sessionId === 'object') sessionMap.set(id, cal.sessionId);
    });

    const sortedSessionIds = [...new Set(calendarItems.map((c) => extractId(c.sessionId)))].sort((a, b) => {
      const na = sessionMap.get(a)?.sessionName || '';
      const nb = sessionMap.get(b)?.sessionName || '';
      return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${isTablet ? '80px' : '100px'} repeat(7, minmax(130px, 1fr))`, width: '100%' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            Thời gian
          </div>
          {weekDates.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <div key={idx} style={{ padding: isTablet ? 12 : 16, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', backgroundColor: isToday ? '#FFF1F0' : '#F8FAFC', textAlign: 'center', minWidth: 140 }}>
                <Text strong style={{ color: isToday ? brandColors.red : 'inherit', fontSize: isTablet ? 13 : 14 }}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Text>
                <div style={{ color: isToday ? brandColors.red : '#64748B', fontSize: 12 }}>
                  {formatDateDisplay(date)}
                </div>
              </div>
            );
          })}

          {sortedSessionIds.map((sessionId) => {
            const session = sessionMap.get(sessionId);
            return (
              <React.Fragment key={sessionId}>
                <div style={{ padding: 12, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Text strong style={{ fontSize: 13 }}>{session?.sessionName || 'Ca học'}</Text>
                  {session?.startTime && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{session.startTime} – {session.endTime}</Text>
                  )}
                </div>
                {weekDates.map((date, idx) => {
                  const dateStr = formatDate(date);
                  const schedules = calendarItems.filter((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === sessionId);
                  return (
                    <div key={idx} style={{ 
                      padding: 8, 
                      borderBottom: '1px solid #E2E8F0', 
                      borderRight: '1px solid #E2E8F0', 
                      minHeight: 120, 
                      backgroundColor: 'white',
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      height: "100%"
                    }}>
                      {schedules.map((sch) => renderScheduleCard(sch, () => handleOpenSchedule(sch)))}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = (): React.ReactNode => {
    const date      = getCurrentDates()[0];
    const dateStr   = formatDate(date);
    const isToday   = dateStr === formatDate(new Date());
    const calendarItems = calendars as CalendarItem[];
    const morningSessions   = sessions.filter((s: Session) => parseInt(s.startTime?.split(':')[0] || '0') < 12);
    const afternoonSessions = sessions.filter((s: Session) => parseInt(s.startTime?.split(':')[0] || '0') >= 12);

    if (isMobile) {
      return (
        <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden', borderRadius: 12 }}>
          <div style={{ padding: 16, backgroundColor: isToday ? brandColors.red : '#F8FAFC', color: isToday ? 'white' : 'inherit' }}>
            <Title level={5} style={{ margin: 0, color: isToday ? 'white' : 'inherit' }}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </Title>
            <Text style={{ color: isToday ? 'rgba(255,255,255,0.8)' : '#64748B' }}>{formatDateDisplay(date)}</Text>
          </div>
          <div style={{ padding: 16 }}>
            {[{ label: 'Buổi sáng', list: morningSessions }, { label: 'Buổi chiều', list: afternoonSessions }].map(({ label, list }, i) => (
              <React.Fragment key={i}>
                {i === 1 && <Divider style={{ margin: '12px 0' }} />}
                <Text strong style={{ color: '#d97706', fontSize: 11, display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>{label}</Text>
                {list.map((session: Session) => {
                  const schedules = calendarItems.filter((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === session._id);
                  return schedules.map((sch) => renderScheduleCard(sch, () => handleOpenSchedule(sch)));
                })}
                {list.every((s: Session) => !calendarItems.some((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === s._id)) && (
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>–</Text>
                )}
              </React.Fragment>
            ))}
          </div>
        </Card>
      );
    }

    const sessionMap = new Map<string, Session>();
    calendarItems.forEach((cal) => {
      const id = extractId(cal.sessionId);
      if (!sessionMap.has(id) && typeof cal.sessionId === 'object') sessionMap.set(id, cal.sessionId);
    });
    const sortedSessionIds = [...new Set(calendarItems.map((c) => extractId(c.sessionId)))].sort((a, b) => {
      const na = sessionMap.get(a)?.sessionName || '';
      const nb = sessionMap.get(b)?.sessionName || '';
      return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${isTablet ? '80px' : '100px'} 1fr`, width: '100%' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            Thời gian
          </div>
          <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0', backgroundColor: isToday ? '#FFF1F0' : '#F8FAFC', textAlign: 'center' }}>
            <Text strong style={{ color: isToday ? brandColors.red : 'inherit', display: 'block' }}>
              {date.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{formatDateDisplay(date)}</Text>
          </div>

          {sortedSessionIds.map((sessionId) => {
            const session = sessionMap.get(sessionId);
            return (
              <React.Fragment key={sessionId}>
                <div style={{ padding: 12, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Text strong style={{ fontSize: 13 }}>{session?.sessionName || 'Ca học'}</Text>
                  {session?.startTime && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{session.startTime} – {session.endTime}</Text>
                  )}
                </div>
                <div style={{ padding: 12, borderBottom: '1px solid #E2E8F0', minHeight: 100, display: "flex", flexDirection: "column", gap: 6 }}>
                  {calendarItems
                    .filter((cal) => formatDate(cal.date) === dateStr && extractId(cal.sessionId) === sessionId)
                    .map((sch) => renderScheduleCard(sch, () => handleOpenSchedule(sch)))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = (): React.ReactNode => {
    const monthDates    = getMonthDates();
    const calendarItems = calendars as CalendarItem[];

    return (
      <div style={{ padding: isMobile ? 8 : 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8 }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <div key={day} style={{ padding: isMobile ? 4 : 8, textAlign: 'center', fontWeight: 600, backgroundColor: '#F8FAFC', fontSize: isMobile ? 11 : 13, borderRadius: 4 }}>
              {isMobile ? day.slice(0, 1) : day}
            </div>
          ))}

          {monthDates.map((date, idx) => {
            const dateStr        = formatDate(date);
            const isToday        = dateStr === formatDate(new Date());
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const daySchedules   = calendarItems.filter((cal) => formatDate(cal.date) === dateStr);

            return (
              <div
                key={idx}
                style={{
                  padding: isMobile ? 4 : 8,
                  minHeight: isMobile ? 70 : 120,
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  backgroundColor: isToday ? '#FFF1F0' : isCurrentMonth ? 'white' : '#F8FAFC',
                  opacity: isCurrentMonth ? 1 : 0.55,
                }}
              >
                <Text style={{ fontWeight: isToday ? 700 : 400, color: isToday ? brandColors.red : 'inherit', display: 'block', marginBottom: 4, fontSize: isMobile ? 11 : 13 }}>
                  {date.getDate()}
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {daySchedules.map((schedule) => {
                    const course = getCourseFromSchedule(schedule);
                    const color  = getScheduleColor(extractId(schedule.courseId));
                    return (
                      <div
                        key={schedule._id}
                        onClick={() => handleOpenSchedule(schedule)}
                        style={{ padding: '2px 6px', backgroundColor: color, color: 'white', borderRadius: 4, cursor: 'pointer', fontSize: isMobile ? 9 : 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {course?.name || course?.courseName || 'Chưa xác định'}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // For edit: show ALL courses so the current schedule's course always appears in the list
  const allCourses      = courses as Course[];
  // For the course select: include all non-cancelled courses (and also use all in edit)
  const editableCourses = allCourses; // all courses visible when editing
  const teachers      = users as Teacher[];
  const sessionList   = sessions as Session[];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const selectedStatusCfg = selectedSchedule
    ? STATUS_CONFIG[selectedSchedule.status] ?? STATUS_CONFIG.not_yet
    : null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
      {fetchError && (
        <Alert message="Lỗi tải dữ liệu" description={fetchError} type="error" showIcon style={{ marginBottom: 20 }} />
      )}

<Card
  styles={{ body: { padding: isMobile ? 16 : 20 } }}
  style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
>
  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 16 }}>
    <Button icon={<RotateCcw size={16} />} onClick={() => setCurrentDate(new Date())} size={isMobile ? 'middle' : 'large'} style={{ borderRadius: 8 }}>
      {isMobile ? 'Hôm nay' : 'Quay lại hôm nay'}
    </Button>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: isMobile ? 'none' : 1 }}>
      <Button type="text" shape="circle" icon={<ChevronLeft size={20} />} onClick={handlePrev} />
      <Title level={4} style={{ margin: 0, minWidth: isMobile ? 140 : 200, textAlign: 'center', fontSize: isMobile ? 16 : 18 }}>
        {getViewTitle()}
      </Title>
      <Button type="text" shape="circle" icon={<ChevronRight size={20} />} onClick={handleNext} />
    </div>

    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {!isMobile ? (
        <Segmented
          options={[
            { 
              value: 'day',  
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                  <Clock size={16} />
                  <span>Ngày</span>
                </div>
              ) 
            },
            { 
              value: 'week', 
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                  <CalendarDays size={16} />
                  <span>Tuần</span>
                </div>
              ) 
            },
            { 
              value: 'month', 
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                  <Grid3x3 size={16} />
                  <span>Tháng</span>
                </div>
              ) 
            },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
          size="large"
          style={{ borderRadius: 8 }}
        />
      ) : (
        <Button icon={<MenuIcon size={18} />} onClick={() => setMobileMenuOpen(true)} size="large" style={{ borderRadius: 8 }}>
          Chế độ xem
        </Button>
      )}
    </div>
  </div>
</Card>

      <Drawer
        title="Chọn chế độ xem"
        placement="bottom"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        styles={{ body: { padding: 0 } }}
        height="auto"
      >
        <List
          dataSource={[
            { label: 'Xem theo ngày',  value: 'day',   icon: <Clock size={20} /> },
            { label: 'Xem theo tuần',  value: 'week',  icon: <CalendarDays size={20} /> },
            { label: 'Xem theo tháng', value: 'month', icon: <Grid3x3 size={20} /> },
          ]}
          renderItem={(item) => (
            <List.Item onClick={() => { setViewMode(item.value as ViewMode); setMobileMenuOpen(false); }} style={{ padding: '16px 24px', cursor: 'pointer' }}>
              <Space size={16}>{item.icon}<Text strong>{item.label}</Text></Space>
            </List.Item>
          )}
        />
      </Drawer>

      <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
        {viewMode === 'day'   && renderDayView()}
        {viewMode === 'week'  && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      <Modal
        open={!!selectedSchedule}
        onCancel={handleCancelOrClose}
        footer={null}
        width={460}
        centered
        closable={false}
        styles={{ body: { padding: 0 } }}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        {selectedSchedule && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF1F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isEditing
                    ? <Edit size={16} color={brandColors.red} />
                    : <CalendarDays size={16} color={brandColors.red} />}
                </div>
                <Text strong style={{ fontSize: 15 }}>
                  {isEditing ? 'Cập nhật lịch học' : 'Chi tiết buổi học'}
                </Text>
              </div>
              <button
                onClick={handleCancelOrClose}
                style={{ width: 28, height: 28, border: 'none', background: '#F1F5F9', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
              >
                <X size={14} />
              </button>
            </div>
            {(deleteError || updateError) && (
              <div style={{ padding: '0 20px', paddingTop: 16 }}>
                <Alert
                  message={deleteError || updateError}
                  type="error"
                  showIcon
                  closable
                  onClose={() => { setDeleteError(''); setUpdateError(''); }}
                />
              </div>
            )}
            {!isEditing && (
              <>
                <div style={{ padding: '20px 20px 4px' }}>
                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                      Khóa học
                    </Text>
                    <Text strong style={{ fontSize: 16 }}>
                      {getSelectedCourse()?.name || getSelectedCourse()?.courseName || 'Chưa xác định'}
                    </Text>
                  </div>

                  <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', display: 'block', marginBottom: 10 }}>
                      Giáo viên phụ trách
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar
                        size={40}
                        style={{ backgroundColor: brandColors.red, fontWeight: 600, flexShrink: 0 }}
                      >
                        {getSelectedTeacher()?.name?.charAt(0).toUpperCase() || '?'}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>
                          {getSelectedTeacher()?.name || 'Chưa xác định'}
                        </Text>
                        {getSelectedTeacher()?.email && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {getSelectedTeacher()?.email}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <Text style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                        Ca học
                      </Text>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>
                        {getSelectedSession()?.sessionName || 'Chưa xác định'}
                      </Text>
                      {getSelectedSession()?.startTime && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {getSelectedSession()?.startTime} – {getSelectedSession()?.endTime}
                        </Text>
                      )}
                    </div>
                    <div>
                      <Text style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                        Ngày học
                      </Text>
                      <Text strong style={{ fontSize: 14 }}>
                        {formatDateDisplay(selectedSchedule.date)}
                      </Text>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

                  <div style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', display: 'block', marginBottom: 8 }}>
                      Trạng thái
                    </Text>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: selectedStatusCfg?.bg,
                      color: selectedStatusCfg?.color,
                    }}>
                      {selectedStatusCfg?.label}
                    </span>

                    {selectedSchedule.note && (
                      <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic' }}>
                          "{selectedSchedule.note}"
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
                  <Button
                    danger
                    icon={<Trash2 size={14} />}
                    loading={deleting}
                    onClick={handleDeleteClick}
                    style={{ borderRadius: 8, height: 36, fontSize: 13 }}
                  >
                    Xóa
                  </Button>
                  <Button
                    icon={<Settings size={14} />}
                    onClick={handleEdit}
                    style={{ flex: 1, borderRadius: 8, height: 36, fontSize: 13, backgroundColor: '#F1F5F9', border: 'none', fontWeight: 500 }}
                  >
                    Chỉnh sửa thông tin
                  </Button>
                </div>
              </>
            )}

            {isEditing && (
              <>
                <div style={{ padding: '16px 20px 0' }}>
                  {/* Summary card */}
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 2 }}>Ngày hiện tại</Text>
                        <Text strong style={{ fontSize: '0.9rem' }}>{selectedSchedule ? formatDateDisplay(selectedSchedule.date) : ''}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 2 }}>Ca học hiện tại</Text>
                        <Space size={4}>
                          <Clock size={14} color={brandColors.red} />
                          <Text strong style={{ fontSize: '0.9rem' }}>{getSelectedSession()?.sessionName || '—'}</Text>
                        </Space>
                      </div>
                    </div>
                  </div>

                  <Divider style={{ margin: '0 0 16px' }} />

                  <Form
                    form={editForm}
                    layout="vertical"
                    requiredMark="optional"
                  >
                    <Form.Item
                      name="courseId"
                      label={<Text strong style={{ fontSize: '0.85rem' }}>Khóa học</Text>}
                      rules={[
                        { required: true, message: 'Vui lòng chọn khóa học' },
                        {
                          validator: (_, value) => {
                            const course = allCourses.find(c => c._id === value);
                            if (course && (course.status === 'cancelled' || course.status === 'not_yet')) {
                              return Promise.reject(
                                course.status === 'cancelled'
                                  ? 'Khóa học đã bị hủy, không thể lên lịch'
                                  : 'Khóa học chưa bắt đầu, không thể chỉnh sửa lịch'
                              );
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Select
                        placeholder="Chọn khóa học..."
                        disabled={updating}
                        style={{ height: 42 }}
                        optionLabelProp="label"
                        showSearch
                        optionFilterProp="label"
                        suffixIcon={<CalendarDays size={16} />}
                      >
                        {editableCourses.map((course) => (
                          <Select.Option
                            key={course._id}
                            value={course._id}
                            label={course.name || course.courseName}
                            disabled={course.status === 'cancelled' || course.status === 'not_yet'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{course.name || course.courseName}</span>
                              {course.status === 'cancelled' && <span style={{ fontSize: 11, color: '#ef4444' }}>Đã hủy</span>}
                              {course.status === 'not_yet'   && <span style={{ fontSize: 11, color: '#f59e0b' }}>Chưa bắt đầu</span>}
                              {course.status === 'completed' && <span style={{ fontSize: 11, color: '#94A3B8' }}>Hoàn thành</span>}
                            </div>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Form.Item
                        name="sessionId"
                        label={<Text strong style={{ fontSize: '0.85rem' }}>Ca học</Text>}
                        rules={[{ required: true, message: 'Vui lòng chọn ca học' }]}
                      >
                        <Select
                          placeholder="Chọn ca học..."
                          disabled={updating}
                          style={{ height: 42 }}
                          suffixIcon={<Clock size={16} />}
                        >
                          {sessionList.map((session) => (
                            <Select.Option key={session._id} value={session._id}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{session.sessionName}</div>
                                {session.startTime && (
                                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{session.startTime} – {session.endTime}</div>
                                )}
                              </div>
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="date"
                        label={<Text strong style={{ fontSize: '0.85rem' }}>Ngày học</Text>}
                        rules={[
                          { required: true, message: 'Vui lòng chọn ngày học' },
                          {
                            validator: (_, value) => {
                              if (!value) return Promise.resolve();
                              if (dayjs(value).isBefore(dayjs().startOf('day'))) {
                                return Promise.reject('Không thể chọn ngày đã qua');
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <DatePicker
                          format="DD/MM/YYYY"
                          style={{ width: '100%', height: 42 }}
                          disabled={updating}
                          placeholder="Chọn ngày..."
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="teacherId"
                      label={<Text strong style={{ fontSize: '0.85rem' }}>Giáo viên phụ trách</Text>}
                      rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}
                    >
                      <Select
                        placeholder="Chọn giáo viên..."
                        disabled={updating}
                        style={{ height: 42 }}
                        optionLabelProp="label"
                        suffixIcon={<User size={16} />}
                      >
                        {teachers.map((teacher) => (
                          <Select.Option key={teacher._id} value={teacher._id} label={teacher.name}>
                            <Space size={8}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: brandColors.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', flexShrink: 0 }}>
                                {teacher.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, lineHeight: 1.2 }}>{teacher.name}</div>
                                <div style={{ fontSize: 11, color: '#94A3B8' }}>{teacher.email}</div>
                              </div>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="note"
                      label={<Text strong style={{ fontSize: '0.85rem' }}>Ghi chú (Tùy chọn)</Text>}
                    >
                      <Input.TextArea
                        rows={3}
                        disabled={updating}
                        placeholder="Nhập ghi chú hoặc nội dung buổi học..."
                        style={{ borderRadius: 8, resize: 'none' }}
                      />
                    </Form.Item>
                  </Form>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
                  <Button
                    onClick={handleCancelOrClose}
                    disabled={updating}
                    style={{ borderRadius: 8, height: 40 }}
                  >
                    HỦY
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleUpdate}
                    loading={updating}
                    icon={<Edit size={15} />}
                    style={{ flex: 1, borderRadius: 8, height: 40, backgroundColor: brandColors.red, borderColor: brandColors.red, fontWeight: 600 }}
                  >
                    LƯU THAY ĐỔI
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận xóa lịch học"
        message={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Text>Bạn có chắc chắn muốn xóa lịch học này không? Hành động này không thể hoàn tác.</Text>
            <div style={{ padding: '10px 14px', backgroundColor: '#FFF1F0', borderRadius: 8, border: '1px solid #FCA5A5' }}>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {getSelectedCourse()?.name || getSelectedCourse()?.courseName}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                {selectedSchedule ? formatDateDisplay(selectedSchedule.date) : ''}
              </Text>
            </div>
          </div>
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}