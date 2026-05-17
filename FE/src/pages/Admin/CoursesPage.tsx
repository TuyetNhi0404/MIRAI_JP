import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, RefreshCw, Filter, CalendarDays, Edit, Trash2, MoreVertical, X } from 'lucide-react';
import { 
  Button, 
  TextField, 
  Chip, 
  Alert, 
  Box,
  InputAdornment,
  Card,
  CardContent,
  MenuItem,
  Menu,
  IconButton,
  Typography,
  Snackbar
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { courseService, type Course } from '../../services/courseService';

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_yet' | 'in_progress' | 'complete'>('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 6;
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend automatically updates course status based on dates
      const allCourses = await courseService.getAll();
      setCourses(allCourses);
    } catch (error: any) {
      console.error('Error loading courses:', error);
      setError(error.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    
    // Check if coming from create/update page
    const state = location.state as { message?: string; type?: 'create' | 'update' } | null;
    if (state?.message) {
      showSnackbar(state.message, 'success');
      // Clear state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    }

    // Backend automatically updates course status based on dates
    // No need for frontend sync interval anymore
  }, [location]);

  // Debounce search query - only search after user stops typing for 500ms
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        const performSearch = async () => {
          setLoading(true);
          setError(null);
          try {
            const results = await courseService.search(searchQuery.trim());
            setCourses(results);
            setPage(1);
          } catch (error: any) {
            console.error('Error searching courses:', error);
            setError(error.message || 'Failed to search courses');
          } finally {
            setLoading(false);
          }
        };
        performSearch();
      } else {
        // If search is empty, reload all courses
        loadCourses();
      }
    }, 500); // Wait 500ms after user stops typing

    // Cleanup timeout on unmount or when searchQuery changes
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async () => {
    // Manual search trigger (when clicking search button or pressing Enter)
    if (searchQuery.trim()) {
      setLoading(true);
      setError(null);
      try {
        const results = await courseService.search(searchQuery.trim());
        setCourses(results);
        setPage(1);
      } catch (error: any) {
        console.error('Error searching courses:', error);
        setError(error.message || 'Failed to search courses');
      } finally {
        setLoading(false);
      }
    } else {
      loadCourses();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      await courseService.delete(id);
      showSnackbar(`Course "${name}" deleted successfully`, 'success');
      await loadCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      showSnackbar(error.message || 'Failed to delete course', 'error');
      setError(error.message || 'Failed to delete course');
      setLoading(false);
    }
  };

  // Filter menu handlers
  const openFilterMenu = (e: React.MouseEvent<HTMLButtonElement>) => setFilterAnchorEl(e.currentTarget);
  const closeFilterMenu = () => setFilterAnchorEl(null);
  const applyFilter = (status: 'all' | 'not_yet' | 'in_progress' | 'complete') => {
    setFilterStatus(status);
    setPage(1);
    closeFilterMenu();
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/courses/${id}/edit`);
    closeActionMenu(id);
  };

  const handleCreate = () => {
    navigate('/admin/courses/new');
  };

  const handleViewStudents = (course: Course) => {
    const courseId = course._id || course.id || '';
    navigate(`/dashboard/admin/courses/${courseId}/students`);
    closeActionMenu(courseId);
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, courseId: string) => {
    setActionMenuAnchor({ [courseId]: event.currentTarget });
  };

  const closeActionMenu = (courseId: string) => {
    setActionMenuAnchor(prev => ({ ...prev, [courseId]: null }));
  };

  // Backend automatically updates course status based on dates
  // We just use the status returned from backend
  const filteredCourses = courses.filter((c) => {
    if (filterStatus === 'all') return true;
    // Use status from database (not computed from dates)
    return c.status === filterStatus;
  });

  // Format date to dd/MM/yyyy with fixed 2-digit day/month
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
    // not_yet -> red, in_progress -> yellow, complete -> green
    if (s === 'not_yet') return { label: 'not_yet', color: 'error' as const };
    if (s === 'in_progress') return { label: 'in_progress', color: 'warning' as const };
    return { label: 'complete', color: 'success' as const };
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
          MANAGER COURSE
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
          onClick={handleSearch}
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
          <MenuItem selected={filterStatus === 'not_yet'} onClick={() => applyFilter('not_yet')}>not_yet</MenuItem>
          <MenuItem selected={filterStatus === 'in_progress'} onClick={() => applyFilter('in_progress')}>in_progress</MenuItem>
          <MenuItem selected={filterStatus === 'complete'} onClick={() => applyFilter('complete')}>complete</MenuItem>
        </Menu>
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Button
            variant="contained"
            onClick={handleCreate}
            startIcon={<Plus size={18} />}
            sx={{ 
              backgroundColor: '#B90000', 
              borderRadius: '12px', 
              px: 3,
              py: 1.25,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(236, 117, 16, 0.25)',
              '&:hover': { 
                backgroundColor: '#d6690d',
                boxShadow: '0 4px 12px rgba(236, 117, 16, 0.35)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            New Course
          </Button>
        </Box>
      </Box>

      {/* New Course button on its own row (mobile only) */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleCreate}
          startIcon={<Plus size={18} />}
          sx={{ 
            backgroundColor: '#B90000', 
            borderRadius: '12px', 
            px: 3,
            py: 1.25,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(236, 117, 16, 0.25)',
            '&:hover': { 
              backgroundColor: '#d6690d',
              boxShadow: '0 4px 12px rgba(236, 117, 16, 0.35)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease',
            width: { xs: '100%', sm: 'auto' } 
          }}
        >
          New Course
        </Button>
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
            <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>Loading courses...</Typography>
        </Box>
        ) : filteredCourses.length === 0 ? (
        <Box sx={{ padding: 8, textAlign: 'center', color: '#6b7280' }}>
            <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>No courses match your current filters.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1.5, md: 2.5 } }}>
          {visibleCourses.map((course) => {
            // Use status from database (not computed from dates)
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
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: '0 8px 24px rgba(2,54,101,0.15)', 
                    transform: 'translateY(-4px)',
                    borderColor: '#d0d7de'
                  } 
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, position: 'relative' }}>
                  {/* Action Button - Top Right (only show for "not_yet" status from database) */}
                  {course.status === 'not_yet' && (
                    <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleOpenActionMenu(e, course._id || course.id || '');
                        }}
                        sx={{
                          color: '#6b7280',
                          backgroundColor: '#f9fafb',
                          width: 32,
                          height: 32,
                          '&:hover': {
                            backgroundColor: '#f3f4f6',
                            color: '#023665'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <MoreVertical size={18} />
                      </IconButton>
                      <Menu
                        anchorEl={actionMenuAnchor[course._id || course.id || '']}
                        open={Boolean(actionMenuAnchor[course._id || course.id || ''])}
                        onClose={() => closeActionMenu(course._id || course.id || '')}
                        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking menu
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                      >
                        <MenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(course._id || course.id || '');
                        }}>
                          <Edit size={18} style={{ marginRight: '8px' }} />
                          Edit
                        </MenuItem>
                        <MenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(course._id || course.id || '', course.name);
                            closeActionMenu(course._id || course.id || '');
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <Trash2 size={18} style={{ marginRight: '8px' }} />
                          Delete
                        </MenuItem>
                      </Menu>
                    </Box>
                  )}

                  {/* Course Name */}
                  <Box sx={{ mb: 2.5, pr: 5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#6b7280', 
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5
                      }}
                    >
                      Course Name
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#023665', 
                        fontWeight: 700,
                        fontSize: '1.125rem',
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
                  <Box sx={{ display: 'grid', gap: 1.75 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  {!isMobile && (
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

      {/* Custom Toast Snackbar - Giống AssignmentsPage */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: { xs: 72, sm: 84 } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: snackbar.severity === 'success' ? '#B90000' : '#f44336',
            color: 'white',
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {snackbar.severity === 'success' ? (
            <CheckCircle sx={{ fontSize: 24 }} />
          ) : (
            <ErrorIcon sx={{ fontSize: 24 }} />
          )}
          <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
            {snackbar.message}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </Snackbar>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default CoursesPage;
