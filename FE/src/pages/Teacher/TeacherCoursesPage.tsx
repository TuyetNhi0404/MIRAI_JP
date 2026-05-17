// src/pages/TeacherCoursesPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Filter, CalendarDays } from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  MenuItem,
  Menu,
  Button
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import axiosInstance from '../../api/axiosInstance';

interface Course {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  status: 'not_yet' | 'in_progress' | 'complete';
  startDate: string;
  endDate: string;
  homeroomTeacher: string;
  capacity: number;
  session: number;
  enrolledCount: number;
  createdAt: string;
}

const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_yet' | 'in_progress' | 'complete'>('all');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const rowsPerPage = 6;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  const fetchTeacherCourses = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');

      const response = await axiosInstance.get<{ data: Course[]; total: number }>(
        '/courses/teacher/courses'
      );

      setCourses(response.data.data || []);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Search logic is handled by filteredCourses
    setPage(1);
  };

  // Filter menu handlers
  const openFilterMenu = (e: React.MouseEvent<HTMLButtonElement>) => setFilterAnchorEl(e.currentTarget);
  const closeFilterMenu = () => setFilterAnchorEl(null);
  const applyFilter = (status: 'all' | 'not_yet' | 'in_progress' | 'complete') => {
    setFilterStatus(status);
    setPage(1);
    closeFilterMenu();
  };

  const handleViewStudents = (course: Course) => {
    const courseId = course._id || course.id || '';
    navigate(`/dashboard/teacher/courses/${courseId}/members`);
  };

  // Filter courses based on search and status
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = searchQuery.trim() === '' ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.homeroomTeacher.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const formatDateFixed = (input?: string) => {
    if (!input) return '-';
    try {
      const d = new Date(input);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const visibleCourses = isMobile ? filteredCourses : filteredCourses.slice(startIndex, endIndex);
  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const mapStatus = (s: Course['status']) => {
    if (s === 'not_yet') return { label: 'Not Started', color: 'error' as const };
    if (s === 'in_progress') return { label: 'In Progress', color: 'warning' as const };
    return { label: 'Completed', color: 'success' as const };
  };

  return (
    <Box sx={{ padding: '20px' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            color: "#023665",
            fontWeight: "bold",
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          MY COURSES
        </Typography>
      </Box>

      {/* Search + Right actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: { xs: 'nowrap', sm: 'nowrap' } }}>
        <TextField
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#6b7280" />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: 520,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: '#d1d5db',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#B90000',
borderWidth: '2px'
              }
            }
          }}
          variant="outlined"
        />
        <IconButton
          onClick={fetchTeacherCourses}
          sx={{
            width: { xs: 38, sm: 44 },
            height: { xs: 38, sm: 44 },
            borderRadius: '12px',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: '#B90000',
              backgroundColor: '#fff5e6',
              color: '#B90000'
            },
            transition: 'all 0.2s ease'
          }}

        >
          <RefreshCw size={18} />
        </IconButton>
        <IconButton
          onClick={openFilterMenu}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: '#B90000',
              backgroundColor: '#fff5e6',
              color: '#B90000'
            },
            transition: 'all 0.2s ease'
          }}
        >
          <Filter size={18} />
        </IconButton>
        <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={closeFilterMenu}>
          <MenuItem selected={filterStatus === 'all'} onClick={() => applyFilter('all')}>All</MenuItem>
          <MenuItem selected={filterStatus === 'not_yet'} onClick={() => applyFilter('not_yet')}>Not Started</MenuItem>
          <MenuItem selected={filterStatus === 'in_progress'} onClick={() => applyFilter('in_progress')}>In Progress</MenuItem>
          <MenuItem selected={filterStatus === 'complete'} onClick={() => applyFilter('complete')}>Completed</MenuItem>
        </Menu>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Card list */}
      {loading ? (
        <Box sx={{ padding: 8, textAlign: 'center', color: '#6b7280' }}>
          <CircularProgress sx={{ mb: 2, color: '#B90000' }} />
          <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>Loading courses...</Typography>
        </Box>
      ) : filteredCourses.length === 0 ? (
        <Box sx={{ padding: 8, textAlign: 'center', color: '#6b7280' }}>
          <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
            {searchQuery || filterStatus !== 'all'
              ? 'No courses match your current filters.'
              : 'You are not assigned as a homeroom teacher for any courses yet'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',        // Mobile: 1 cột
              sm: '1fr 1fr',    // Tablet nhỏ: 2 cột
              md: '1fr 1fr',    // Desktop giữ nguyên
              lg: '1fr 1fr 1fr'
            },
gap: { xs: 1.5, sm: 2, md: 2.5 },
            px: { xs: 1, sm: 0 }
          }}
        >
          {visibleCourses.map((course) => {
            const status = mapStatus(course.status);
            return (
              <Card
                key={course._id || course.id}
                variant="outlined"
                onClick={() => handleViewStudents(course)}
                sx={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e8eaed',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',

                  width: '100%',
                  minHeight: { xs: 'auto', sm: 'auto', md: 280 },
                  p: { xs: 0.5, sm: 1, md: 0 },

                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(2,54,101,0.15)',
                    transform: { xs: 'none', md: 'translateY(-4px)' },
                    borderColor: '#d0d7de'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, position: 'relative' }}>
                  {/* Course Name */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#023665',
                        fontWeight: 700,
                        fontSize: { xs: '1rem', sm: '1.1rem', md: '1.125rem' },
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}
                    >
                      {course.name}
                    </Typography>
                  </Box>

                  {/* Divider */}
                  <Box sx={{ height: '1px', backgroundColor: '#f0f0f0', mb: 2 }} />

                  {/* Info Grid */}
                  <Box sx={{ display: 'grid', gap: { xs: 1.25, sm: 1.5, md: 1.75 }, mt: { xs: 1, sm: 1.5 } }}>
                    {/* Homeroom Teacher */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                        Homeroom Teacher
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                        {course.homeroomTeacher || '-'}
                      </Typography>
                    </Box>

                    {/* Session & Capacity Row */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, mb: 0.25 }}>
                          Session
</Typography>
                        <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem', fontWeight: 600 }}>
                          {course.session ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, mb: 0.25 }}>
                          Capacity
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem', fontWeight: 600 }}>
                          {course.capacity}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Enrolled */}
                    <Box sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #f0f0f0'
                    }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                        Enrolled
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: '#B90000',
                            fontSize: '1rem',
                            fontWeight: 700
                          }}
                        >
                          {course.enrolledCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          / {course.capacity}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Start Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'row', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                          Start Date
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'flex-end', width: { xs: 160, sm: 180 }, flexShrink: 0 }}>
                          <CalendarDays size={16} color="#6b7280" />
                          <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums', ml: 0 }}>
                            {formatDateFixed(course.startDate)}
</Typography>
                        </Box>
                      </Box>

                      {/* End Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'row', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                          End Date
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'flex-end', width: { xs: 160, sm: 180 }, flexShrink: 0 }}>
                          <CalendarDays size={16} color="#6b7280" />
                          <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums', ml: 0 }}>
                            {formatDateFixed(course.endDate)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                        Status
                      </Typography>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24,
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Pagination (hidden on mobile) */}
      {!isMobile && filteredCourses.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: { xs: 0.75, md: 1.2 } }}>
          <Button size="small" variant="outlined" onClick={goPrev} disabled={currentPage === 1} sx={{ borderRadius: '10px', minWidth: { xs: 28, md: 36 } }}>{'<'}</Button>
          {pagesArray.map((p) => (
            p === currentPage ? (
              <Box key={p} sx={{ px: { xs: 1, md: 1.5 }, py: 0.4, fontWeight: 700, color: '#111827', border: '1px solid #cfd8dc', borderRadius: '10px', backgroundColor: '#f3f4f6', minWidth: { xs: 28, md: 36 }, textAlign: 'center' }}>{p}</Box>
            ) : (
              <Button
                key={p}
                size="small"
                variant="outlined"
                onClick={() => setPage(p)}
                sx={{ borderRadius: '10px', minWidth: { xs: 28, md: 36 } }}
              >
                {p}
              </Button>
            )
          ))}
<Button size="small" variant="outlined" onClick={goNext} disabled={currentPage === totalPages} sx={{ borderRadius: '10px', minWidth: { xs: 28, md: 36 } }}>{'>'}</Button>
        </Box>
      )}
    </Box>
  );
};

export default TeacherCoursesPage;
