// src/pages/Teacher/TeacherCoursesPage.tsx – Premium Redesign
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Filter, CalendarDays, Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
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
  Button,
  LinearProgress,
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

const statusConfig = {
  not_yet: {
    label: 'Chưa bắt đầu',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bg: '#EEF2FF',
    color: '#4338CA',
    dot: '#6366F1',
  },
  in_progress: {
    label: 'Đang diễn ra',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    bg: '#FFF7ED',
    color: '#C2410C',
    dot: '#F97316',
  },
  complete: {
    label: 'Hoàn thành',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    bg: '#ECFDF5',
    color: '#065F46',
    dot: '#10B981',
  },
};

const cardAccents = [
  { top: 'linear-gradient(135deg, #B90000 0%, #FF7875 100%)', side: '#B90000' },
  { top: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', side: '#667eea' },
  { top: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', side: '#f5576c' },
  { top: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', side: '#4facfe' },
  { top: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', side: '#43e97b' },
  { top: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', side: '#fa709a' },
];

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
      const response = await axiosInstance.get<{ data: Course[]; total: number }>('/courses/teacher/courses');
      setCourses(response.data.data || []);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể tải danh sách khóa học');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
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
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: 1440,
        mx: 'auto',
        width: '100%',
        fontFamily: '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif',
        backgroundColor: "#ffffff"
      }}
      className="mira-fade-in-up"
    >
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, mb: 4,
          bgcolor: '#ffffff', borderRadius: '16px',
          border: `1px solid ${brandColors.border}`,
          p: { xs: 1.5, md: 2 },
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <TextField
          placeholder="Tìm kiếm khóa học..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={brandColors.textTertiary} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1, minWidth: 0,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontFamily: '"Be Vietnam Pro", sans-serif',
              fontSize: '0.9rem',
              bgcolor: brandColors.bg,
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: brandColors.redLight },
              '&.Mui-focused fieldset': { borderColor: brandColors.red, borderWidth: '2px' },
            },
          }}
          variant="outlined"
        />

        {/* Active filter chip */}
        {filterStatus !== 'all' && (
          <Chip
            label={statusConfig[filterStatus].label}
            onDelete={() => applyFilter('all')}
            size="small"
            sx={{
              fontFamily: '"Be Vietnam Pro", sans-serif',
              fontWeight: 600, fontSize: '0.78rem',
              bgcolor: statusConfig[filterStatus].bg,
              color: statusConfig[filterStatus].color,
              border: `1px solid ${statusConfig[filterStatus].dot}30`,
              flexShrink: 0,
            }}
          />
        )}

        <IconButton
          onClick={fetchTeacherCourses}
          sx={{
            width: 42, height: 42, borderRadius: '10px',
            color: brandColors.textSecondary,
            border: `1px solid ${brandColors.border}`,
            bgcolor: brandColors.bg,
            '&:hover': { borderColor: brandColors.red, bgcolor: brandColors.redSoft, color: brandColors.red, transform: 'rotate(180deg)' },
            transition: 'all 0.35s ease',
            flexShrink: 0,
          }}
        >
          <RefreshCw size={16} />
        </IconButton>

        <IconButton
          onClick={openFilterMenu}
          sx={{
            width: 42, height: 42, borderRadius: '10px',
            color: filterStatus !== 'all' ? brandColors.red : brandColors.textSecondary,
            border: `1px solid ${filterStatus !== 'all' ? brandColors.red : brandColors.border}`,
            bgcolor: filterStatus !== 'all' ? brandColors.redSoft : brandColors.bg,
            '&:hover': { borderColor: brandColors.red, bgcolor: brandColors.redSoft, color: brandColors.red },
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Filter size={16} />
        </IconButton>

        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={closeFilterMenu}
          PaperProps={{
            sx: { borderRadius: '14px', border: `1px solid ${brandColors.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', minWidth: 180 }
          }}
        >
          {(['all', 'not_yet', 'in_progress', 'complete'] as const).map((s) => (
            <MenuItem
              key={s}
              selected={filterStatus === s}
              onClick={() => applyFilter(s)}
              sx={{
                fontFamily: '"Be Vietnam Pro", sans-serif',
                fontWeight: 500, fontSize: '0.875rem', borderRadius: '8px', mx: 0.5,
                '&.Mui-selected': { bgcolor: brandColors.redSoft, color: brandColors.red },
              }}
            >
              {s === 'all' ? 'Tất cả trạng thái' : statusConfig[s].label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* ═══ ERROR ═══ */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontFamily: '"Be Vietnam Pro", sans-serif' }}>
          {error}
        </Alert>
      )}

      {/* ═══ LOADING ═══ */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <CircularProgress sx={{ color: brandColors.red, mb: 2 }} size={36} />
          <Typography sx={{ color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500 }}>
            Đang tải danh sách khóa học...
          </Typography>
        </Box>
      ) : filteredCourses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, bgcolor: '#fff', borderRadius: '20px', border: `2px dashed ${brandColors.border}` }}>
          <Typography sx={{ mt: 2, color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 600, fontSize: '1.05rem' }}>
            {searchQuery || filterStatus !== 'all' ? 'Không tìm thấy khóa học nào' : 'Chưa có khóa học nào'}
          </Typography>
          <Typography sx={{ color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.875rem', mt: 0.5 }}>
            {searchQuery || filterStatus !== 'all' ? 'Thử điều chỉnh từ khóa hoặc bộ lọc.' : 'Bạn chưa được phân công làm giáo viên chủ nhiệm cho khóa học nào.'}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Result count */}
          <Typography sx={{ color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.8rem', fontWeight: 500, mb: 2 }}>
            Hiển thị <strong style={{ color: brandColors.ink }}>{visibleCourses.length}</strong> trong <strong style={{ color: brandColors.ink }}>{filteredCourses.length}</strong> khóa học
          </Typography>

          {/* ═══ COURSE CARDS GRID ═══ */}
          <Box
            className="mira-stagger"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {visibleCourses.map((course, idx) => {
              const st = statusConfig[course.status];
              const accent = cardAccents[idx % cardAccents.length];
              const enrollPct = course.capacity > 0 ? Math.round((course.enrolledCount / course.capacity) * 100) : 0;

              return (
                <Card
                  key={course._id || course.id}
                  className="mira-card-hover"
                  onClick={() => handleViewStudents(course)}
                  sx={{
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: `1px solid ${brandColors.borderLight}`,
                    backgroundColor: '#ffffff',
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: `0 20px 50px rgba(0,0,0,0.1), 0 0 0 2px ${accent.side}30`,
                      borderColor: `${accent.side}40`,
                    },
                  }}
                >
                  {/* Colorful top accent band */}
                  <Box sx={{ height: 6, background: accent.top, flexShrink: 0 }} />

                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    {/* Course name + status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: brandColors.ink,
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          fontFamily: '"Be Vietnam Pro", sans-serif',
                          lineHeight: 1.3,
                          flex: 1,
                          wordBreak: 'break-word',
                        }}
                      >
                        {course.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1.25, py: 0.4,
                          borderRadius: '20px',
                          bgcolor: st.bg,
                          border: `1px solid ${st.dot}30`,
                          flexShrink: 0,
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: st.dot }} />
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: st.color, fontFamily: '"Be Vietnam Pro", sans-serif', whiteSpace: 'nowrap' }}>
                          {st.label}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ height: '1px', background: `linear-gradient(90deg, ${accent.side}30 0%, transparent 100%)`, mb: 2 }} />

                    {/* Teacher */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography sx={{ color: brandColors.textSecondary, fontSize: '0.82rem', fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500 }}>
                        Giáo viên chủ nhiệm
                      </Typography>
                      <Typography sx={{ color: brandColors.ink, fontSize: '0.85rem', fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 700 }}>
                        {course.homeroomTeacher || '-'}
                      </Typography>
                    </Box>

                    {/* Session + Capacity */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1, p: 1.5, borderRadius: '10px', bgcolor: brandColors.bg, border: `1px solid ${brandColors.borderLight}`, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: brandColors.ink, fontFamily: '"Be Vietnam Pro", sans-serif', lineHeight: 1 }}>
                          {course.session ?? 0}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500, mt: 0.25 }}>
                          Ca học
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, p: 1.5, borderRadius: '10px', bgcolor: brandColors.bg, border: `1px solid ${brandColors.borderLight}`, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: brandColors.ink, fontFamily: '"Be Vietnam Pro", sans-serif', lineHeight: 1 }}>
                          {course.capacity}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500, mt: 0.25 }}>
                          Sức chứa
                        </Typography>
                      </Box>
                    </Box>

                    {/* Enrollment progress */}
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: brandColors.bg, border: `1px solid ${brandColors.borderLight}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography sx={{ fontSize: '0.78rem', color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500 }}>
                          Đã ghi danh
                        </Typography>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                          <span style={{ color: accent.side }}>{course.enrolledCount}</span>
                          <span style={{ color: brandColors.textTertiary, fontWeight: 500, fontSize: '0.75rem' }}> / {course.capacity}</span>
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={enrollPct}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: `${accent.side}18`,
                          '& .MuiLinearProgress-bar': {
                            background: accent.top,
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: '0.68rem', color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', mt: 0.5, textAlign: 'right' }}>
                        {enrollPct}% tỷ lệ lấp đầy
                      </Typography>
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {[
                        { label: 'Ngày bắt đầu', date: course.startDate },
                        { label: 'Ngày kết thúc', date: course.endDate },
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: brandColors.textSecondary, fontSize: '0.8rem', fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500 }}>
                            {item.label}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarDays size={13} color={brandColors.textTertiary} />
                            <Typography sx={{ color: brandColors.ink, fontSize: '0.82rem', fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 700 }}>
                              {formatDateFixed(item.date)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* CTA strip */}
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${brandColors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Typography sx={{
                        fontSize: '0.78rem', fontWeight: 700, fontFamily: '"Be Vietnam Pro", sans-serif',
                        color: accent.side,
                        opacity: 0.85,
                        letterSpacing: '0.02em',
                      }}>
                        Xem danh sách học viên →
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* ═══ PAGINATION ═══ */}
          {!isMobile && filteredCourses.length > rowsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 5, gap: 1 }}>
              <Button
                size="small" variant="outlined" onClick={goPrev} disabled={currentPage === 1}
                sx={{
                  borderRadius: '10px', minWidth: 40, height: 40,
                  color: brandColors.textSecondary, borderColor: brandColors.border,
                  fontFamily: '"Be Vietnam Pro", sans-serif',
                  '&:hover': { borderColor: brandColors.red, color: brandColors.red },
                }}
              >
                ‹
              </Button>
              {pagesArray.map((p) =>
                p === currentPage ? (
                  <Box key={p} sx={{
                    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #B90000 0%, #FF7875 100%)',
                    fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(185,0,0,0.3)',
                    fontFamily: '"Be Vietnam Pro", sans-serif',
                  }}>
                    {p}
                  </Box>
                ) : (
                  <Button key={p} size="small" variant="outlined" onClick={() => setPage(p)}
                    sx={{
                      borderRadius: '10px', minWidth: 40, height: 40,
                      color: brandColors.textSecondary, borderColor: brandColors.border,
                      fontFamily: '"Be Vietnam Pro", sans-serif',
                      '&:hover': { borderColor: brandColors.red, color: brandColors.red, bgcolor: brandColors.redSoft },
                    }}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                size="small" variant="outlined" onClick={goNext} disabled={currentPage === totalPages}
                sx={{
                  borderRadius: '10px', minWidth: 40, height: 40,
                  color: brandColors.textSecondary, borderColor: brandColors.border,
                  fontFamily: '"Be Vietnam Pro", sans-serif',
                  '&:hover': { borderColor: brandColors.red, color: brandColors.red },
                }}
              >
                ›
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TeacherCoursesPage;
