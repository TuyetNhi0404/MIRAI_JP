'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  OutlinedInput,
  TextField,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Calendar, Clock, User, BookOpen, Zap } from 'lucide-react';
import { AxiosError } from 'axios';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import type { Course, Session, User as UserType } from '../../../types/schedule.types';

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

interface MyFormAutoProps {
  onSuccess?: () => void;
  isLoading?: boolean;
}

interface DayOfWeek {
  value: string;
  label: string;
  dayIndex: number;
}

interface PendingSubmit {
  values: FormData;
  scheduleDates: Date[];
  confirmMessage: string;
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
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle sx={{ fontWeight: "bold" }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>Hủy</Button>
        <Button variant="contained" color="primary" onClick={onConfirm}>Xác nhận</Button>
      </DialogActions>
    </Dialog>
  );
};

export default function MyFormAuto({ onSuccess, isLoading: externalLoading }: MyFormAutoProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { courses, sessions, users, loading: dataLoading } = useScheduleData();
  
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdCount, setCreatedCount] = useState(0);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<PendingSubmit | null>(null);

  const activeCourses = courses.filter((c: Course) => 
    c.status === 'not_yet' || c.status === 'in_progress'
  );
  const teachers = users;

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

  async function onSubmit(values: FormData) {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      setCreatedCount(0);

      const scheduleDates = generateScheduleDates(
        values.startDate,
        values.endDate,
        values.dayOfWeek
      );

      if (scheduleDates.length === 0) {
        setErrorMessage('Không tìm thấy ngày phù hợp trong khoảng thời gian đã chọn');
        return;
      }

      const selectedCourse = activeCourses.find((c: Course) => c._id === values.courseId);
      const selectedSession = sessions.find((s: Session) => s._id === values.sessionId);
      const selectedTeacher = teachers.find((t: UserType) => t._id === values.teacherId);
      
      const confirmMessage = `Hành động này sẽ tạo ${scheduleDates.length} lịch học từ ngày ${formatDateDisplay(values.startDate)} đến ngày ${formatDateDisplay(values.endDate)}.\n\nKhóa học: ${selectedCourse?.name || selectedCourse?.courseName || 'Không xác định'}\nCa học: ${selectedSession?.sessionName || 'Không xác định'}\nGiảng viên: ${selectedTeacher?.name || 'Không xác định'}\nThứ: ${values.dayOfWeek.map(val => daysOfWeek.find(d => d.value === val)?.label).join(', ')}\n\nBạn có muốn tiếp tục không?`;
      
      setPendingSubmit({ values, scheduleDates, confirmMessage });
      setConfirmOpen(true);

    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Form submission error', error);
      setErrorMessage(axiosError.response?.data?.message || 'Chuẩn bị tạo lịch thất bại');
    }
  }

  const handleConfirmSubmit = async () => {
    if (!pendingSubmit) return;

    const { values, scheduleDates } = pendingSubmit;
    
    setConfirmOpen(false);
    setSubmitting(true);

    let successCount = 0;
    const errors: string[] = [];

    for (const date of scheduleDates) {
      try {
        await calendarAPI.create({
          courseId: values.courseId,
          sessionId: values.sessionId,
          teacherId: values.teacherId,
          date: date.toISOString().split('T')[0],
          note: values.note || `Lịch học tạo tự động`,
        });
        successCount++;
        setCreatedCount(successCount);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        const dateStr = formatDateDisplay(date.toISOString().split('T')[0]);
        errors.push(`${dateStr}: ${axiosError.response?.data?.message || 'Thất bại'}`);
      }
    }

    if (successCount > 0) {
      setSuccessMessage(
        `Đã tạo thành công ${successCount} trên tổng số ${scheduleDates.length} lịch học!`
      );
      
      reset();

      if (onSuccess) onSuccess();

      setTimeout(() => setSuccessMessage(''), 5000);
    }

    if (errors.length > 0) {
      setErrorMessage(
        `Tạo thất bại ${errors.length} lịch học:\n${errors.slice(0, 5).join('\n')}${
          errors.length > 5 ? `\n... và ${errors.length - 5} lịch khác` : ''
        }`
      );
    }

    setSubmitting(false);
    setPendingSubmit(null);
  };

  const handleCancelSubmit = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
  };

  const handleReset = () => {
    reset();
    setErrorMessage('');
    setSuccessMessage('');
    setCreatedCount(0);
  };

  if (dataLoading) {
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: isMobile ? 2 : 4 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Zap size={24} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Tự động tạo lịch học
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tự động tạo nhiều lịch học cho các ngày được chọn trong tuần
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{errorMessage}</pre>
            </Alert>
          )}

          {submitting && createdCount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Đang tạo lịch học... đã hoàn thành {createdCount}
            </Alert>
          )}

          <Box 
            component="form" 
            onSubmit={handleSubmit(onSubmit)} 
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <FormControl error={!!errors.dayOfWeek} fullWidth required>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Calendar size={18} />
                <FormLabel>Các ngày trong tuần *</FormLabel>
              </Stack>
              <Controller
                name="dayOfWeek"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    multiple
                    input={<OutlinedInput />}
                    disabled={submitting}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={daysOfWeek.find(d => d.value === value)?.label} 
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {daysOfWeek.map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        {day.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.dayOfWeek && (
                <FormHelperText>{errors.dayOfWeek.message}</FormHelperText>
              )}
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2 }}>
              <FormControl error={!!errors.startDate} fullWidth required>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Calendar size={18} />
                  <FormLabel>Ngày bắt đầu *</FormLabel>
                </Stack>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <>
                      <TextField
                        {...field}
                        type="date"
                        disabled={submitting}
                        InputLabelProps={{ shrink: true }}
                      />
                      {field.value && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Hiển thị: {formatDateDisplay(field.value)}
                        </Typography>
                      )}
                    </>
                  )}
                />
                {errors.startDate && (
                  <FormHelperText>{errors.startDate.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl error={!!errors.endDate} fullWidth required>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Calendar size={18} />
                  <FormLabel>Ngày kết thúc *</FormLabel>
                </Stack>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <>
                      <TextField
                        {...field}
                        type="date"
                        disabled={submitting}
                        InputLabelProps={{ shrink: true }}
                      />
                      {field.value && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Hiển thị: {formatDateDisplay(field.value)}
                        </Typography>
                      )}
                    </>
                  )}
                />
                {errors.endDate && (
                  <FormHelperText>{errors.endDate.message}</FormHelperText>
                )}
              </FormControl>
            </Box>

            <FormControl error={!!errors.courseId} fullWidth required>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <BookOpen size={18} />
                <FormLabel>Tên khóa học *</FormLabel>
              </Stack>
              <Controller
                name="courseId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={submitting}
                    displayEmpty
                  >
                    <MenuItem value=""><em>Chọn một khóa học</em></MenuItem>
                    {activeCourses.map((course: Course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.name || course.courseName} {course.codeName ? `(${course.codeName})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.courseId && (
                <FormHelperText>{errors.courseId.message}</FormHelperText>
              )}
            </FormControl>

            <FormControl error={!!errors.sessionId} fullWidth required>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Clock size={18} />
                <FormLabel>Ca học *</FormLabel>
              </Stack>
              <Controller
                name="sessionId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={submitting}
                    displayEmpty
                  >
                    <MenuItem value=""><em>Chọn một ca học</em></MenuItem>
                    {sessions.map((session: Session) => (
                      <MenuItem key={session._id} value={session._id}>
                        {session.sessionName} ({session.startTime} - {session.endTime})
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.sessionId && (
                <FormHelperText>{errors.sessionId.message}</FormHelperText>
              )}
            </FormControl>

            <FormControl error={!!errors.teacherId} fullWidth required>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <User size={18} />
                <FormLabel>Giảng viên *</FormLabel>
              </Stack>
              <Controller
                name="teacherId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={submitting}
                    displayEmpty
                  >
                    <MenuItem value=""><em>Chọn giảng viên</em></MenuItem>
                    {teachers.map((teacher: UserType) => (
                      <MenuItem key={teacher._id} value={teacher._id}>
                        {teacher.name} - {teacher.email}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.teacherId && (
                <FormHelperText>{errors.teacherId.message}</FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Ghi chú (Tùy chọn)</FormLabel>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    multiline
                    rows={3}
                    disabled={submitting}
                    placeholder="Thêm ghi chú nếu có..."
                  />
                )}
              />
            </FormControl>

            <Divider />

            <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="center">
              <Button 
                variant="outlined" 
                color="secondary" 
                type="button"
                onClick={handleReset}
                disabled={submitting}
                sx={{ minWidth: 120 }}
              >
                Đặt lại
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                type="submit" 
                disabled={submitting || externalLoading}
                startIcon={submitting ? <CircularProgress size={20} /> : <Zap size={20} />}
                sx={{ minWidth: 120 }}
              >
                {submitting ? `Đang tạo... (${createdCount})` : 'Tạo lịch học'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận tự động tạo lịch học"
        message={pendingSubmit?.confirmMessage || ''}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />
    </>
  );
}
