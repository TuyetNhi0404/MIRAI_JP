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
import { brandColors } from '../../theme/theme';

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
      setError(error.response?.data?.message || 'Không thể tải danh sách khóa học');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
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
    if (s === 'not_yet') return { label: 'Chưa bắt đầu', color: 'error' as const };
    if (s === 'in_progress') return { label: 'Đang diễn ra', color: 'warning' as const };
    return { label: 'Đã hoàn thành', color: 'success' as const };
  };

  return (
    <Box sx={{ padding: '20px' }} className="mira-fade-in-up">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            color: brandColors.ink,
            fontWeight: 800,
            fontSize: { xs: "1.5rem", sm: "2rem" },
            letterSpacing: '-0.5px'
          }}
        >
          KHÓA HỌC CỦA TÔI
        </Typography>
      </Box>

      {/* Search + Right actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: { xs: 'nowrap', sm: 'nowrap' } }}>
        <TextField
          placeholder="Tìm kiếm khóa học..."
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
                borderColor: brandColors.border,
              },
              '&:hover fieldset': {
                borderColor: brandColors.textTertiary,
              },
              '&.Mui-focused fieldset': {
                borderColor: brandColors.red,
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
            border: `1px solid ${brandColors.border}`,
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: brandColors.red,
              backgroundColor: brandColors.redSoft,
              color: brandColors.red
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
            border: `1px solid ${brandColors.border}`,
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: brandColors.red,
              backgroundColor: brandColors.redSoft,
              color: brandColors.red
            },
            transition: 'all 0.2s ease'
          }}
        >
          <Filter size={18} />
        </IconButton>
        <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={closeFilterMenu}>
          <MenuItem selected={filterStatus === 'all'} onClick={() => applyFilter('all')}>Tất cả</MenuItem>
          <MenuItem selected={filterStatus === 'not_yet'} onClick={() => applyFilter('not_yet')}>Chưa bắt đầu</MenuItem>
          <MenuItem selected={filterStatus === 'in_progress'} onClick={() => applyFilter('in_progress')}>Đang diễn ra</MenuItem>
          <MenuItem selected={filterStatus === 'complete'} onClick={() => applyFilter('complete')}>Đã hoàn thành</MenuItem>
        </Menu>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* Card list */}
      {loading ? (
        <Box sx={{ padding: 8, textAlign: 'center', color: '#6b7280' }}>
          <CircularProgress sx={{ mb: 2, color: brandColors.red }} />
          <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Đang tải danh sách khóa học...</Typography>
        </Box>
      ) : filteredCourses.length === 0 ? (
        <Box sx={{ padding: 8, textAlign: 'center', color: '#6b7280' }}>
          <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {searchQuery || filterStatus !== 'all'
              ? 'Không tìm thấy khóa học nào phù hợp với bộ lọc.'
              : 'Bạn chưa được phân công làm giáo viên chủ nhiệm cho khóa học nào.'}
          </Typography>
        </Box>
      ) : (
        <Box
          className="mira-stagger"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: '1fr 1fr',
              lg: '1fr 1fr 1fr'
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
            px: { xs: 1, sm: 0 }
          }}
        >
          {visibleCourses.map((course) => {
            const status = mapStatus(course.status);
            return (
              <Card
                key={course._id || course.id}
                className="mira-card-hover"
                onClick={() => handleViewStudents(course)}
                sx={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: `1px solid ${brandColors.border}`,
                  backgroundColor: '#ffffff',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: { xs: 'auto', sm: 'auto', md: 280 },
                  p: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                  '&:hover': {
                    borderColor: brandColors.redLight,
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, position: 'relative' }}>
                  {/* Course Name */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: brandColors.ink,
                        fontWeight: 800,
                        fontSize: { xs: '1rem', sm: '1.1rem', md: '1.125rem' },
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        letterSpacing: '-0.2px'
                      }}
                    >
                      {course.name}
                    </Typography>
                  </Box>

                  {/* Divider */}
                  <Box sx={{ height: '1px', backgroundColor: brandColors.borderLight, mb: 2 }} />

                  {/* Info Grid */}
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    {/* Homeroom Teacher */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500 }}>
                        Giáo viên chủ nhiệm
                      </Typography>
                      <Typography variant="body2" sx={{ color: brandColors.ink, fontSize: '0.875rem', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>
                        {course.homeroomTeacher || '-'}
                      </Typography>
                    </Box>

                    {/* Session & Capacity Row */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500, mb: 0.25 }}>
                          Ca học
                        </Typography>
                        <Typography variant="body2" sx={{ color: brandColors.ink, fontSize: '0.875rem', fontWeight: 700 }}>
                          {course.session ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500, mb: 0.25 }}>
                          Sức chứa
                        </Typography>
                        <Typography variant="body2" sx={{ color: brandColors.ink, fontSize: '0.875rem', fontWeight: 700 }}>
                          {course.capacity}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Enrolled */}
                    <Box sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: brandColors.bg,
                      border: `1px solid ${brandColors.borderLight}`
                    }}>
                      <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500 }}>
                        Đã ghi danh
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: brandColors.red,
                            fontSize: '1rem',
                            fontWeight: 800
                          }}
                        >
                          {course.enrolledCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.75rem', fontWeight: 600 }}>
                          / {course.capacity}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Start Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500 }}>
                          Ngày bắt đầu
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                          <CalendarDays size={14} className="text-gray-500" />
                          <Typography variant="body2" sx={{ color: brandColors.ink, fontSize: '0.875rem', fontWeight: 600 }}>
                            {formatDateFixed(course.startDate)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* End Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500 }}>
                          Ngày kết thúc
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                          <CalendarDays size={14} className="text-gray-500" />
                          <Typography variant="body2" sx={{ color: brandColors.ink, fontSize: '0.875rem', fontWeight: 600 }}>
                            {formatDateFixed(course.endDate)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                      <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontSize: '0.875rem', fontWeight: 500 }}>
                        Trạng thái
                      </Typography>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{
                          fontWeight: 700,
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 5, gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={goPrev} 
            disabled={currentPage === 1} 
            sx={{ 
              borderRadius: '8px', 
              minWidth: 36, 
              color: brandColors.textPrimary,
              borderColor: brandColors.border,
              '&:hover': { borderColor: brandColors.red, color: brandColors.red }
            }}
          >
            {'<'}
          </Button>
          {pagesArray.map((p) => (
            p === currentPage ? (
              <Box 
                key={p} 
                sx={{ 
                  px: 1.5, 
                  py: 0.5, 
                  fontWeight: 700, 
                  color: '#ffffff', 
                  borderRadius: '8px', 
                  backgroundColor: brandColors.red, 
                  minWidth: 36, 
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}
              >
                {p}
              </Box>
            ) : (
              <Button
                key={p}
                size="small"
                variant="outlined"
                onClick={() => setPage(p)}
                sx={{ 
                  borderRadius: '8px', 
                  minWidth: 36,
                  color: brandColors.textSecondary,
                  borderColor: brandColors.border,
                  '&:hover': { borderColor: brandColors.red, color: brandColors.red }
                }}
              >
                {p}
              </Button>
            )
          ))}
          <Button 
            size="small" 
            variant="outlined" 
            onClick={goNext} 
            disabled={currentPage === totalPages} 
            sx={{ 
              borderRadius: '8px', 
              minWidth: 36,
              color: brandColors.textPrimary,
              borderColor: brandColors.border,
              '&:hover': { borderColor: brandColors.red, color: brandColors.red }
            }}
          >
            {'>'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TeacherCoursesPage;
