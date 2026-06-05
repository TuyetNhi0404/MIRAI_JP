// TeacherSubmissionsPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  InputAdornment,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  ArrowBack,
  Search,
  FileDownload,
  Grade,
  CalendarToday,
  CheckCircle,
  Cancel,
  Schedule,
  Visibility,
  Email,
  Warning
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import type Submission from '../../types/Grade';
import submissionService from '../../services/GradeService';

interface LocationState {
  assignmentId?: string;
  assignmentTitle?: string;
  courseId?: string;
  maxScore?: number;
}

interface ExtendedSubmission extends Submission {
  canGrade?: boolean;
  assignment?: {
    maxScore?: number;
    createdBy?: string;
  };
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const TeacherSubmissionsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState | undefined;
  const { assignmentId, assignmentTitle, maxScore } = locationState || {};

  const [submissions, setSubmissions] = useState<ExtendedSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [canGrade, setCanGrade] = useState(true);
  const [assignmentMaxScore, setAssignmentMaxScore] = useState<number>(maxScore || 100);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ExtendedSubmission | null>(null);

  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: '' });
  const [grading, setGrading] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState<Record<string, boolean>>({});
  
  const [showNoSubmissionWarning, setShowNoSubmissionWarning] = useState(true);
  const [showNoPermissionWarning, setShowNoPermissionWarning] = useState(true);

  useEffect(() => {
    if (!assignmentId) {
      setError('No assignment selected');
      return;
    }
    
    void fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);
const fetchSubmissions = async () => {
    if (!assignmentId) return;

    try {
      setLoading(true);
      setError('');
      
      const data = await submissionService.getByAssignment(assignmentId) as ExtendedSubmission[];
      setSubmissions(data);

      if (data.length > 0 && data[0].assignment?.maxScore) {
        setAssignmentMaxScore(data[0].assignment.maxScore);
      }

      if (data.length > 0) {
        if (data[0].canGrade !== undefined) {
          setCanGrade(data[0].canGrade);
        } else if (data[0].assignment?.createdBy) {
          const currentUserId = localStorage.getItem('userId');
          setCanGrade(data[0].assignment.createdBy === currentUserId);
        } else {
          console.warn('Backend did not return canGrade info.');
          setCanGrade(true);
        }
      }

      if (data.length === 0) {
        setError('No submissions found for this assignment');
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      const apiError = err as ApiError;
      const errorMsg = apiError.response?.data?.message || apiError.message || 'Failed to load submissions';
      setError(errorMsg);
      setSubmissions([]);
      toast.error(errorMsg);
      
      if (apiError.response?.status === 403) {
        setCanGrade(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = (submission: ExtendedSubmission) => {
    setSelectedSubmission(submission);
    setDetailDialogOpen(true);
  };

  const handleGradeClick = (submission: ExtendedSubmission) => {
    if (!canGrade) {
      toast.error('You do not have permission to grade this assignment. Only the creator can grade.');
      return;
    }

    setSelectedSubmission(submission);
    setGradeForm({
      score: submission.score || 0,
      feedback: submission.feedback || ''
    });
    setDetailDialogOpen(false);
    setGradeDialogOpen(true);
  };

  const handleGradeSubmit = async () => {
    if (!selectedSubmission) return;

    // Validation
    if (gradeForm.score === null || gradeForm.score === undefined || gradeForm.score.toString().trim() === '') {
      toast.error('Please enter a score');
      return;
    }

    if (gradeForm.score < 0 || gradeForm.score > 100) {
      toast.error('Score must be between 0 and 100');
      return;
    }

    if (!gradeForm.feedback || gradeForm.feedback.trim() === '') {
      toast.error('Please enter feedback for the student');
      return;
    }

    try {
      setGrading(true);
      
      await submissionService.gradeSubmission(selectedSubmission._id, {
        score: gradeForm.score,
        feedback: gradeForm.feedback.trim()
      });

      toast.success('Grading successful!');
      setGradeDialogOpen(false);
      void fetchSubmissions();
    } catch (err) {
      console.error('Failed to grade submission:', err);
      const apiError = err as ApiError;
      
      // Handle 403 error
      if (apiError.response?.status === 403) {
const errorMsg = apiError.response?.data?.message || 
                        'You do not have permission to grade this. Only the creator can grade.';
        toast.error(errorMsg);
        setCanGrade(false);
        setGradeDialogOpen(false);
      } else {
        const errorMsg = apiError.response?.data?.message || 'Failed to submit grade';
        toast.error(errorMsg);
      }
    } finally {
      setGrading(false);
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      await submissionService.downloadFile(fileUrl);
      toast.success('Downloading file...');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download file');
    }
  };

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'submitted': return 'success';
      case 'graded': return 'info';
      case 'late': return 'warning';
      case 'not_submitted': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string): React.ReactElement | null => {
    switch (status) {
      case 'submitted': return <CheckCircle />;
      case 'graded': return <Grade />;
      case 'late': return <Schedule />;
      case 'not_submitted': return <Cancel />;
      default: return null;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', { // Changed to vi-VN for consistent Vietnamese formatting
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === 'graded') {
      matchesStatus = sub.score !== undefined && sub.score !== null;
    } else if (filterStatus === 'ungraded') {
      matchesStatus = sub.score === undefined || sub.score === null;
    }
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: submissions.length,
    ungraded: submissions.filter(s => s.score === undefined || s.score === null).length,
    graded: submissions.filter(s => s.score !== undefined && s.score !== null).length,
  };

  if (!assignmentId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          No assignment selected. Please go back and select an assignment.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  // --- Mobile Card Item Component ---
  const MobileSubmissionCard = ({ submission }: { submission: ExtendedSubmission }) => (
<Card sx={{ mb: 2, borderRadius: 2, boxShadow: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
              {submission.studentName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {submission.studentName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {submission.studentEmail}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={submission.status === 'submitted' ? 'Submitted' : 
                   submission.status === 'graded' ? 'Graded' :
                   submission.status === 'late' ? 'Late' : submission.status}
            color={getStatusColor(submission.status)}
            size="small"
            variant={isMobile ? "outlined" : "filled"}
          />
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Grid container spacing={1}>
          <Grid item xs={6}>
             <Typography variant="caption" color="text.secondary" display="block">Submitted At</Typography>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2">{formatDate(submission.submittedAt)}</Typography>
             </Box>
          </Grid>
          <Grid item xs={6}>
             <Typography variant="caption" color="text.secondary" display="block">Files</Typography>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FileDownload fontSize="small" color="action" />
                <Typography variant="body2">{submission.fileUrls?.length || 0} file(s)</Typography>
             </Box>
          </Grid>
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Score:</Typography>
                {submission.score !== undefined && submission.score !== null ? (
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    {submission.score}/{assignmentMaxScore}
                  </Typography>
                ) : (
                  <Typography variant="body2" fontStyle="italic" color="text.secondary">
                    Ungraded
                  </Typography>
                )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', borderTop: '1px solid #eee', px: 2, py: 1 }}>
         <Button
size="small" 
            startIcon={<Visibility />} 
            onClick={() => handleViewClick(submission)}
         >
           Details
         </Button>
         {canGrade ? (
            <Button 
              size="small" 
              variant="contained" 
              startIcon={<Grade />} 
              onClick={() => handleGradeClick(submission)}
            >
              Grade
            </Button>
         ) : (
             <Tooltip title="You do not have permission to grade">
                 <span>
                    <Button size="small" variant="outlined" disabled startIcon={<Grade />}>
                        Grade
                    </Button>
                 </span>
             </Tooltip>
         )}
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: isMobile ? 2 : 3, pb: 10 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', mb: 1, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
            {isMobile && (
                 <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 1, p:0, minWidth: 'auto' }}>
                    Back
                </Button>
            )}
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ color: '#023665', fontWeight: 'bold' }}>
            {assignmentTitle || 'Submissions List'}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total submissions: {submissions.length}
        </Typography>
      </Box>

      {/* Warning Alert - No Permission */}
      {showNoPermissionWarning && !canGrade && submissions.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<Warning />}
          sx={{ 
            mb: 3,
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeaa7',
            '& .MuiAlert-icon': {
              color: '#f39c12'
            }
          }}
          onClose={() => setShowNoPermissionWarning(false)}
        >
          You do not have permission to grade submissions for another teacher's assignment.
        </Alert>
      )}

      {/* Warning Alert - No Submissions */}
      {showNoSubmissionWarning && submissions.length === 0 && !loading && (
        <Alert 
          severity="warning" 
          icon={<Warning />}
          sx={{ 
            mb: 3,
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeaa7',
            '& .MuiAlert-icon': {
              color: '#f39c12'
            }
          }}
          onClose={() => setShowNoSubmissionWarning(false)}
        >
          No submissions yet for this assignment.
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
size={isMobile ? "small" : "medium"}
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: isMobile ? 1 : 0 }}>
              <Chip
                label={`All (${statusCounts.all})`}
                color={filterStatus === 'all' ? 'primary' : 'default'}
                onClick={() => setFilterStatus('all')}
                sx={{ flex: 1, minWidth: isMobile ? 'auto' : 100 }}
                size={isMobile ? "small" : "medium"}
              />
              <Chip
                label={`Ungraded (${statusCounts.ungraded})`}
                color={filterStatus === 'ungraded' ? 'warning' : 'default'}
                onClick={() => setFilterStatus('ungraded')}
                sx={{ flex: 1, minWidth: isMobile ? 'auto' : 100 }}
                size={isMobile ? "small" : "medium"}
              />
              <Chip
                label={`Graded (${statusCounts.graded})`}
                color={filterStatus === 'graded' ? 'success' : 'default'}
                onClick={() => setFilterStatus('graded')}
                sx={{ flex: 1, minWidth: isMobile ? 'auto' : 100 }}
                size={isMobile ? "small" : "medium"}
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading submissions...</Typography>
        </Box>
      ) : filteredSubmissions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm || filterStatus !== 'all' 
              ? 'No matching submissions found' 
              : 'No submissions yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Students have not submitted yet'}
          </Typography>
        </Box>
      ) : (
        <>
            {/* Desktop View: Table */}
            {!isMobile && (
                <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell><strong>Student</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Submitted At</strong></TableCell>
<TableCell><strong>Files</strong></TableCell>
                        <TableCell><strong>Score</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {filteredSubmissions.map((submission) => (
                        <TableRow key={submission._id} hover>
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: '#1976d2' }}>
                                {submission.studentName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {submission.studentName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                {submission.studentEmail}
                                </Typography>
                            </Box>
                            </Box>
                        </TableCell>
                        <TableCell>
                            <Chip
                            icon={getStatusIcon(submission.status) || undefined}
                            label={submission.status === 'submitted' ? 'Submitted' : 
                                    submission.status === 'graded' ? 'Graded' :
                                    submission.status === 'late' ? 'Late' : submission.status}
                            color={getStatusColor(submission.status)}
                            size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">
                            {formatDate(submission.submittedAt)}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Chip
                            icon={<FileDownload />}
                            label={`${submission.fileUrls?.length || 0} file(s)`}
                            size="small"
                            color={submission.fileUrls?.length ? 'primary' : 'default'}
                            variant="outlined"
                            />
                        </TableCell>
                        <TableCell>
                            {submission.score !== undefined && submission.score !== null ? (
                            <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                {submission.score}/{assignmentMaxScore}
                            </Typography>
                            ) : (
<Typography variant="body2" color="text.secondary" fontStyle="italic">
                                Ungraded
                            </Typography>
                            )}
                        </TableCell>
                        <TableCell align="right">
                            <Tooltip title="View Details">
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleViewClick(submission)}
                            >
                                <Visibility />
                            </IconButton>
                            </Tooltip>
                            <Tooltip 
                            title="You do not have permission to grade this assignment"
                            arrow
                            placement="top"
                            open={!canGrade && tooltipOpen[submission._id]}
                            onOpen={() => !canGrade && setTooltipOpen(prev => ({ ...prev, [submission._id]: true }))}
                            onClose={() => setTooltipOpen(prev => ({ ...prev, [submission._id]: false }))}
                            PopperProps={{
                                sx: {
                                '& .MuiTooltip-tooltip': {
                                    bgcolor: 'rgba(97, 97, 97, 0.95)',
                                    fontSize: '0.875rem',
                                    maxWidth: 280,
                                    padding: '8px 12px'
                                },
                                '& .MuiTooltip-arrow': {
                                    color: 'rgba(97, 97, 97, 0.95)'
                                }
                                }
                            }}
                            >
                            <span>
                                <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleGradeClick(submission)}
                                disabled={!canGrade}
                                onMouseEnter={() => !canGrade && setTooltipOpen(prev => ({ ...prev, [submission._id]: true }))}
                                onMouseLeave={() => setTooltipOpen(prev => ({ ...prev, [submission._id]: false }))}
                                >
                                <Grade />
                                </IconButton>
                            </span>
                            </Tooltip>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </TableContainer>
            )}

            {/* Mobile View: Card List */}
            {isMobile && (
                <Box>
                    {filteredSubmissions.map((submission) => (
<MobileSubmissionCard key={submission._id} submission={submission} />
                    ))}
                </Box>
            )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile} // Responsive Dialog
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Submission Details
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSubmission && (
            <Box>
              {/* Student Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Student Information
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
                    {selectedSubmission.studentName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedSubmission.studentName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {selectedSubmission.studentEmail}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Submission Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Submission Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Submitted At
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatDate(selectedSubmission.submittedAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Box>
<Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {selectedSubmission.status === 'submitted' ? 'Submitted' :
                           selectedSubmission.status === 'graded' ? 'Graded' :
                           selectedSubmission.status === 'late' ? 'Late' : selectedSubmission.status}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Note */}
              {selectedSubmission.note && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Student Note
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {selectedSubmission.note}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Submitted Files */}
              {selectedSubmission.fileUrls && selectedSubmission.fileUrls.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Submitted Files ({selectedSubmission.fileUrls.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedSubmission.fileUrls.map((fileUrl, idx) => {
                      const fileName = decodeURIComponent(fileUrl.split('/').pop() || `File ${idx + 1}`);
                      return (
                        <Button
                          key={idx}
                          fullWidth
                          variant="outlined"
                          startIcon={<FileDownload />}
                          onClick={() => handleDownloadFile(fileUrl)}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                        >
                          {fileName}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Grade Info */}
              {selectedSubmission.score !== undefined && selectedSubmission.score !== null && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Grading Information
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, mb: 2 }}>
                    <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                      {selectedSubmission.score}/{assignmentMaxScore}
</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Score
                    </Typography>
                  </Box>
                  {selectedSubmission.feedback && (
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Feedback:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {selectedSubmission.feedback}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
          {canGrade && (
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<Grade />}
              onClick={() => selectedSubmission && handleGradeClick(selectedSubmission)}
            >
              {selectedSubmission?.score !== undefined && selectedSubmission?.score !== null ? 'Update Grade' : 'Grade'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog 
        open={gradeDialogOpen} 
        onClose={() => setGradeDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile} // Responsive Dialog
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Grade Submission
          </Typography>
          {selectedSubmission && (
            <Typography variant="body2" color="text.secondary">
              Student: {selectedSubmission.studentName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Score (0-100)"
              value={gradeForm.score}
              onChange={(e) => setGradeForm({ ...gradeForm, score: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              sx={{ mb: 2 }}
              required
              error={gradeForm.score < 0 || gradeForm.score > 100}
              helperText={
                gradeForm.score < 0 || gradeForm.score > 100 
                  ? 'Score must be between 0 and 100' 
                  : 'Enter score from 0 to 100 (required)'
              }
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Feedback"
              value={gradeForm.feedback}
              onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
              placeholder="Write feedback for student..."
              required
error={!gradeForm.feedback || gradeForm.feedback.trim() === ''}
              helperText="Please enter feedback (required)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setGradeDialogOpen(false)} disabled={grading}>
            Cancel
          </Button>
          <Button 
            onClick={handleGradeSubmit} 
            variant="contained" 
            color="primary"
            disabled={grading}
            startIcon={grading ? <CircularProgress size={20} /> : <Grade />}
          >
            {grading ? 'Saving...' : 'Save Grade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherSubmissionsPage;
