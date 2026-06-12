'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  Input,
  Button,
  Select,
  message,
  Typography,
  Divider,
  Space,
  Tag,
  Modal,
  List,
  Progress,
  Row,
  Col,
  Grid,
} from 'antd';
import { Calendar, Clock, User, BookOpen, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import type { Course, Session, User as UserType } from '../../../types/schedule.types';
import { brandColors } from '../../../theme/theme';

const { Text, Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const formSchema = z.object({
  dayOfWeek: z.array(z.string()).nonempty('Vui lòng chọn ít nhất một ngày'),
  courseId: z.string().min(1, 'Vui lòng chọn khóa học'),
  sessionId: z.string().min(1, 'Vui lòng chọn ca học'),
  teacherId: z.string().min(1, 'Vui lòng chọn giảng viên'),
  startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddScheduleAutoProps {
  onSuccess?: () => void;
  isLoading?: boolean;
}

interface DayOfWeek {
  value: string;
  label: string;
  dayIndex: number;
}

const daysOfWeek: DayOfWeek[] = [
  { value: 'Mon', label: 'Thứ Hai', dayIndex: 1 },
  { value: 'Tue', label: 'Thứ Ba', dayIndex: 2 },
  { value: 'Wed', label: 'Thứ Tư', dayIndex: 3 },
  { value: 'Thu', label: 'Thứ Năm', dayIndex: 4 },
  { value: 'Fri', label: 'Thứ Sáu', dayIndex: 5 },
  { value: 'Sat', label: 'Thứ Bảy', dayIndex: 6 },
  { value: 'Sun', label: 'Chủ Nhật', dayIndex: 0 },
];

interface CreationResult {
  date: string;
  status: 'success' | 'error';
  message?: string;
}

export default function AddScheduleAuto({ onSuccess }: AddScheduleAutoProps) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const { courses, sessions, users, loading: dataLoading, refetch } = useScheduleData();
  
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<CreationResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    values: FormData | null;
    dates: Date[];
    course: Course | undefined;
    session: Session | undefined;
    teacher: UserType | undefined;
  }>({
    open: false,
    values: null,
    dates: [],
    course: undefined,
    session: undefined,
    teacher: undefined,
  });

  const activeCourses = courses.filter((c: Course) => 
    c.status === 'not_yet' || c.status === 'in_progress'
  );

  const formatDateDisplay = (date: string): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayOfWeek: [],
      courseId: '',
      sessionId: '',
      teacherId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      note: '',
    },
  });

  const generateScheduleDates = (
    startDate: string,
    endDate: string,
    selectedDays: string[]
  ): Date[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];

    const selectedDayIndices = selectedDays.map(
      day => daysOfWeek.find(d => d.value === day)?.dayIndex ?? 0
    );

    const current = new Date(start);
    while (current <= end) {
      const dayIndex = current.getDay();
      if (selectedDayIndices.includes(dayIndex)) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const onSubmit = async (values: FormData) => {
    const scheduleDates = generateScheduleDates(
      values.startDate,
      values.endDate,
      values.dayOfWeek
    );

    if (scheduleDates.length === 0) {
      message.error('Không tìm thấy ngày phù hợp trong khoảng thời gian đã chọn');
      return;
    }

    const selectedCourse  = activeCourses.find((c: Course)   => c._id === values.courseId);
    const selectedSession  = sessions.find((s: Session)        => s._id === values.sessionId);
    const selectedTeacher  = users.find((t: UserType)          => t._id === values.teacherId);

    setConfirmModal({
      open: true,
      values,
      dates: scheduleDates,
      course: selectedCourse,
      session: selectedSession,
      teacher: selectedTeacher,
    });
  };

  const handlePerformCreation = async (values: FormData, scheduleDates: Date[]) => {
    setSubmitting(true);
    setResults([]);
    setProgress(0);
    const newResults: CreationResult[] = [];

    for (let i = 0; i < scheduleDates.length; i++) {
      const date = scheduleDates[i];
      const dateStr = date.toISOString().split('T')[0];
      try {
        await calendarAPI.create({
          courseId: values.courseId,
          sessionId: values.sessionId,
          teacherId: values.teacherId,
          date: dateStr,
          note: values.note || `Lịch học tạo tự động`,
        });
        newResults.push({ date: dateStr, status: 'success' });
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        newResults.push({ 
          date: dateStr, 
          status: 'error', 
          message: axiosError.response?.data?.message || 'Lỗi không xác định' 
        });
      }
      setResults([...newResults]);
      setProgress(Math.round(((i + 1) / scheduleDates.length) * 100));
    }

    setSubmitting(false);
    setShowResultModal(true);
    refetch();
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  if (dataLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Progress type="circle" percent={0} status="active" />
        <Paragraph style={{ marginTop: 16 }}>Đang tải dữ liệu...</Paragraph>
      </div>
    );
  }

  return (
    <div className="add-schedule-auto">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            background: brandColors.redSoft, 
            padding: 10, 
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={24} color={brandColors.red} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Tự động tạo lịch học</Title>
            <Text type="secondary">Thiết lập quy tắc để hệ thống tự động tạo nhiều buổi học cùng lúc</Text>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <Form 
          layout="vertical" 
          onFinish={handleSubmit(onSubmit)}
          requiredMark="optional"
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item 
                label={<Space><Calendar size={16} /> Các ngày trong tuần</Space>}
                validateStatus={errors.dayOfWeek ? 'error' : ''}
                help={errors.dayOfWeek?.message}
                required
              >
                <Controller
                  name="dayOfWeek"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      mode="multiple"
                      placeholder="Chọn các thứ trong tuần"
                      style={{ width: '100%' }}
                      options={daysOfWeek.map(d => ({ label: d.label, value: d.value }))}
                      disabled={submitting}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item 
                label={<Space><Calendar size={16} /> Ngày bắt đầu</Space>}
                validateStatus={errors.startDate ? 'error' : ''}
                help={errors.startDate?.message}
                required
              >
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      {...field}
                      type="date" 
                      disabled={submitting}
                      style={{ borderRadius: 8 }}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item 
                label={<Space><Calendar size={16} /> Ngày kết thúc</Space>}
                validateStatus={errors.endDate ? 'error' : ''}
                help={errors.endDate?.message}
                required
              >
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      {...field}
                      type="date" 
                      disabled={submitting}
                      style={{ borderRadius: 8 }}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={24}>
              <Form.Item 
                label={<Space><BookOpen size={16} /> Khóa học</Space>}
                validateStatus={errors.courseId ? 'error' : ''}
                help={errors.courseId?.message}
                required
              >
                <Controller
                  name="courseId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Chọn khóa học"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                      disabled={submitting}
                    >
                      {activeCourses.map((course: Course) => (
                        <Select.Option key={course._id} value={course._id}>
                          {course.name || course.courseName} {course.codeName ? `(${course.codeName})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item 
                label={<Space><Clock size={16} /> Ca học</Space>}
                validateStatus={errors.sessionId ? 'error' : ''}
                help={errors.sessionId?.message}
                required
              >
                <Controller
                  name="sessionId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Chọn ca học"
                      style={{ width: '100%' }}
                      disabled={submitting}
                    >
                      {sessions.map((session: Session) => (
                        <Select.Option key={session._id} value={session._id}>
                          {session.sessionName} ({session.startTime} - {session.endTime})
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item 
                label={<Space><User size={16} /> Giảng viên</Space>}
                validateStatus={errors.teacherId ? 'error' : ''}
                help={errors.teacherId?.message}
                required
              >
                <Controller
                  name="teacherId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Chọn giảng viên"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                      disabled={submitting}
                    >
                      {users.map((teacher: UserType) => (
                        <Select.Option key={teacher._id} value={teacher._id}>
                          {teacher.name} - {teacher.email}
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Ghi chú (Tùy chọn)">
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea 
                      {...field} 
                      rows={3} 
                      placeholder="Nhập ghi chú cho các buổi học..."
                      disabled={submitting}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          {submitting && (
            <div style={{ marginBottom: 24 }}>
              <Text>Đang tạo lịch học... {progress}%</Text>
              <Progress percent={progress} status="active" strokeColor={brandColors.red} />
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => reset()} disabled={submitting}>Đặt lại</Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={!submitting && <Zap size={16} />}
                style={{ background: brandColors.red, borderColor: brandColors.red }}
              >
                Tạo lịch học
              </Button>
            </Space>
          </div>
        </Form>
      </Space>

      <Modal
        title="Kết quả tạo lịch học"
        open={showResultModal}
        onOk={() => {
          setShowResultModal(false);
          if (successCount > 0 && onSuccess) onSuccess();
        }}
        onCancel={() => setShowResultModal(false)}
        width={600}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowResultModal(false)}>
            Đóng
          </Button>
        ]}
      >
        <div style={{ marginBottom: 20 }}>
          <Space size="large">
            <Text type="success"><CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Thành công: <b>{successCount}</b></Text>
            {errorCount > 0 && (
              <Text type="danger"><AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Thất bại: <b>{errorCount}</b></Text>
            )}
          </Space>
        </div>
        
        <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${brandColors.border}`, borderRadius: 8 }}>
          <List
            size="small"
            dataSource={results}
            renderItem={item => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text strong>{formatDateDisplay(item.date)}</Text>
                    <Tag color={item.status === 'success' ? 'success' : 'error'}>
                      {item.status === 'success' ? 'Thành công' : 'Thất bại'}
                    </Tag>
                  </div>
                  {item.message && (
                    <div style={{ 
                      marginTop: 4, 
                      padding: '8px 12px', 
                      background: '#FFF1F0', 
                      borderRadius: 6,
                      fontSize: 12,
                      color: brandColors.red,
                      whiteSpace: 'pre-wrap',
                      borderLeft: `3px solid ${brandColors.red}`
                    }}>
                      {item.message}
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* Custom Confirm Modal */}
      <Modal
        open={confirmModal.open}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        footer={null}
        width={480}
        centered
        styles={{ body: { padding: 0 } }}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${brandColors.red} 0%, #c0392b 100%)`,
          padding: '20px 24px',
          color: 'white',
        }}>
          <Space size={12} align="start">
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, display: 'flex' }}>
              <Zap size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Xác nhận tạo lịch tự động</div>
              <div style={{ fontSize: 13, opacity: 0.88 }}>
                Hệ thống sẽ tạo{' '}
                <span style={{ fontWeight: 700, fontSize: 15, background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: 20 }}>
                  {confirmModal.dates.length}
                </span>{' '}
                buổi học
              </div>
            </div>
          </Space>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Course */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={16} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Khóa học</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{confirmModal.course?.name || confirmModal.course?.courseName}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Session */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={15} color="#D97706" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Ca học</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{confirmModal.session?.sessionName}</div>
                  {confirmModal.session?.startTime && (
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{confirmModal.session.startTime} – {confirmModal.session.endTime}</div>
                  )}
                </div>
              </div>

              {/* Teacher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: brandColors.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>
                  {confirmModal.teacher?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Giảng viên</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{confirmModal.teacher?.name}</div>
                </div>
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={16} color="#16A34A" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thời gian</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {confirmModal.values && `${formatDateDisplay(confirmModal.values.startDate)} → ${formatDateDisplay(confirmModal.values.endDate)}`}
                </div>
              </div>
            </div>

            {/* Days of week tags */}
            {confirmModal.values && (
              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Các thứ trong tuần</div>
                <Space wrap size={6}>
                  {confirmModal.values.dayOfWeek.map(v => {
                    const day = daysOfWeek.find(d => d.value === v);
                    return (
                      <Tag key={v} style={{ borderRadius: 20, fontWeight: 600, padding: '2px 12px', background: brandColors.redSoft, border: `1px solid ${brandColors.red}20`, color: brandColors.red }}>
                        {day?.label}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            )}
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              style={{ borderRadius: 8, height: 40, flex: 1 }}
              disabled={submitting}
            >
              HỦY
            </Button>
            <Button
              type="primary"
              icon={<Zap size={15} />}
              loading={submitting}
              style={{ borderRadius: 8, height: 40, flex: 2, background: brandColors.red, borderColor: brandColors.red, fontWeight: 600 }}
              onClick={() => {
                if (confirmModal.values) {
                  setConfirmModal(prev => ({ ...prev, open: false }));
                  handlePerformCreation(confirmModal.values!, confirmModal.dates);
                }
              }}
            >
              XÁC NHẬN TẠO LỊCH
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
