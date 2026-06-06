// src/pages/TeacherCourseStudentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Users, Mail, Calendar, User } from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import axiosInstance from '../../api/axiosInstance';

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface CourseInfo {
  _id: string;
  name: string;
  homeroomTeacher: string;
}

interface CourseStudentsResponse {
  course: CourseInfo;
  students: Student[];
  total: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const TeacherCourseStudentsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [data, setData] = useState<CourseStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchCourseStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchCourseStudents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axiosInstance.get<{ data: CourseStudentsResponse }>(
        `/courses/teacher/courses/${courseId}/members`
      );

      setData(response.data.data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMsg = apiError.response?.data?.message || 'Không thể tải danh sách học viên';
      setError(errorMsg);
      console.error('Error fetching course students:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const filteredStudents = data?.students.filter(student => 
    searchQuery.trim() === '' ||
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: '#B90000' }} />
        <Typography color="text.secondary">Đang tải danh sách học viên...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: '12px', sm: '16px', md: '20px' } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            color: "#023665",
            fontWeight: "bold",
            fontSize: { xs: "1.3rem", sm: "1.6rem", md: "2rem" },
          }}
        >
          DANH SÁCH HỌC VIÊN
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Course Info Card */}
      {data && (
        <Paper
          elevation={3}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 3,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #B90000 0%, #d6690d 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 } }}>
              <Users size={24} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.2rem' }, mb: 0.25 }}>
                {data.course.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Giáo viên chủ nhiệm: {data.course.homeroomTeacher}
              </Typography>
            </Box>
            <Chip
              label={`${data.total} Học viên`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                height: { xs: 22, sm: 28 }
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Search Box */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '12px' }}>
        <TextField
          fullWidth
          placeholder="Tìm kiếm học viên theo tên hoặc email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#6b7280" />
              </InputAdornment>
            ),
          }}
          sx={{
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
        />
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {searchQuery ? (
              <>Tìm thấy <strong>{filteredStudents.length}</strong> trên tổng số <strong>{data.total}</strong> học viên</>
            ) : (
              <>Hiển thị <strong>{data.total}</strong> học viên</>
            )}
          </Typography>
        )}
      </Paper>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Paper
          elevation={3}
          sx={{
            textAlign: 'center',
            py: { xs: 5, sm: 8 },
            borderRadius: '12px'
          }}
        >
          <Avatar
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              bgcolor: '#e3f2fd',
              margin: '0 auto',
              mb: 3
            }}
          >
            <Users size={48} color="#1976d2" />
          </Avatar>
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.2rem' } }}>
            {searchQuery ? 'Không tìm thấy học viên nào phù hợp' : 'Chưa có học viên nào tham gia'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            {searchQuery
              ? 'Hãy thử thay đổi từ khóa tìm kiếm của bạn'
              : 'Khóa học này hiện chưa có học viên nào đăng ký'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Desktop View - Table */}
          {!isMobile && (
            <TableContainer 
              component={Paper} 
              elevation={3}
              sx={{ 
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#023665', fontSize: '0.95rem', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <User size={18} />
                        Họ và tên
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#023665', fontSize: '0.95rem', py: 2 }}>
                      Vai trò
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#023665', fontSize: '0.95rem', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Mail size={18} />
                        Email
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#023665', fontSize: '0.95rem', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Calendar size={18} />
                        Ngày tham gia
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <TableRow 
                      key={student._id}
                      sx={{
                        '&:hover': {
                          bgcolor: '#f8fafc',
                          transition: 'background-color 0.2s'
                        },
                        bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: '#B90000',
                              fontSize: '1rem',
                              fontWeight: 600
                            }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography
                            sx={{
                              color: '#111827',
                              fontWeight: 600,
                              fontSize: '0.95rem'
                            }}
                          >
                            {student.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={student.role === 'student' ? 'Học viên' : student.role}
                          size="small"
                          sx={{
                            bgcolor: '#e3f2fd',
                            color: '#1976d2',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          sx={{
                            color: '#6b7280',
                            fontSize: '0.9rem'
                          }}
                        >
                          {student.email}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          sx={{
                            color: '#6b7280',
                            fontSize: '0.9rem'
                          }}
                        >
                          {formatDate(student.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Mobile View - Cards */}
          {isMobile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredStudents.map((student) => (
                <Card
                  key={student._id}
                  variant="outlined"
                  sx={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #e8eaed',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(2,54,101,0.15)',
                      transform: 'translateY(-2px)',
                      borderColor: '#d0d7de'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Student Avatar & Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: '#B90000',
                          fontSize: '1rem',
                          fontWeight: 600
                        }}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: '#023665',
                            fontWeight: 700,
                            fontSize: '1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {student.name}
                        </Typography>
                        <Chip
                          label={student.role === 'student' ? 'Học viên' : student.role}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: '#e3f2fd',
                            color: '#1976d2'
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ height: '1px', backgroundColor: '#f0f0f0', mb: 1.5 }} />

                    {/* Student Details */}
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                      {/* Email */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Mail size={16} color="#6b7280" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                            Email
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: '#111827',
                              overflow: 'hidden',
                              fontSize: '0.8rem',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {student.email}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Enrolled Date */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Calendar size={16} color="#6b7280" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                            Ngày tham gia
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '0.8rem'
                            }}
                          >
                            {formatDate(student.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TeacherCourseStudentsPage;
