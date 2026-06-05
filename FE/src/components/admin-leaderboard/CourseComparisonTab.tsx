import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { School } from 'lucide-react';
import { 
  adminLeaderboardService, 
  formatScore, 
  getGradeColor 
} from '../../services/admin-leaderboard.service';
import type { 
  CourseComparisonData, 
  CourseComparison 
} from '../../types/admin-leaderboard.types';

const CourseComparisonTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [comparisonData, setComparisonData] = useState<CourseComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseComparison();
  }, []);

  const fetchCourseComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminLeaderboardService.getCourseComparison();
      setComparisonData(data);
    } catch (err) {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thể tải dữ liệu so sánh'
        : 'Không thể tải dữ liệu so sánh';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRankGradient = (index: number) => {
    if (index === 0) return 'linear-gradient(135deg, #FFD700, #FFA500)';
    if (index === 1) return 'linear-gradient(135deg, #C0C0C0, #A8A8A8)';
    if (index === 2) return 'linear-gradient(135deg, #CD7F32, #8B4513)';
    return 'linear-gradient(135deg, #ff6b35, #ff8c42)';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress sx={{ color: '#ff6b35' }} size={45} />
        <Typography variant="body1" color="text.secondary">Đang tải dữ liệu so sánh...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>{error}</Alert>;
  }

  if (!comparisonData) return null;

  return (
    <Box>
      {/* Header Card */}
      <Card sx={{ borderRadius: isMobile ? 2 : 3, mb: 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            alignItems={isMobile ? 'flex-start' : 'center'} 
            justifyContent="space-between" 
            spacing={2}
          >
            <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
              <School size={isMobile ? 24 : 28} color="#ff6b35" />
              <Box>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#ff6b35">
                  So sánh thủ khoa các lớp học
                </Typography>
                <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                  Tổng số lớp học: {comparisonData.totalCourses}
                </Typography>
              </Box>
            </Box>
            <Box textAlign={isMobile ? 'left' : 'right'}>
              <Typography variant="caption" color="text.secondary">Điểm cao nhất</Typography>
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#ff6b35">
                {formatScore(comparisonData.highestScoreOverall)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {comparisonData.courses.map((courseData: CourseComparison, index: number) => (
          <Grid item xs={12} md={6} key={courseData.course.id}>
            <Card sx={{ 
              borderRadius: isMobile ? 2 : 3, 
              boxShadow: index < 3 ? '0 8px 32px rgba(255,107,53,0.2)' : '0 6px 24px rgba(255,107,53,0.1)', 
              height: '100%',
              border: index < 3 ? '2px solid' : 'none',
              borderColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent'
            }}>
              <Box sx={{ 
                background: getRankGradient(index),
                p: isMobile ? 1.5 : 2,
                position: 'relative'
              }}>
                <Box position="absolute" top={8} right={8} fontSize={isMobile ? '1.5rem' : '2rem'}>
                  {getRankBadge(index)}
                </Box>
                <Stack 
                  direction={isMobile ? 'column' : 'row'} 
                  alignItems={isMobile ? 'flex-start' : 'center'} 
                  justifyContent="space-between" 
                  pr={isMobile ? 4 : 5}
                  spacing={isMobile ? 1 : 0}
                >
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#fff">
                    {courseData.course.name}
                  </Typography>
                  <Chip 
                    label={courseData.course.status} 
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.25)', 
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                    }} 
                  />
                </Stack>
              </Box>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>🏆 Thủ khoa lớp</Typography>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Avatar sx={{ 
                      width: isMobile ? 40 : 48, 
                      height: isMobile ? 40 : 48, 
                      background: getRankGradient(index) 
                    }}>
                      {courseData.topStudent.name.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography fontWeight={700} variant={isMobile ? 'body2' : 'h6'}>
                        {courseData.topStudent.name}
                      </Typography>
                      <Chip 
                        label={courseData.topStudent.grade} 
                        size="small"
                        sx={{ 
                          bgcolor: getGradeColor(courseData.topStudent.grade), 
                          color: '#fff', 
                          fontWeight: 600, 
                          mt: 0.5,
                          fontSize: isMobile ? '0.7rem' : '0.75rem',
                        }} 
                      />
                    </Box>
                  </Box>
                  <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color="#ff6b35">
                    {formatScore(courseData.topStudent.finalScore)}
                  </Typography>
                </Box>

                <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.1)', pt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Sĩ số lớp</Typography>
                      <Typography variant={isMobile ? 'body1' : 'h6'} fontWeight="bold">
                        {courseData.statistics.totalStudents}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Điểm trung bình</Typography>
                      <Typography variant={isMobile ? 'body1' : 'h6'} fontWeight="bold">
                        {formatScore(courseData.statistics.averageScore)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CourseComparisonTab;
