// src/pages/AssignmentsPage.tsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
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
  Tooltip
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
  Grade as GradeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';
import type { Assignment, Course, AssignmentQueryParams } from '../../types/assignment.types';
import AssignmentDialog from './AssignmentDialog';
import ConfirmDialog from '../../features/assignment-management/ConfirmDialog';

const ITEMS_PER_PAGE = 6;

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
      width: 72,
      height: 28,
      borderRadius: 14,
      backgroundColor: checked ? '#4caf50' : '#9e9e9e',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: checked ? 'flex-start' : 'flex-end',
      px: 1,
      '&:hover': { opacity: 0.9 },
    }}
  >
    <Typography
      sx={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#fff',
        textTransform: 'uppercase',
        userSelect: 'none',
      }}
    >
      {checked ? 'Active' : 'Draft'}
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}
    />
  </Box>
);

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

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchAssignments();
  }, [selectedCourse, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAssignments();
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    applyPagination();
  }, [allAssignments, currentPage]);

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
              assignmentService.update(
                assignment.courseId,
                assignmentId,
                { ...assignment, status: 'closed' },
                [],
                []
              ).then(() => {}).catch(err => console.error('Failed to auto-close:', err))
            );
          }
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        fetchAssignments();
      }
    };

    if (allAssignments.length > 0) {
      checkExpiredAssignments();
    }

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
      if (coursesArray.length === 0) {
        setError('No courses available. Please create a course first.');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load courses');
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
        const params: Partial<Omit<AssignmentQueryParams, 'courseId'>> = {
          page: 1,
          limit: 1000
        };
        
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        
        if (search.trim()) {
          params.search = search.trim();
        }

        const response = await assignmentService.getAllAssignments(params);
        data = response.assignments; // ✅ Extract assignments array from response
      } else {
        const params: AssignmentQueryParams = {
          courseId: selectedCourse
        };
        
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        
        if (search.trim()) {
          params.search = search.trim();
        }

        data = await assignmentService.getAll(params);
      }

      setAllAssignments(Array.isArray(data) ? data : []);
      setTotalItems(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load assignments');
      setAllAssignments([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const applyPagination = (): void => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = allAssignments.slice(startIndex, endIndex);
    setDisplayedAssignments(paginated);
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

  const handleSaveSuccess = (): void => {
    fetchAssignments();
  };

  const handleDeleteClick = (assignment: Assignment): void => {
    setTargetAssignment(assignment);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!targetAssignment) return;
    const assignmentId = targetAssignment._id || targetAssignment.id || '';
    const courseId = targetAssignment.courseId;

    if (!assignmentId || !courseId) {
      setConfirmOpen(false);
      setTargetAssignment(null);
      return;
    }

    try {
      await assignmentService.delete(courseId, assignmentId);
      fetchAssignments();
      const newTotal = allAssignments.length - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / ITEMS_PER_PAGE));
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
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

    setAllAssignments(prev => 
      prev.map(a => 
        (a._id || a.id) === assignmentId 
          ? { ...a, status: newStatus } 
          : a
      )
    );

    try {
      await assignmentService.update(
        assignment.courseId,
        assignmentId,
        { ...assignment, status: newStatus },
        [],
        []
      );
    } catch (error) {
      console.error('Failed to toggle status:', error);
      setAllAssignments(prev => 
        prev.map(a => 
          (a._id || a.id) === assignmentId 
            ? { ...a, status: assignment.status } 
            : a
        )
      );
    }
  };

  const handleCardClick = (assignment: Assignment): void => {
    if (assignment.status === 'active' || assignment.status === 'closed') {
      const assignmentId = assignment._id || assignment.id || '';
      navigate('/dashboard/teacher/submissions', {
        state: { 
          assignmentId, 
          assignmentTitle: assignment.title, 
          courseId: assignment.courseId 
        }
      });
    }
  };

  const formatDate = (date: string): string => {
    try {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Invalid date';
    }
  };

  const getCourseName = (assignment: Assignment): string => {
    const course = courses.find(c => c.id === assignment.courseId || c._id === assignment.courseId);
    if (course) return course.name;
    if (assignment.courseName) return assignment.courseName;
    return 'Unknown Course';
  };

  if (loadingCourses) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading courses...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#023665', fontWeight: 'bold' }}>
          Assignments Management
        </Typography>
        <IconButton
          onClick={() => {
            fetchCourses();
            fetchAssignments();
          }}
          color="primary"
          title="Refresh"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={selectedCourse}
                label="Course"
                onChange={(e: SelectChangeEvent) => setSelectedCourse(e.target.value)}
                disabled={courses.length === 0}
              >
                <MenuItem value="all"><strong>All Courses</strong></MenuItem>
                {courses.length === 0 ? (
                  <MenuItem value="" disabled><em>No courses available</em></MenuItem>
                ) : (
                  courses.map(course => (
                    <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search assignments by title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {totalItems > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} assignments
          </Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading assignments...</Typography>
        </Box>
      ) : (
        <>
          {courses.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No courses available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please create a course first before creating assignments
              </Typography>
            </Box>
          )}

          {courses.length > 0 && (
            <>
              {displayedAssignments.length > 0 ? (
                <Grid container spacing={3}>
                  {displayedAssignments.map((assignment) => (
                    <Grid item xs={12} sm={6} md={4} key={assignment._id || assignment.id}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          cursor: (assignment.status === 'active' || assignment.status === 'closed') ? 'pointer' : 'default',
                          '&:hover': {
                            transform: (assignment.status === 'active' || assignment.status === 'closed') ? 'translateY(-4px)' : 'none',
                            boxShadow: (assignment.status === 'active' || assignment.status === 'closed') ? 4 : 1
                          }
                        }}
                        onClick={() => handleCardClick(assignment)}
                      >
                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                          {/* Title & Status with Toggle Switch */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography
                              variant="h6"
                              component="div"
                              sx={{
                                fontWeight: 'bold',
                                flex: 1,
                                pr: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.3
                              }}
                            >
                              {assignment.title}
                            </Typography>
                            
                            {/* Toggle Switch with label inside */}
                            {assignment.status !== 'closed' && (
                              <Tooltip title={assignment.status === 'draft' ? 'Activate assignment' : 'Set as draft'}>
                                <Box sx={{ flexShrink: 0 }}>
                                  <LabeledSwitch
                                    checked={assignment.status === 'active'}
                                    onChange={() => handleToggleStatus(assignment)}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                            
                            {/* Show Closed chip if closed */}
                            {assignment.status === 'closed' && (
                              <Chip
                                label="CLOSED"
                                color="error"
                                size="small"
                                sx={{ flexShrink: 0 }}
                              />
                            )}
                          </Box>

                          {/* Course Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                            <SchoolIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {getCourseName(assignment)}
                            </Typography>
                          </Box>

                          {/* Description */}
                          {assignment.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}
                            >
                              {assignment.description}
                            </Typography>
                          )}

                          {/* Due Date */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                            <CalendarIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              Due: <strong style={{ color: '#000' }}>{formatDate(assignment.dueDate)}</strong>
                            </Typography>
                          </Box>

                          {/* Max Score */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                            <GradeIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              Max Score: <strong style={{ color: '#000' }}>{assignment.maxScore}</strong>
                            </Typography>
                          </Box>

                          {/* Teacher Name */}
                          {assignment.teacherName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                              <PersonIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {assignment.teacherName}
                              </Typography>
                            </Box>
                          )}

                          {/* File Attachments */}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AttachFileIcon sx={{ fontSize: 20, mr: 1.5, color: assignment.fileUrls?.length ? 'primary.main' : 'text.disabled' }} />
                            {assignment.fileUrls && assignment.fileUrls.length > 0 ? (
                              <Typography variant="body2" color="primary">
                                {assignment.fileUrls.length} file{assignment.fileUrls.length > 1 ? 's' : ''} attached
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                No attachments
                              </Typography>
                            )}
                          </Box>
                        </CardContent>

                        <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleOpenDialog(assignment);
                            }}
                            title="Edit assignment"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleDeleteClick(assignment);
                            }}
                            title="Delete assignment"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {search || statusFilter !== 'all'
                      ? 'No assignments match your filters'
                      : 'No assignments found'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {search || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Create your first assignment to get started'}
                  </Typography>
                </Box>
              )}

              {totalItems > 0 && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 4,
                  mb: 4,
                  pt: 3,
                  borderTop: '1px solid #e0e0e0'
                }}>
                  <Stack spacing={2} alignItems="center">
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                      siblingCount={1}
                      boundaryCount={1}
                      disabled={loading}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Page {currentPage} of {totalPages} • Total: {totalItems} assignment{totalItems !== 1 ? 's' : ''}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </>
      )}

      <Fab
        color="success"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 75, right: 32, zIndex: 1000 }}
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
        title="Confirm Delete"
        message={`Are you sure you want to delete "${targetAssignment?.title}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default AssignmentsPage;
