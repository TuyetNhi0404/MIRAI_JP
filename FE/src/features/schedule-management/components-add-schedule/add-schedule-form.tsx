'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  FormHelperText,
  CircularProgress,
  Alert,
  Stack,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { BookOpen, User, Clock, FileText, CalendarCheck } from 'lucide-react';
import { useScheduleData } from '../../../hooks/useScheduleData';
import { calendarAPI } from '../../../services/scheduleManagementAPI';
import type { User as UserType, Course, Session, Calendar } from '../../../types/schedule.types';

interface AddScheduleFormProps {
  onAdd?: (data: Calendar) => void;
  onSuccess?: () => void;
  isLoading?: boolean;
}

interface FormErrors {
  courseId?: string;
  sessionId?: string;
  teacherId?: string;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface ApiCreateResponse {
  data: {
    data: Calendar;
  };
}

export default function AddScheduleForm({ onAdd, onSuccess }: AddScheduleFormProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { courses, sessions, users, loading: dataLoading } = useScheduleData();
  
  const [formData, setFormData] = useState({
    classDate: new Date().toISOString().split('T')[0],
    courseId: '',
    sessionId: '',
    teacherId: '',
    note: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formatDateDisplay = (date: string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: FormErrors = {};
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (!formData.sessionId) newErrors.sessionId = 'Please select a session';
    if (!formData.teacherId) newErrors.teacherId = 'Please select a teacher';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await calendarAPI.create({
        courseId: formData.courseId,
        sessionId: formData.sessionId,
        teacherId: formData.teacherId,
        date: formData.classDate,
        note: formData.note,
      }) as ApiCreateResponse;

      setSuccessMessage('Schedule created successfully!');
      
      // Reset form
      setFormData({
        classDate: new Date().toISOString().split('T')[0],
        courseId: '',
        sessionId: '',
        teacherId: '',
        note: '',
      });
      setErrors({});

      // Callbacks
      if (onAdd) {
        onAdd(response.data.data);
      }
      if (onSuccess) onSuccess();

      // Auto hide success message after 3s
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error creating schedule:', err);
      const error = err as ApiErrorResponse;
      const errMsg = error.response?.data?.message || error.message || 'Failed to create schedule';
      setErrorMessage(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      classDate: new Date().toISOString().split('T')[0],
      courseId: '',
      sessionId: '',
      teacherId: '',
      note: '',
    });
    setErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  const teachers = users;
  const activeCourses = courses.filter((c: Course) => 
    c.status === 'not_yet' || c.status === 'in_progress'
  );

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
    <Card sx={{ mt: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: isMobile ? 2 : 4 }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Date Field */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CalendarCheck size={18} />
                  <Typography variant="body2" fontWeight={600}>
                    Class Date *
                  </Typography>
                </Stack>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.classDate}
                  onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  disabled={submitting}
                />
                {formData.classDate && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Display: {formatDateDisplay(formData.classDate)}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Course Field */}
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <BookOpen size={18} />
                <Typography variant="body2" fontWeight={600}>
                  Course Name *
                </Typography>
              </Stack>
              <FormControl fullWidth required error={!!errors.courseId}>
                <InputLabel>Course Name</InputLabel>
                <Select
                  value={formData.courseId}
                  onChange={(e) => {
                    setFormData({ ...formData, courseId: e.target.value });
                    setErrors({ ...errors, courseId: '' });
                  }}
                  label="Course Name"
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select a course</em>
                  </MenuItem>
                  {activeCourses.map((course: Course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.courseName || course.name} {course.codeName ? `(${course.codeName})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {errors.courseId && <FormHelperText>{errors.courseId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Session Field */}
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Clock size={18} />
                <Typography variant="body2" fontWeight={600}>
                  Session *
                </Typography>
              </Stack>
              <FormControl fullWidth required error={!!errors.sessionId}>
                <InputLabel>Session</InputLabel>
                <Select
                  value={formData.sessionId}
                  onChange={(e) => {
                    setFormData({ ...formData, sessionId: e.target.value });
                    setErrors({ ...errors, sessionId: '' });
                  }}
                  label="Session"
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select a session</em>
                  </MenuItem>
                  {sessions.map((session: Session) => (
                    <MenuItem key={session._id} value={session._id}>
                      {session.sessionName} ({session.startTime} - {session.endTime})
                    </MenuItem>
                  ))}
                </Select>
                {errors.sessionId && <FormHelperText>{errors.sessionId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Teacher Field */}
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <User size={18} />
                <Typography variant="body2" fontWeight={600}>
                  Teacher *
                </Typography>
              </Stack>
              <FormControl fullWidth required error={!!errors.teacherId}>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={formData.teacherId}
                  onChange={(e) => {
                    setFormData({ ...formData, teacherId: e.target.value });
                    setErrors({ ...errors, teacherId: '' });
                  }}
                  label="Teacher"
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select a teacher</em>
                  </MenuItem>
                  {teachers.map((teacher: UserType) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name} - {teacher.email}
                    </MenuItem>
                  ))}
                </Select>
                {errors.teacherId && <FormHelperText>{errors.teacherId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Note Field */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FileText size={18} />
                <Typography variant="body2" fontWeight={600}>
                  Note (Optional)
                </Typography>
              </Stack>
              <TextField
                fullWidth
                label="Note (Optional)"
                multiline
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={submitting}
                placeholder="Add any additional notes here..."
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="center">
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={handleReset}
                  disabled={submitting}
                  sx={{ minWidth: 120 }}
                >
                  Reset
                </Button>
                <Button 
                  type="submit"
                  variant="contained" 
                  color="primary" 
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : null}
                  sx={{ minWidth: 120 }}
                >
                  {submitting ? 'Creating...' : 'Create Schedule'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
