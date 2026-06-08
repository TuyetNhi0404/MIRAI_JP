import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Grid,
  InputLabel,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
} from '@mui/material';
import { Users, TrendingUp, Award, Target, Crown } from 'lucide-react';
import { CountUp } from '../ui';
import {
  adminLeaderboardService,
  formatScore,
  getGradeColor,
  getRankIcon,
} from '../../services/admin-leaderboard.service';
import type {
  Course,
  CourseLeaderboardData,
  LeaderboardStudent,
} from '../../types/admin-leaderboard.types';

const BRAND_RED = '#B90000';
const BRAND_RED_SOFT = 'rgba(185, 0, 0, 0.08)';
const BRAND_RED_TINT = 'rgba(185, 0, 0, 0.04)';

const CourseLeaderboardTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [leaderboardData, setLeaderboardData] = useState<CourseLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseLeaderboard();
    }
  }, [selectedCourse, limit]);

  const fetchCourses = async () => {
    try {
      const data = await adminLeaderboardService.getCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Không thể tải danh sách khóa học');
    }
  };

  const fetchCourseLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminLeaderboardService.getCourseLeaderboard(selectedCourse, limit);
      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching course leaderboard:', err);
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thể tải bảng xếp hạng'
        : 'Không thể tải bảng xếp hạng';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderMobileLeaderboard = () => (
    <Box>
      {leaderboardData?.topStudents.map((student: LeaderboardStudent) => (
        <Card
          key={student.student.id}
          className="mira-card-hover"
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid rgba(185,0,0,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: BRAND_RED }}>
                    {getRankIcon(student.rank)}
                  </Typography>

                  <Avatar
                    src={student.student.avatar || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      background: `linear-gradient(135deg, ${BRAND_RED}, #E53935)`,
                      transition: 'transform 200ms ease',
                      '&:hover': { transform: 'scale(1.08)' },
                    }}
                  >
                    {student.student.name.charAt(0)}
                  </Avatar>

                  <Box>
                    <Typography fontWeight={700} fontSize="1rem">
                      {student.student.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {student.student.email}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              <Box display="flex" justifyContent="space-around" alignItems="center">
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Điểm tổng kết
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: BRAND_RED }} mt={0.5}>
                    {formatScore(student.finalScore)}
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Xếp loại
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={student.grade}
                      sx={{
                        bgcolor: getGradeColor(student.grade),
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        height: 32,
                        px: 1,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress sx={{ color: BRAND_RED }} size={45} />
        <Typography variant="body1" color="text.secondary">Đang tải bảng xếp hạng...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>{error}</Alert>;
  }

  if (!leaderboardData) return null;

  return (
    <Box>
      {/* Controls */}
      <Card
        className="mira-fade-in-up"
        sx={{
          borderRadius: isMobile ? 2 : 3,
          mb: 3,
          boxShadow: '0 4px 20px rgba(185,0,0,0.06)',
          border: '1px solid rgba(185,0,0,0.06)',
        }}
      >
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                <InputLabel>Chọn khóa học</InputLabel>
                <Select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  label="Chọn khóa học"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                <InputLabel>Giới hạn</InputLabel>
                <Select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  label="Giới hạn"
                >
                  <MenuItem value={5}>Top 5</MenuItem>
                  <MenuItem value={10}>Top 10</MenuItem>
                  <MenuItem value={20}>Top 20</MenuItem>
                  <MenuItem value={50}>Top 50</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics */}
      {leaderboardData.statistics && (
        <Grid container spacing={isMobile ? 2 : 3} mb={3} className="mira-stagger">
          <Grid item xs={6} sm={6} md={3}>
            <Card
              className="mira-card-hover"
              sx={{
                borderRadius: isMobile ? 2 : 3,
                boxShadow: '0 4px 20px rgba(185,0,0,0.06)',
                border: '1px solid rgba(185,0,0,0.08)',
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{
                    background: `linear-gradient(135deg, ${BRAND_RED}, #E53935)`,
                    borderRadius: isMobile ? 1 : 2,
                    p: isMobile ? 0.7 : 1,
                    display: 'flex',
                    transition: 'transform 200ms ease',
                    '&:hover': { transform: 'rotate(-8deg) scale(1.08)' },
                  }}>
                    <Users size={isMobile ? 16 : 18} color="#fff" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                    Tổng số học viên
                  </Typography>
                </Box>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ color: BRAND_RED }}>
                  <CountUp end={leaderboardData.statistics.totalStudents} />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card
              className="mira-card-hover"
              sx={{
                borderRadius: isMobile ? 2 : 3,
                boxShadow: '0 4px 20px rgba(185,0,0,0.06)',
                border: '1px solid rgba(185,0,0,0.08)',
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{
                    background: 'linear-gradient(135deg, #E53935, #FF5252)',
                    borderRadius: isMobile ? 1 : 2,
                    p: isMobile ? 0.7 : 1,
                    display: 'flex',
                    transition: 'transform 200ms ease',
                    '&:hover': { transform: 'rotate(-8deg) scale(1.08)' },
                  }}>
                    <TrendingUp size={isMobile ? 16 : 18} color="#fff" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                    Điểm trung bình
                  </Typography>
                </Box>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ color: BRAND_RED }}>
                  <CountUp end={leaderboardData.statistics.averageScore} decimals={1} />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card
              className="mira-card-hover"
              sx={{
                borderRadius: isMobile ? 2 : 3,
                boxShadow: '0 4px 20px rgba(185,0,0,0.06)',
                border: '1px solid rgba(185,0,0,0.08)',
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{
                    background: `linear-gradient(135deg, ${BRAND_RED}, #E53935)`,
                    borderRadius: isMobile ? 1 : 2,
                    p: isMobile ? 0.7 : 1,
                    display: 'flex',
                    transition: 'transform 200ms ease',
                    '&:hover': { transform: 'rotate(-8deg) scale(1.08)' },
                  }}>
                    <Award size={isMobile ? 16 : 18} color="#fff" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                    Điểm cao nhất
                  </Typography>
                </Box>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ color: BRAND_RED }}>
                  <CountUp end={leaderboardData.statistics.highestScore} decimals={1} />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card
              className="mira-card-hover"
              sx={{
                borderRadius: isMobile ? 2 : 3,
                boxShadow: '0 4px 20px rgba(185,0,0,0.06)',
                border: '1px solid rgba(185,0,0,0.08)',
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{
                    background: 'linear-gradient(135deg, #FF5252, #FF8A80)',
                    borderRadius: isMobile ? 1 : 2,
                    p: isMobile ? 0.7 : 1,
                    display: 'flex',
                    transition: 'transform 200ms ease',
                    '&:hover': { transform: 'rotate(-8deg) scale(1.08)' },
                  }}>
                    <Target size={isMobile ? 16 : 18} color="#fff" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                    Tỷ lệ đạt
                  </Typography>
                </Box>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ color: BRAND_RED }}>
                  <CountUp end={leaderboardData.statistics.passRate} decimals={1} suffix="%" />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Leaderboard Table/List */}
      <Card
        className="mira-fade-in-up"
        sx={{
          borderRadius: isMobile ? 2 : 3,
          boxShadow: '0 8px 28px rgba(185,0,0,0.08)',
          overflow: 'hidden',
          border: '1px solid rgba(185,0,0,0.06)',
        }}
      >
        <Box sx={{
          background: `linear-gradient(135deg, ${BRAND_RED}, #E53935)`,
          p: isMobile ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.12), transparent 50%)',
              pointerEvents: 'none',
            }}
          />
          <Crown size={isMobile ? 18 : 22} color="#fff" style={{ position: 'relative' }} />
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            fontWeight="bold"
            color="#fff"
            sx={{ position: 'relative' }}
          >
            {isMobile ? 'Học viên xuất sắc' : `Học viên xuất sắc - ${leaderboardData.courseName || 'Khóa học'}`}
          </Typography>
        </Box>

        {isMobile ? (
          <Box sx={{ p: 2 }} className="mira-stagger">
            {renderMobileLeaderboard()}
          </Box>
        ) : (
          <TableContainer>
            <Table size={isTablet ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={{ background: BRAND_RED_TINT }}>
                  <TableCell sx={{ fontWeight: 700, color: BRAND_RED }}>Thứ hạng</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: BRAND_RED }}>Học viên</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: BRAND_RED }}>Điểm tổng kết</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: BRAND_RED }}>Xếp loại</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="mira-stagger">
                {leaderboardData.topStudents.map((student: LeaderboardStudent) => (
                  <TableRow
                    key={student.student.id}
                    className="mira-row-hover"
                    sx={{
                      transition: 'background-color 200ms ease, transform 200ms ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="h6" fontWeight="bold">{getRankIcon(student.rank)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          src={student.student.avatar || undefined}
                          sx={{
                            width: isTablet ? 36 : 42,
                            height: isTablet ? 36 : 42,
                            background: `linear-gradient(135deg, ${BRAND_RED}, #E53935)`,
                            transition: 'transform 200ms ease, box-shadow 200ms ease',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              boxShadow: '0 4px 12px rgba(185,0,0,0.25)',
                            },
                          }}
                        >
                          {student.student.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600} fontSize={isTablet ? '0.875rem' : '1rem'}>
                            {student.student.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.student.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant={isTablet ? 'body1' : 'h6'} fontWeight="bold" sx={{ color: BRAND_RED }}>
                        {formatScore(student.finalScore)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={student.grade}
                        sx={{
                          bgcolor: getGradeColor(student.grade),
                          color: '#fff',
                          fontWeight: 700,
                          transition: 'transform 200ms ease',
                          '&:hover': { transform: 'scale(1.06)' },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
};

export default CourseLeaderboardTab;
