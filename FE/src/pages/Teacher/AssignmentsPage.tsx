// src/pages/Teacher/AssignmentsPage.tsx – Premium Redesign
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fab,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';
import { brandColors } from '../../theme/theme';
import type { Assignment, Course, AssignmentQueryParams } from '../../types/assignment.types';
import AssignmentDialog from './AssignmentDialog';
import ConfirmDialog from '../../features/assignment-management/ConfirmDialog';

const ITEMS_PER_PAGE = 6;

// ─── Labeled Toggle Switch ───────────────────────────────────────────────────
interface LabeledSwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LabeledSwitch: React.FC<LabeledSwitchProps> = ({ checked, onChange }) => (
  <Box
    onClick={(e) => {
      e.stopPropagation();
      onChange({ target: { checked: !checked } } as React.ChangeEvent<HTMLInputElement>);
    }}
    sx={{
      width: 76,
      height: 28,
      borderRadius: 14,
      background: checked
        ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
        : 'linear-gradient(135deg, #bfbfbf 0%, #8c8c8c 100%)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: checked ? 'flex-start' : 'flex-end',
      px: 1,
      flexShrink: 0,
      boxShadow: checked ? '0 2px 8px rgba(82,196,26,0.35)' : '0 2px 8px rgba(0,0,0,0.1)',
      '&:hover': { opacity: 0.88 },
    }}
  >
    <Typography
      sx={{
        fontSize: '0.6rem',
        fontWeight: 700,
        color: '#fff',
        textTransform: 'uppercase',
        userSelect: 'none',
        fontFamily: '"Be Vietnam Pro", sans-serif',
        letterSpacing: '0.03em',
      }}
    >
      {checked ? 'Hoạt động' : 'Nháp'}
    </Typography>
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: '#fff',
        position: 'absolute',
        top: 4,
        left: checked ? 'calc(100% - 24px)' : '4px',
        transition: 'left 0.3s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }}
    />
  </Box>
);

// ─── Status configuration ────────────────────────────────────────────────────
const statusMeta = {
  active: {
    label: 'Hoạt động',
    bg: '#ECFDF5',
    color: '#065F46',
    dot: '#10B981',
    border: '#10B98120',
  },
  draft: {
    label: 'Bản nháp',
    bg: '#F8FAFC',
    color: '#475569',
    dot: '#94A3B8',
    border: '#94A3B820',
  },
  closed: {
    label: 'Đã đóng',
    bg: '#FFF1F0',
    color: '#B90000',
    dot: '#B90000',
    border: '#B9000020',
  },
};

