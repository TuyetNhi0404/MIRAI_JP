import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Alert, 
  Box, 
  Paper,
  Typography
} from '@mui/material';
import { courseService } from '../../services/courseService';

const CourseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'not_yet' as 'not_yet' | 'in_progress' | 'complete',
    homeroomTeacherId: '',
    session: 50,
    capacity: 50, // Default capacity
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [managers, setManagers] = useState<Array<{ _id: string; name: string; email?: string }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Today's date string for date input min attribute (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto compute status from start/end dates
  const computeAutoStatus = (
    startDate: string,
    endDate: string
  ): 'not_yet' | 'in_progress' | 'complete' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!startDate) return 'not_yet';
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (today < start) return 'not_yet';
    if (!endDate) return 'in_progress';
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today > end ? 'complete' : 'in_progress';
  };

  // Load course if editing
  useEffect(() => {
    if (isEdit && id) {
      const loadCourse = async () => {
        setLoading(true);
        try {
          const course = await courseService.getById(id);
          if (course) {
            const mappedStart = course.startDate ? course.startDate.split('T')[0] : '';
            const mappedEnd = course.endDate ? course.endDate.split('T')[0] : '';
            setFormData((prev) => ({
              name: course.name,
              description: course.description || '',
              // Use status from backend (backend automatically updates status based on dates)
              status: course.status || 'not_yet',
              homeroomTeacherId: prev.homeroomTeacherId || (course.homeroomTeacherId || (course as any).managerId || ''),
              session: course.session || 50,
              capacity: course.capacity || 50,
              startDate: mappedStart,
              endDate: mappedEnd
            }));
          } else {
            setError('Course not found');
          }
        } catch (error: any) {
          setError(error.message || 'Failed to load course');
        } finally {
          setLoading(false);
        }
      };
      loadCourse();
    }
  }, [isEdit, id]);

  // Load homeroom teacher list for dropdown
  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const list = await courseService.getManagers();
        // Normalize manager id field to `_id` expected by state/UI
        const normalized = Array.isArray(list)
          ? list.map((m: any) => ({ _id: m._id ?? m.id, name: m.name, email: m.email }))
          : [];
        setManagers(normalized);
      } catch (e: any) {
        // Keep the form usable even if homeroom teacher list fails
        console.error('Failed to load homeroom teachers:', e);
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next: typeof prev = {
        ...prev,
        [name]: name === 'session' || name === 'capacity' ? parseInt(value) || 0 : value
      } as any;
      
      // If startDate changed and endDate is now invalid, clear endDate
      if (name === 'startDate' && value && next.endDate) {
        const newStart = new Date(value);
        newStart.setHours(0, 0, 0, 0);
        const currentEnd = new Date(next.endDate);
        currentEnd.setHours(0, 0, 0, 0);
        if (currentEnd < newStart) {
          next.endDate = '';
        }
      }
      
      if (name === 'startDate' || name === 'endDate') {
        const auto = computeAutoStatus(
          name === 'startDate' ? String(value) : next.startDate,
          name === 'endDate' ? String(value) : next.endDate
        );
        return { ...next, status: auto };
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Course name is required');
      return false;
    }
    if (!formData.homeroomTeacherId.trim()) {
      setError('Homeroom Teacher is required');
      return false;
    }
    if (formData.session < 0) {
      setError('Session must be 0 or greater');
      return false;
    }
    if (formData.capacity < 1) {
      setError('Capacity must be at least 1');
      return false;
    }
    // Validate start date is not in the past
    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(formData.startDate);
      if (start < today) {
        setError('Start date cannot be in the past');
        return false;
      }
    }
    // Validate end date is not before start date
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(formData.endDate);
      end.setHours(0, 0, 0, 0);
      if (end < start) {
        setError('End date cannot be before start date');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare data for backend
      // Backend automatically handles status based on dates, no need to send it
      const courseData: any = {
        name: formData.name,
        description: formData.description,
        session: formData.session,
        capacity: formData.capacity,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined
      };
      
      if (isEdit && id) {
        // Backend updateCourse expects managerId (backward compatibility)
        // But we also need to update homeroomTeacherId and homeroomTeacher for database consistency
        const selectedTeacher = managers.find(m => m._id === formData.homeroomTeacherId);
        if (selectedTeacher) {
          courseData.managerId = formData.homeroomTeacherId;
          courseData.homeroomTeacherId = formData.homeroomTeacherId;
          courseData.homeroomTeacher = selectedTeacher.name;
        }
        await courseService.update(id, courseData);
        navigate('/admin/courses', { 
          state: { 
            message: `Course "${formData.name}" updated successfully`,
            type: 'update'
          } 
        });
      } else {
        // Backend createCourse expects homeroomTeacherId
        courseData.homeroomTeacherId = formData.homeroomTeacherId;
        await courseService.create(courseData);
        navigate('/admin/courses', { 
          state: { 
            message: `Course "${formData.name}" created successfully`,
            type: 'create'
          } 
        });
      }
    } catch (err: any) {
      console.error('Error details:', err);
      setError(err.message || 'An error occurred while saving the course');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate('/admin/courses');

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={handleCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <Typography
          variant="h4"
          sx={{
            color: "#023665",
            fontWeight: "bold",
            fontSize: { xs: "1.5rem", sm: "2rem" },
            margin: 0,
          }}
        >
          {isEdit ? 'Edit Course' : 'Create New Course'}
        </Typography>
      </div>

      {/* Form */}
      <Paper elevation={3} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Course Name */}
            <TextField
              label="Course Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              fullWidth
              variant="outlined"
            />

            {/* Homeroom Teacher */}
            <FormControl fullWidth>
              <InputLabel>Homeroom Teacher</InputLabel>
              <Select
                name="homeroomTeacherId"
                label="Homeroom Teacher"
                value={formData.homeroomTeacherId}
                onChange={(e) => { setFormData(prev => ({ ...prev, homeroomTeacherId: String(e.target.value) })); }}
                disabled={loadingManagers}
                MenuProps={{
                  PaperProps: {
                    sx: { maxHeight: 300, zIndex: 1100 }
                  },
                  // Ensure the popover itself has a low z-index so footer stays on top
                  slotProps: {
                    root: {
                      sx: { zIndex: 1100 }
                    }
                  },
                  disablePortal: true
                }}
              >
                {managers.map((m) => (
                  <MenuItem key={m._id} value={m._id}>{`${m.name}${m.email ? ' (' + m.email + ')' : ''}`}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Capacity */}
            <TextField
              label="Capacity"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              fullWidth
              variant="outlined"
            />

            {/* Session */}
            <TextField
              label="Session (number of classes)"
              name="session"
              type="number"
              value={formData.session}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              fullWidth
              variant="outlined"
            />

            {/* Start Date */}
            <TextField
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: todayStr }}
              fullWidth
              variant="outlined"
            />

            {/* End Date */}
            <TextField
              label="End Date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: formData.startDate || todayStr }}
              fullWidth
              variant="outlined"
            />

            {/* Description */}
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={4}
              fullWidth
              variant="outlined"
            />
          </Box>

          {/* Form Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              startIcon={<X size={18} />}
              sx={{ px: 3 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={<Save size={18} />}
              sx={{ 
                px: 3,
                backgroundColor: '#B90000',
                '&:hover': { backgroundColor: '#d6690d' }
              }}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Course' : 'Create Course')}
            </Button>
          </Box>
        </form>
      </Paper>
    </div>
  );
};

export default CourseFormPage;
