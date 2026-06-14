'use client';

import React, { useState } from 'react';
import {
  Button,
  Typography,
  Card,
  Modal,
  Form,
  Select,
  Input,
  message,
  Grid,
  Space,
  Divider,
} from 'antd';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RotateCcw, 
  User, 
  CalendarDays, 
  BookOpen,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import { brandColors } from '../../../theme/theme';
import type { User as UserType, Course, Session, Calendar, PopulatedCourse, PopulatedTeacher } from '../../../types/schedule.types';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface SlotInfo {
  date: Date;
  sessionId: string;
}

export default function ScheduleCreatorCalendar() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const { courses, sessions, users, calendars, refetch } = useScheduleData();
  const activeCourses = courses;
  const teachers = users;
  const [form] = Form.useForm();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ message: string; subDetails?: string[] } | null>(null);

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
    form.resetFields();
    setErrorDetails(null);
    setOpenDialog(true);
  };

  const parseErrorMessage = (msg: string) => {
    if (msg.includes('Course duration:')) {
      const parts = msg.split('- Course duration:');
      const mainMsg = parts[0].trim();
      const details = parts[1].split('▪').filter(p => p.trim()).map(p => p.trim());
      return { message: mainMsg, subDetails: details };
    }
    return { message: msg };
  };

  const handleCreateSchedule = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedSlot) return;

      setCreating(true);
      setErrorDetails(null);

      await calendarAPI.create({
        courseId: values.courseId,
        sessionId: selectedSlot.sessionId,
        teacherId: values.teacherId,
        date: formatDate(selectedSlot.date),
        note: values.note || '',
      });

      message.success('Tạo lịch học thành công');
      setOpenDialog(false);
      refetch();
    } catch (err) {
      if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || 'Không thể tạo lịch học';
        setErrorDetails(parseErrorMessage(msg));
      } else {
        console.error('Error creating schedule:', err);
      }
    } finally {
      setCreating(false);
    }
  };

  const renderError = () => {
    if (!errorDetails) return null;

    return (
      <div style={{ 
        backgroundColor: '#FFF2F0', 
        border: '1px solid #FFCCC7', 
        borderRadius: 8, 
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        gap: 12
      }}>
        <AlertCircle size={20} color="#FF4D4F" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <Text strong style={{ color: '#D32F2F', display: 'block', marginBottom: 4 }}>
            {errorDetails.message}
          </Text>
          {errorDetails.subDetails && errorDetails.subDetails.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {errorDetails.subDetails.map((detail, idx) => (
                <div key={idx} style={{ 
                  backgroundColor: 'rgba(255, 77, 79, 0.08)', 
                  padding: '2px 8px', 
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  border: '1px solid rgba(255, 77, 79, 0.2)',
                  color: '#CF1322'
                }}>
                  {detail}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderScheduleCard = (schedule: Calendar) => {
    const course = typeof schedule.courseId === 'object' ? schedule.courseId as PopulatedCourse : null;
    const teacher = typeof schedule.teacherId === 'object' ? schedule.teacherId as PopulatedTeacher : null;
    const courseId = extractId(schedule.courseId);
    const color = getScheduleColor(courseId);

    return (
      <div 
        key={schedule._id} 
        style={{ 
          marginBottom: 8, 
          backgroundColor: color, 
          color: 'white',
          borderRadius: 8,
          padding: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Text strong style={{ color: 'white', display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>
          {course?.name || course?.courseName || 'Khóa học không xác định'}
        </Text>
        <Space size={4} style={{ marginBottom: 4 }}>
          <User size={10} color="white" />
          <Text style={{ color: 'white', fontSize: '0.7rem' }}>
            {teacher?.name || teacher?.username || 'Không xác định'}
          </Text>
        </Space>
        <div style={{ marginTop: 4 }}>
          <span style={{ 
            fontSize: '0.6rem', 
            backgroundColor: 'rgba(255,255,255,0.25)', 
            padding: '1px 6px', 
            borderRadius: 4,
            fontWeight: 500
          }}>
            {formatStatus(schedule.status)}
          </span>
        </div>
      </div>
    );
  };

  const renderMobileView = () => {
    const morningSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour < 12;
    });
    
    const afternoonSessions = sessions.filter((s: Session) => {
      const startHour = parseInt(s.startTime?.split(':')[0] || '0');
      return startHour >= 12;
    });

    return (
      <div>
        {weekDates.map((date, dateIdx) => {
          const dateStr = formatDate(date);
          const isToday = formatDate(date) === formatDate(new Date());
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <Card 
              key={dateIdx} 
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</Text>
                  <Text type="secondary">{formatDateDisplay(date)}</Text>
                </div>
              }
              headStyle={{ backgroundColor: isToday ? brandColors.redSoft : '#F5F5F5', borderLeft: isToday ? `4px solid ${brandColors.red}` : 'none' }}
              style={{ marginBottom: 16, border: isToday ? `1px solid ${brandColors.red}` : '1px solid #E5E5E5' }}
            >
              <div style={{ padding: '8px 0' }}>
                <Text strong style={{ fontSize: 13, color: '#d97706', marginBottom: 12, display: 'block' }}>Sáng</Text>
                {morningSessions.map((session: Session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return (
                    <div key={session._id} style={{ marginBottom: 12 }}>
                      {schedules.length > 0 ? (
                        schedules.map((schedule: Calendar) => renderScheduleCard(schedule))
                      ) : (
                        <div 
                          style={{ 
                            padding: 12, 
                            border: '1px dashed #DDD',
                            borderRadius: 8,
                            textAlign: 'center',
                            cursor: !isPast ? 'pointer' : 'not-allowed',
                            backgroundColor: '#FAFAFA'
                          }}
                          onClick={() => !isPast && handleSlotClick(date, session._id)}
                        >
                          <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block' }}>{session.sessionName}</Text>
                          <Text type="secondary" style={{ fontSize: '0.7rem' }}>{session.startTime} - {session.endTime}</Text>
                          {!isPast && <Plus size={14} style={{ marginTop: 4, color: brandColors.red }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <Divider style={{ margin: '12px 0' }} />
                
                <Text strong style={{ fontSize: 13, color: '#d97706', marginBottom: 12, display: 'block' }}>Chiều</Text>
                {afternoonSessions.map((session: Session) => {
                  const schedules = calendars.filter((cal: Calendar) => {
                    const calDate = formatDate(cal.date);
                    const calSessionId = extractId(cal.sessionId);
                    return calDate === dateStr && calSessionId === session._id;
                  });

                  return (
                    <div key={session._id} style={{ marginBottom: 12 }}>
                      {schedules.length > 0 ? (
                        schedules.map((schedule: Calendar) => renderScheduleCard(schedule))
                      ) : (
                        <div 
                          style={{ 
                            padding: 12, 
                            border: '1px dashed #DDD',
                            borderRadius: 8,
                            textAlign: 'center',
                            cursor: !isPast ? 'pointer' : 'not-allowed',
                            backgroundColor: '#FAFAFA'
                          }}
                          onClick={() => !isPast && handleSlotClick(date, session._id)}
                        >
                          <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block' }}>{session.sessionName}</Text>
                          <Text type="secondary" style={{ fontSize: '0.7rem' }}>{session.startTime} - {session.endTime}</Text>
                          {!isPast && <Plus size={14} style={{ marginTop: 4, color: brandColors.red }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderDesktopView = () => {
    return (
      <div style={{ overflowX: 'auto', border: `1px solid ${brandColors.border}`, borderRadius: 8 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(100px, 1fr) repeat(7, minmax(130px, 1fr))',
          width: '100%',
        }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${brandColors.border}`, borderRight: `1px solid ${brandColors.border}`, backgroundColor: '#F9FAFB', fontWeight: 600 }}>
            Thời gian
          </div>
          {weekDates.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <div 
                key={idx} 
                style={{ 
                  padding: 12, 
                  borderBottom: `1px solid ${brandColors.border}`, 
                  borderRight: `1px solid ${brandColors.border}`, 
                  backgroundColor: isToday ? brandColors.redSoft : '#F9FAFB', 
                  textAlign: 'center',
                }}
              >
                <Text strong style={{ color: isToday ? brandColors.red : 'inherit', fontSize: '0.85rem' }}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Text>
                <div style={{ color: isToday ? brandColors.red : '#6B7280', fontSize: '0.75rem' }}>
                  {formatDateDisplay(date)}
                </div>
              </div>
            );
          })}

          {sessions.map((session: Session) => (
            <React.Fragment key={session._id}>
              <div style={{ padding: 12, borderBottom: `1px solid ${brandColors.border}`, borderRight: `1px solid ${brandColors.border}`, backgroundColor: '#F9FAFB' }}>
                <Text strong style={{ fontSize: '0.85rem' }}>{session.sessionName}</Text>
                <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                  {session.startTime} - {session.endTime}
                </div>
              </div>
              {weekDates.map((date, idx) => {
                const dateStr = formatDate(date);
                const schedules = calendars.filter((cal: Calendar) => {
                  const calDate = formatDate(cal.date);
                  const calSessionId = extractId(cal.sessionId);
                  return calDate === dateStr && calSessionId === session._id;
                });
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={idx}
                    style={{
                      padding: 10,
                      borderBottom: `1px solid ${brandColors.border}`,
                      borderRight: `1px solid ${brandColors.border}`,
                      minHeight: 110,
                      backgroundColor: isPast ? '#F3F4F6' : 'white',
                      cursor: !isPast ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => !isPast && handleSlotClick(date, session._id)}
                    onMouseEnter={(e) => { if(!isPast) e.currentTarget.style.backgroundColor = brandColors.redSoft; }}
                    onMouseLeave={(e) => { if(!isPast) e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    {schedules.map((schedule: Calendar) => renderScheduleCard(schedule))}
                    {schedules.length === 0 && !isPast && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, opacity: 0.15 }}>
                        <Plus size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Card 
        size="small" 
        style={{ marginBottom: 16, border: 'none', backgroundColor: '#F8FAFC' }}
        bodyStyle={{ padding: 12 }}
      >
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button 
            icon={<RotateCcw size={16} />} 
            onClick={handleToday}
            style={{ borderRadius: 8, borderColor: brandColors.border }}
          >
            Tuần này
          </Button>

          <Space>
            <Button 
              type="text" 
              icon={<ChevronLeft size={20} />} 
              onClick={handlePrev} 
            />
            <Text strong style={{ fontSize: 15 }}>
              {weekDates[0].getDate()} - {weekDates[6].getDate()} {weekDates[0].toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </Text>
            <Button 
              type="text" 
              icon={<ChevronRight size={20} />} 
              onClick={handleNext} 
            />
          </Space>

          {!isMobile && (
            <Space style={{ color: '#6B7280', fontSize: '0.85rem' }}>
              <Plus size={16} color={brandColors.red} />
              <span>Nhấp vào ô trống để tạo lịch</span>
            </Space>
          )}
        </Space>
      </Card>

      <div style={{ overflow: 'hidden' }}>
        {isMobile ? renderMobileView() : renderDesktopView()}
      </div>

      <Modal
        title={
          <Space>
            <CalendarDays size={20} color={brandColors.red} />
            <Text strong style={{ fontSize: 17 }}>Tạo lịch học</Text>
          </Space>
        }
        open={openDialog}
        onCancel={() => setOpenDialog(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpenDialog(false)} disabled={creating} style={{ borderRadius: 8 }}>
            HỦY
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleCreateSchedule} 
            loading={creating}
            icon={<Plus size={16} />}
            style={{ 
              borderRadius: 8, 
              backgroundColor: brandColors.red, 
              borderColor: brandColors.red,
              paddingLeft: 20,
              paddingRight: 20,
              height: 38
            }}
          >
            TẠO LỊCH HỌC
          </Button>
        ]}
        width={500}
        centered
        styles={{ body: { paddingTop: 16 } }}
      >
        {renderError()}

        <Space direction="vertical" style={{ width: '100%', marginBottom: 20 }} size={16}>
          <div style={{ display: 'flex', gap: 40 }}>
            <div>
              <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Ngày</Text>
              <Text strong style={{ fontSize: '1rem' }}>
                {selectedSlot?.date && formatDateDisplay(selectedSlot.date)}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Ca học</Text>
              <Space>
                <Clock size={16} color={brandColors.red} />
                <Text strong style={{ fontSize: '1rem' }}>
                  {sessions.find((s: Session) => s._id === selectedSlot?.sessionId)?.sessionName || 'Slot'}
                </Text>
              </Space>
            </div>
          </div>
          
          <Divider style={{ margin: '8px 0' }} />
        </Space>

        <Form 
          form={form} 
          layout="vertical" 
          requiredMark="optional"
        >
          <Form.Item
            name="courseId"
            label={<Text strong style={{ fontSize: '0.85rem' }}>Khóa học</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn khóa học' }]}
          >
            <Select 
              placeholder="Chọn khóa học..." 
              style={{ height: 42 }}
              suffixIcon={<BookOpen size={16} />}
            >
              {activeCourses.map((course: Course) => (
                <Select.Option key={course._id} value={course._id}>
                  {course.name || course.courseName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="teacherId"
            label={<Text strong style={{ fontSize: '0.85rem' }}>Giáo viên</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}
          >
            <Select 
              placeholder="Chọn giáo viên..." 
              style={{ height: 42 }}
              suffixIcon={<User size={16} />}
            >
              {teachers.map((teacher: UserType) => (
                <Select.Option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.email})
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
              placeholder="Nhập ghi chú thêm..." 
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