// ─── Card accent colors cycle ─────────────────────────────────────────────────
const cardAccents = [
  { gradient: 'linear-gradient(135deg, #B90000 0%, #FF7875 100%)', color: '#B90000' },
  { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#667eea' },
  { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#f5576c' },
  { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#4facfe' },
  { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#43e97b' },
  { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#fa709a' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [displayedAssignments, setDisplayedAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetAssignment, setTargetAssignment] = useState<Assignment | null>(null);

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => { setCurrentPage(1); fetchAssignments(); }, [selectedCourse, statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => { setCurrentPage(1); fetchAssignments(); }, 800);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { applyPagination(); }, [allAssignments, currentPage]);

  useEffect(() => {
    const checkExpiredAssignments = async () => {
      const now = new Date();
      const updates: Promise<void>[] = [];
      allAssignments.forEach((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        if (assignment.status === 'active' && dueDate < now) {
          const assignmentId = assignment._id || assignment.id || '';
          if (assignmentId && assignment.courseId) {
            updates.push(
              assignmentService.update(assignment.courseId, assignmentId, { ...assignment, status: 'closed' }, [], [])
                .then(() => {}).catch(err => console.error('Failed to auto-close:', err))
            );
          }
        }
      });
      if (updates.length > 0) { await Promise.all(updates); fetchAssignments(); }
    };
    if (allAssignments.length > 0) checkExpiredAssignments();
    const interval = setInterval(checkExpiredAssignments, 60000);
    return () => clearInterval(interval);
  }, [allAssignments]);

  const fetchCourses = async (): Promise<void> => {
    try {
      setLoadingCourses(true);
      setError('');
      const data = await assignmentService.getCourses();
      const coursesArray = Array.isArray(data) ? data : [];
      setCourses(coursesArray);
      if (coursesArray.length === 0) setError('Không có khóa học khả dụng. Vui lòng tạo khóa học trước.');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Tải danh sách khóa học thất bại');
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchAssignments = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      let data: Assignment[] = [];

      if (selectedCourse === 'all') {
        const params: Partial<Omit<AssignmentQueryParams, 'courseId'>> = { page: 1, limit: 1000 };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        const response = await assignmentService.getAllAssignments(params);
        data = response.assignments;
      } else {
        const params: AssignmentQueryParams = { courseId: selectedCourse };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        data = await assignmentService.getAll(params);
      }

      setAllAssignments(Array.isArray(data) ? data : []);
      setTotalItems(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Tải danh sách bài tập thất bại');
      setAllAssignments([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const applyPagination = (): void => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    setDisplayedAssignments(allAssignments.slice(startIndex, startIndex + ITEMS_PER_PAGE));
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDialog = (assignment: Assignment | null = null): void => {
    setEditingAssignment(assignment);
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
    setEditingAssignment(null);
  };

  const handleSaveSuccess = (): void => { fetchAssignments(); };

  const handleDeleteClick = (assignment: Assignment): void => {
    setTargetAssignment(assignment);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!targetAssignment) return;
    const assignmentId = targetAssignment._id || targetAssignment.id || '';
    const courseId = targetAssignment.courseId;
    if (!assignmentId || !courseId) { setConfirmOpen(false); setTargetAssignment(null); return; }
    try {
      await assignmentService.delete(courseId, assignmentId);
      fetchAssignments();
      const newTotal = allAssignments.length - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / ITEMS_PER_PAGE));
      if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setConfirmOpen(false);
      setTargetAssignment(null);
    }
  };

  const handleToggleStatus = async (assignment: Assignment): Promise<void> => {
    const assignmentId = assignment._id || assignment.id || '';
    if (!assignmentId || !assignment.courseId) return;
    if (assignment.status === 'closed') return;
    const newStatus: 'draft' | 'active' = assignment.status === 'draft' ? 'active' : 'draft';
    setAllAssignments(prev => prev.map(a => (a._id || a.id) === assignmentId ? { ...a, status: newStatus } : a));
    try {
      await assignmentService.update(assignment.courseId, assignmentId, { ...assignment, status: newStatus }, [], []);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      setAllAssignments(prev => prev.map(a => (a._id || a.id) === assignmentId ? { ...a, status: assignment.status } : a));
    }
  };

  const handleCardClick = (assignment: Assignment): void => {
    if (assignment.status === 'active' || assignment.status === 'closed') {
      const assignmentId = assignment._id || assignment.id || '';
      navigate('/dashboard/teacher/submissions', {
        state: { assignmentId, assignmentTitle: assignment.title, courseId: assignment.courseId }
      });
    }
  };

  const formatDate = (date: string): string => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Ngày không hợp lệ';
    }
  };

  const getCourseName = (assignment: Assignment): string => {
    const course = courses.find(c => c.id === assignment.courseId || c._id === assignment.courseId);
    if (course) return course.name;
    if (assignment.courseName) return assignment.courseName;
    return 'Khóa học không xác định';
  };

  if (loadingCourses) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: brandColors.red }} />
        <Typography sx={{ ml: 2, color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
          Đang tải khóa học...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        pb: 6,
        maxWidth: 1440,
        mx: 'auto',
        width: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        fontFamily: '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif',
        backgroundColor: "#ffffff"
      }}
    >
      <Box
        sx={{
          bgcolor: '#ffffff',
          p: { xs: 2, md: 2.5 },
          borderRadius: '18px',
          border: `1px solid ${brandColors.border}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          mb: 4,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.875rem' }}>Khóa học</InputLabel>
              <Select
                value={selectedCourse}
                label="Khóa học"
                onChange={(e: SelectChangeEvent) => setSelectedCourse(e.target.value)}
                disabled={courses.length === 0}
                sx={{
                  borderRadius: '10px',
                  fontFamily: '"Be Vietnam Pro", sans-serif',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.redLight },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.red },
                }}
              >
                <MenuItem value="all" sx={{ fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 600 }}>Tất cả khóa học</MenuItem>
                {courses.length === 0 ? (
                  <MenuItem value="" disabled><em>Không có khóa học nào</em></MenuItem>
                ) : (
                  courses.map(course => (
                    <MenuItem key={course.id} value={course.id} sx={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>{course.name}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Tìm kiếm"
              placeholder="Tìm kiếm bài tập theo tiêu đề..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: brandColors.textTertiary, fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '10px',
                  fontFamily: '"Be Vietnam Pro", sans-serif',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.redLight },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.red },
                }
              }}
              InputLabelProps={{ sx: { fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.875rem' } }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.875rem' }}>Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                label="Trạng thái"
                onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                sx={{
                  borderRadius: '10px',
                  fontFamily: '"Be Vietnam Pro", sans-serif',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.redLight },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brandColors.red },
                }}
              >
                <MenuItem value="all" sx={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>Tất cả trạng thái</MenuItem>
                <MenuItem value="active" sx={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>Hoạt động</MenuItem>
                <MenuItem value="draft" sx={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>Bản nháp</MenuItem>
                <MenuItem value="closed" sx={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>Đã đóng</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Result count */}
      {totalItems > 0 && (
        <Typography sx={{ mb: 3, color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.8rem', fontWeight: 500 }}>
          Hiển thị <strong style={{ color: brandColors.ink }}>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong>–<strong style={{ color: brandColors.ink }}>{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</strong> trong tổng số <strong style={{ color: brandColors.ink }}>{totalItems}</strong> bài tập
        </Typography>
      )}

      {/* ═══════════════════════ LOADING ═══════════════════════════════ */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <CircularProgress sx={{ color: brandColors.red, mb: 2 }} size={36} />
          <Typography sx={{ color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500 }}>
            Đang tải danh sách bài tập...
          </Typography>
        </Box>
      ) : (
        <>
          {/* No courses state */}
          {courses.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#fff', borderRadius: '20px', border: `2px dashed ${brandColors.border}`, p: 4 }}>
              <SchoolIcon sx={{ fontSize: 56, color: brandColors.textTertiary, mb: 2 }} />
              <Typography variant="h6" sx={{ color: brandColors.ink, fontWeight: 700, mb: 1, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                Không có khóa học khả dụng
              </Typography>
              <Typography variant="body2" sx={{ color: brandColors.textSecondary, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                Vui lòng tạo khóa học trước khi tạo bài tập
              </Typography>
            </Box>
          )}

          {/* ═══ ASSIGNMENT CARDS ═══ */}
          {courses.length > 0 && (
            <>
              {displayedAssignments.length > 0 ? (
                <Grid container spacing={3}>
                  {displayedAssignments.map((assignment, idx) => {
                    const st = statusMeta[assignment.status as keyof typeof statusMeta] || statusMeta.draft;
                    const accent = cardAccents[idx % cardAccents.length];
                    const isClickable = assignment.status === 'active' || assignment.status === 'closed';

                    return (
                      <Grid item xs={12} sm={6} lg={4} key={assignment._id || assignment.id}>
                        <Card
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                            cursor: isClickable ? 'pointer' : 'default',
                            borderRadius: '20px',
                            border: `1px solid ${brandColors.borderLight}`,
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            '&:hover': {
                              transform: isClickable ? 'translateY(-6px)' : 'none',
                              boxShadow: isClickable ? `0 20px 50px rgba(0,0,0,0.09), 0 0 0 2px ${accent.color}28` : '0 2px 12px rgba(0,0,0,0.04)',
                              borderColor: isClickable ? `${accent.color}35` : brandColors.borderLight,
                            },
                          }}
                          onClick={() => handleCardClick(assignment)}
                        >
                          {/* Colorful top accent */}
                          <Box sx={{ height: 5, background: accent.gradient, flexShrink: 0 }} />

                          <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            {/* Title + Status */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
                              <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                  fontWeight: 800,
                                  color: brandColors.ink,
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: 1.35,
                                  fontSize: '1rem',
                                  fontFamily: '"Be Vietnam Pro", sans-serif',
                                  transition: 'color 0.2s',
                                  '&:hover': { color: isClickable ? accent.color : brandColors.ink },
                                }}
                              >
                                {assignment.title}
                              </Typography>

                              {/* Toggle for draft/active */}
                              {assignment.status !== 'closed' && (
                                <Tooltip title={assignment.status === 'draft' ? 'Kích hoạt bài tập' : 'Chuyển thành bản nháp'}>
                                  <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                                    <LabeledSwitch
                                      checked={assignment.status === 'active'}
                                      onChange={() => handleToggleStatus(assignment)}
                                    />
                                  </Box>
                                </Tooltip>
                              )}

                              {/* Closed status badge */}
                              {assignment.status === 'closed' && (
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.5,
                                  px: 1.25, py: 0.4, borderRadius: '20px', flexShrink: 0,
                                  bgcolor: st.bg, border: `1px solid ${st.border}`,
                                }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: st.dot }} />
                                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: st.color, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                                    {st.label.toUpperCase()}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Divider with accent color */}
                            <Box sx={{ height: '1px', background: `linear-gradient(90deg, ${accent.color}40 0%, transparent 100%)`, mb: 2 }} />

                            {/* Course Reference */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 0.75, minWidth: 0 }}>
                              <Box sx={{
                                width: 26, height: 26, borderRadius: '8px',
                                background: `${accent.color}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <SchoolIcon sx={{ fontSize: 14, color: accent.color }} />
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: brandColors.textSecondary,
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontFamily: '"Be Vietnam Pro", sans-serif',
                                }}
                              >
                                {getCourseName(assignment)}
                              </Typography>
                            </Box>

                            {/* Description */}
                            {assignment.description && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mb: 2.5,
                                  color: brandColors.textSecondary,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  fontSize: '0.82rem',
                                  lineHeight: 1.55,
                                  fontFamily: '"Be Vietnam Pro", sans-serif',
                                  bgcolor: brandColors.bg,
                                  p: 1.5,
                                  borderRadius: '10px',
                                  border: `1px solid ${brandColors.borderLight}`,
                                  minHeight: '44px',
                                }}
                              >
                                {assignment.description}
                              </Typography>
                            )}

                            {/* Due date + Max score chips */}
                            <Grid container spacing={1.5} sx={{ mb: 2.5, mt: 'auto' }}>
                              <Grid item xs={6}>
                                <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: brandColors.bg, border: `1px solid ${brandColors.borderLight}` }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                    <CalendarIcon sx={{ fontSize: 13, color: brandColors.textTertiary }} />
                                    <Typography variant="caption" sx={{ color: brandColors.textTertiary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, fontFamily: '"Be Vietnam Pro", sans-serif', letterSpacing: '0.04em' }}>
                                      Hạn nộp
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: brandColors.ink, fontSize: '0.82rem', fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                                    {formatDate(assignment.dueDate)}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: brandColors.bg, border: `1px solid ${brandColors.borderLight}` }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                    <GradeIcon sx={{ fontSize: 13, color: '#E2B13C' }} />
                                    <Typography variant="caption" sx={{ color: brandColors.textTertiary, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, fontFamily: '"Be Vietnam Pro", sans-serif', letterSpacing: '0.04em' }}>
                                      Điểm tối đa
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: brandColors.ink, fontSize: '0.82rem', fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                                    {assignment.maxScore}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>

                            {/* Footer action strip */}
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 1,
                                pt: 2,
                                borderTop: `1px solid ${brandColors.borderLight}`,
                              }}
                            >
                              {/* Meta info */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                {assignment.teacherName && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                    <PersonIcon sx={{ fontSize: 14, color: brandColors.textTertiary }} />
                                    <Typography variant="caption" sx={{ color: brandColors.textSecondary, fontWeight: 500, fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '0.75rem' }}>
                                      {assignment.teacherName.split(' ').pop()}
                                    </Typography>
                                  </Box>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                  <AttachFileIcon sx={{ fontSize: 14, color: assignment.fileUrls?.length ? accent.color : brandColors.textTertiary }} />
                                  <Typography variant="caption" sx={{
                                    color: assignment.fileUrls?.length ? accent.color : brandColors.textSecondary,
                                    fontWeight: assignment.fileUrls?.length ? 700 : 500,
                                    fontFamily: '"Be Vietnam Pro", sans-serif',
                                    fontSize: '0.75rem',
                                  }}>
                                    {assignment.fileUrls && assignment.fileUrls.length > 0 ? `${assignment.fileUrls.length} tệp` : '0 tệp'}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Action buttons */}
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: accent.color,
                                    p: 0.75,
                                    borderRadius: '8px',
                                    '&:hover': { bgcolor: `${accent.color}14` },
                                    transition: 'all 0.2s',
                                  }}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleOpenDialog(assignment);
                                  }}
                                  title="Sửa bài tập"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: brandColors.error,
                                    p: 0.75,
                                    borderRadius: '8px',
                                    '&:hover': { bgcolor: '#FFF1F0' },
                                    transition: 'all 0.2s',
                                  }}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleDeleteClick(assignment);
                                  }}
                                  title="Xóa bài tập"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                /* Empty state */
                <Box sx={{ textAlign: 'center', py: 12, bgcolor: '#fff', borderRadius: '20px', border: `2px dashed ${brandColors.border}` }}>
                  <AssignmentIcon sx={{ fontSize: 56, color: brandColors.textTertiary, mb: 2 }} />
                  <Typography variant="h6" sx={{ color: brandColors.ink, fontWeight: 700, mb: 1, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                    {search || statusFilter !== 'all' || selectedCourse !== 'all' ? 'Không tìm thấy bài tập nào' : 'Chưa có bài tập nào'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: brandColors.textSecondary, maxWidth: 400, mx: 'auto', mb: 3, fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                    {search || statusFilter !== 'all' || selectedCourse !== 'all'
                      ? 'Hãy thử điều chỉnh ô tìm kiếm hoặc lựa chọn bộ lọc phù hợp.'
                      : 'Tạo bài tập đầu tiên bằng cách nhấn nút dấu cộng (+) màu đỏ ở góc dưới bên phải.'}
                  </Typography>
                </Box>
              )}

              {/* ═══ PAGINATION ═══ */}
              {totalItems > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5, mb: 2, pt: 3, borderTop: `1px solid ${brandColors.borderLight}` }}>
                  <Stack spacing={2} alignItems="center">
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      size="large"
                      showFirstButton
                      showLastButton
                      siblingCount={1}
                      boundaryCount={1}
                      disabled={loading}
                      sx={{
                        '& .MuiPaginationItem-root': {
                          color: brandColors.ink,
                          borderRadius: '10px',
                          border: `1px solid ${brandColors.border}`,
                          margin: '0 3px',
                          fontFamily: '"Be Vietnam Pro", sans-serif',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: brandColors.redSoft,
                            borderColor: brandColors.redLight,
                            color: brandColors.red,
                          },
                        },
                        '& .MuiPaginationItem-root.Mui-selected': {
                          background: 'linear-gradient(135deg, #B90000 0%, #FF7875 100%)',
                          borderColor: 'transparent',
                          color: '#ffffff',
                          fontWeight: 800,
                          boxShadow: '0 4px 12px rgba(185,0,0,0.3)',
                          '&:hover': { background: 'linear-gradient(135deg, #8A0000 0%, #B90000 100%)' },
                        },
                        '& .MuiPaginationItem-root.Mui-disabled': { opacity: 0.4 },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: brandColors.textTertiary, fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 500, fontSize: '0.78rem' }}>
                      Trang {currentPage} / {totalPages} &nbsp;·&nbsp; Tổng số: {totalItems} bài tập
                    </Typography>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ FAB ═══ */}
      <Fab
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: { xs: 88, md: 32 },
          right: { xs: 20, md: 32 },
          zIndex: 1000,
          background: 'linear-gradient(135deg, #B90000 0%, #FF7875 100%)',
          color: '#ffffff',
          boxShadow: '0 6px 24px rgba(185,0,0,0.4)',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8A0000 0%, #B90000 100%)',
            transform: 'scale(1.1) rotate(90deg)',
            boxShadow: '0 10px 30px rgba(185,0,0,0.5)',
          },
        }}
        onClick={() => handleOpenDialog()}
        disabled={courses.length === 0}
      >
        <AddIcon />
      </Fab>

      <AssignmentDialog
        open={openDialog}
        assignment={editingAssignment}
        onClose={handleCloseDialog}
        refreshList={handleSaveSuccess}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa bài tập "${targetAssignment?.title}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default AssignmentsPage;