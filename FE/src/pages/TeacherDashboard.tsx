// src/pages/TeacherDashboard.tsx
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  School,
  Groups,
  ArrowForward
} from '@mui/icons-material';
import {
  CalendarClock,
  NotebookText,
  FileQuestion,
  Headphones,
  ClipboardCheck
} from 'lucide-react';
import type { RootState } from '../redux/store';
import { brandColors } from '../theme/theme';
import { courseService, type Course } from '../services/courseService';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const user = profile || authUser;

  const avatarUrl =
    user?.avatar && user.avatar.startsWith("http") ? user.avatar : undefined;

  // State variables
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Get current date string in Vietnamese format
  const getCurrentDateString = () => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `${day}, ngày ${date} tháng ${month} năm ${year}`;
  };

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const data = await courseService.getTeacherCourses();
        setCourses(data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách khóa học giáo viên:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Calculations for KPI Cards
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3, minHeight: '85vh' }} className="mira-fade-in-up">
      {/* 🌟 GREETING HERO CARD */}
      <Card
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: '16px',
          background: `linear-gradient(135deg, #FFFDFB 0%, ${brandColors.cream} 60%, #FFF1F0 100%)`,
          border: `1px solid ${brandColors.borderLight}`,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(185, 0, 0, 0.03)',
        }}
      >
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD6A5 0%, #FFADAD 100%)',
            opacity: 0.12,
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: '30%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #CAFFBF 0%, #98F5E1 100%)',
            opacity: 0.08,
            zIndex: 0
          }}
        />

        <Grid container spacing={3} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid item xs={12} sm="auto">
            <Avatar
              src={avatarUrl}
              alt={user?.name}
              sx={{
                width: 90,
                height: 90,
                boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.06)',
                border: '4px solid #ffffff',
                mx: { xs: 'auto', sm: 'left' },
                bgcolor: brandColors.red,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '2.25rem'
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </Avatar>
          </Grid>
          <Grid item xs={12} sm sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={800}
              sx={{ color: brandColors.ink, mb: 1, letterSpacing: '-0.5px', fontSize: { xs: '1.75rem', md: '2.25rem' } }}
            >
              {getGreeting()}, Thầy/Cô {user?.name || 'Giáo viên'}!
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: brandColors.textSecondary, mb: 0.5, fontWeight: 600 }}
            >
              Hôm nay là {getCurrentDateString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Chào mừng bạn đến với hệ thống <strong>MIRAI JAPANESE LMS</strong>. Chúc bạn có một ngày giảng dạy hiệu quả!
            </Typography>
          </Grid>
        </Grid>
      </Card>

      {/* 📊 KPI METRIC CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* KPI 1: Total Classes */}
        <Grid item xs={12} sm={6}>
          <Card
            className="mira-card-hover"
            sx={{
              borderRadius: '16px',
              border: `1px solid ${brandColors.border}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: '#FFF1F0', color: brandColors.red, width: 56, height: 56, mr: 2 }}>
                <School fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  Lớp giảng dạy
                </Typography>
                <Typography variant="h4" fontWeight={800} color={brandColors.ink}>
                  {loadingCourses ? <CircularProgress size={24} color="inherit" /> : totalCourses}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI 2: Total Students */}
        <Grid item xs={12} sm={6}>
          <Card
            className="mira-card-hover"
            sx={{
              borderRadius: '16px',
              border: `1px solid ${brandColors.border}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: '#FFF8F0', color: '#B90000', width: 56, height: 56, mr: 2 }}>
                <Groups fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  Tổng học viên
                </Typography>
                <Typography variant="h4" fontWeight={800} color={brandColors.ink}>
                  {loadingCourses ? <CircularProgress size={24} color="inherit" /> : totalStudents}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 💼 MAIN CONTENT GRID */}
      <Grid container spacing={3}>
        {/* LEFT COLUMN: ACTIVE CLASSES */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: '16px',
              border: `1px solid ${brandColors.border}`,
              height: '100%',
              minHeight: 480,
              boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={800} color={brandColors.ink} sx={{ fontSize: '1.15rem' }}>
                  Lớp học đang dạy ({courses.length})
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/dashboard/teacher/courses')}
                  sx={{ color: brandColors.red, fontWeight: 700, fontSize: '0.85rem', '&:hover': { bgcolor: 'transparent', color: brandColors.redDark } }}
                >
                  Xem tất cả
                </Button>
              </Box>

              {loadingCourses ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress color="error" />
                </Box>
              ) : courses.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300, color: 'text.secondary' }}>
                  <School sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
                  <Typography variant="body1">Bạn chưa được phân công lớp học nào.</Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }} className="mira-stagger">
                  {courses.slice(0, 4).map((course, index) => {
                    // Progress calculations
                    const totalSessions = course.totalScheduledSessions > 0 ? course.totalScheduledSessions : (course.session || 24);
                    const elapsedSessions = course.completedSessions || 0;
                    const progressPercent = totalSessions > 0 ? Math.round((elapsedSessions / totalSessions) * 100) : 0;

                    return (
                      <ListItem
                        key={course._id || course.id}
                        alignItems="flex-start"
                        sx={{
                          px: 2,
                          py: 2,
                          borderRadius: '12px',
                          border: `1px solid ${brandColors.borderLight}`,
                          mb: index === courses.slice(0, 4).length - 1 ? 0 : 2,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: '#fcfcfc',
                            borderColor: brandColors.redLight,
                            boxShadow: '0 4px 12px rgba(185, 0, 0, 0.02)'
                          }
                        }}
                      >
                        <ListItemAvatar sx={{ mt: 0.5 }}>
                          <Avatar sx={{ bgcolor: brandColors.redSoft, color: brandColors.red, fontWeight: 700 }}>
                            {course.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="subtitle1" component="div" fontWeight={700} color={brandColors.ink}>
                                {course.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Sĩ số: {course.enrolledCount}/{course.capacity} học viên
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  mb: 1.5,
                                  fontWeight: 500
                                }}
                              >
                                {course.description || 'Chưa có mô tả lớp học.'}
                              </Typography>

                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ width: '100%', mr: 1.5 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progressPercent}
                                    sx={{
                                      height: 6,
                                      borderRadius: 3,
                                      bgcolor: '#f5f5f5',
                                      '& .MuiLinearProgress-bar': { bgcolor: brandColors.red }
                                    }}
                                  />
                                </Box>
                                <Box sx={{ minWidth: 65, textAlign: 'right' }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    Bài {elapsedSessions}/{totalSessions} ({progressPercent}%)
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => navigate(`/dashboard/teacher/courses/${course._id || course.id}/members`)}
                                  sx={{
                                    borderColor: brandColors.border,
                                    color: brandColors.textPrimary,
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    '&:hover': { borderColor: brandColors.red, color: brandColors.red, bgcolor: brandColors.redSoft }
                                  }}
                                >
                                  Xem lớp học
                                </Button>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT COLUMN: QUICK NAV */}
        <Grid item xs={12} md={6}>
          {/* QUICK LINKS CARD */}
          <Card
            sx={{
              borderRadius: '16px',
              border: `1px solid ${brandColors.border}`,
              height: '100%',
              minHeight: 480,
              boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} color={brandColors.ink} sx={{ mb: 2.5, fontSize: '1.15rem' }}>
                Lối tắt tính năng
              </Typography>

              <Grid container spacing={2}>
                {/* Link 1: Schedule */}
                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/schedule')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#F5F8FF',
                      color: '#2A5C91',
                      border: '1px solid #EBF1FF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(42, 92, 145, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: '#2A5C91',
                        boxShadow: '0 4px 12px rgba(42, 92, 145, 0.08)'
                      }
                    }}
                  >
                    <CalendarClock size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Lịch dạy</Typography>
                  </Box>
                </Grid>

                {/* Link 2: Assignments */}
                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/assignments')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#F4FBF6',
                      color: '#2D7D46',
                      border: '1px solid #E8F7EC',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(45, 125, 70, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: '#2D7D46',
                        boxShadow: '0 4px 12px rgba(45, 125, 70, 0.08)'
                      }
                    }}
                  >
                    <NotebookText size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Bài tập</Typography>
                  </Box>
                </Grid>

                {/* Link 3: Question Bank */}
                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/questions')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#FFFBF5',
                      color: '#C66900',
                      border: '1px solid #FFF1DB',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(198, 105, 0, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: '#C66900',
                        boxShadow: '0 4px 12px rgba(198, 105, 0, 0.08)'
                      }
                    }}
                  >
                    <FileQuestion size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Ngân hàng câu hỏi</Typography>
                  </Box>
                </Grid>

                {/* Link 4: Attendance */}
                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/attendance')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#FFF1F0',
                      color: brandColors.red,
                      border: `1px solid ${brandColors.redSoft}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(185, 0, 0, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: brandColors.red,
                        boxShadow: '0 4px 12px rgba(185, 0, 0, 0.08)'
                      }
                    }}
                  >
                    <ClipboardCheck size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Điểm danh</Typography>
                  </Box>
                </Grid>


                {/* Link 6: Grammar Quiz Creator */}
                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/grammar')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#FFFDF0',
                      color: '#A17D00',
                      border: '1px solid #FFFAC2',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(161, 125, 0, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: '#A17D00',
                        boxShadow: '0 4px 12px rgba(161, 125, 0, 0.08)'
                      }
                    }}
                  >
                    <FileQuestion size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Tạo Quiz Ngữ pháp</Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/listening')}
                    className="mira-button-hover"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: '#F0FBFB',
                      color: '#007A7A',
                      border: '1px solid #DDF7F7',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(0, 122, 122, 0.02)',
                      height: 124,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        borderColor: '#007A7A',
                        boxShadow: '0 4px 12px rgba(0, 122, 122, 0.08)'
                      }
                    }}
                  >
                    <Headphones size={28} style={{ marginBottom: 8 }} />
                    <Typography variant="body2" fontWeight={700}>Luyện nghe</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TeacherDashboard;
