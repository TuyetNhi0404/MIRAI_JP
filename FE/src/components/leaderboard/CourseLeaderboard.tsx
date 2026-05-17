// components/CourseLeaderboard.tsx
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
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
} from '@mui/material';
import { Trophy, Award, TrendingUp, Users, Target, Crown, Star } from 'lucide-react';
import {
  getCourseLeaderboard,
  getStudentRank,
  getCurrentUser,
  getStudentCourse,
  getErrorMessage,
  formatScore,
  getGradeColor,
  getRankIcon,
} from '../../services/leaderboard.service';
import type { CourseLeaderboardData, StudentRankData, CurrentUser } from '../../types/leaderboard.types';

const CourseLeaderboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [leaderboardData, setLeaderboardData] = useState<CourseLeaderboardData | null>(null);
  const [studentRankData, setStudentRankData] = useState<StudentRankData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchLeaderboard();
    }

  }, [limit, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      console.log('✅ Current user:', user);
    } catch (err) {
      console.error('❌ Error fetching current user:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCourseLeaderboard(limit);
      setLeaderboardData(response.data.data);

      console.log('📊 Leaderboard data:', response.data.data);

      if (currentUser && currentUser.role === 'student') {
        try {
          const courseId = await getStudentCourse();
          console.log('📚 Course ID:', courseId);
          
          if (courseId) {
            const studentId: string | undefined = currentUser._id || currentUser.id;
            if (!studentId) {
              console.error('❌ No student ID found');
              return;
            }
            
            console.log('👤 Student ID:', studentId);
            
            const rankResponse = await getStudentRank(studentId, courseId);
            console.log('🎯 Rank data:', rankResponse.data.data);
            setStudentRankData(rankResponse.data.data);
          }
        } catch (err) {
          console.error('Could not fetch student rank:', err);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUser = (studentId: string): boolean => {
    if (!currentUser || currentUser.role !== 'student') return false;
    const currentUserId: string | undefined = currentUser._id || currentUser.id;
    if (!currentUserId) return false;
    return studentId === currentUserId;
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress sx={{ color: '#ff6b35' }} size={45} />
        <Typography variant="body1" color="text.secondary">
          Loading leaderboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, px: isMobile ? 2 : 3 }}>
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(255,107,53,0.1)',
          }}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!leaderboardData) return null;


  const renderMobileLeaderboard = () => (
    <Box>
      {leaderboardData.topStudents.map((student) => (
        <Card
          key={student.student.id}
          sx={{
            mb: 2,
            borderRadius: 3,
            border: isCurrentUser(student.student.id) ? '2px solid #ff6b35' : '1px solid',
            borderColor: isCurrentUser(student.student.id) ? '#ff6b35' : 'divider',
            background: isCurrentUser(student.student.id)
              ? 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,140,66,0.05))'
              : 'white',
            boxShadow: isCurrentUser(student.student.id) 
              ? '0 4px 20px rgba(255,107,53,0.15)'
              : '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Rank and Name */}
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography variant="h5" fontWeight="bold" color="#ff6b35">
                    {getRankIcon(student.rank)}
                  </Typography>
                  
                  <Avatar
                    src={student.student.avatar || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      background: isCurrentUser(student.student.id)
                        ? 'linear-gradient(135deg, #ff6b35, #ff8c42)'
                        : 'linear-gradient(135deg, #2196f3, #1976d2)',
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

                {isCurrentUser(student.student.id) && (
                  <Chip
                    label="YOU"
                    size="small"
                    sx={{
                      bgcolor: '#ff6b35',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                )}
              </Box>

              <Divider />

          
              <Box display="flex" justifyContent="space-around" alignItems="center">
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Final Score
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="#ff6b35" mt={0.5}>
                    {formatScore(student.finalScore)}
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Grade
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 50%, #fff8f3 100%)',
        py: isMobile ? 2 : 3,
        px: isMobile ? 2 : 0,
      }}
    >
      <Container maxWidth="lg">

        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b35 50%, #ff8c42 50%)',
            borderRadius: isMobile ? 2 : 3,
            p: isMobile ? 2 : 2.5,
            mb: 3,
            boxShadow: '0 6px 24px rgba(255,107,53,0.18)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: isMobile ? 100 : 120,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '50%',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 100,
              height: 100,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
            },
          }}
        >
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={2} 
            alignItems={isMobile ? 'flex-start' : 'center'} 
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2} sx={{ position: 'relative', zIndex: 1 }}>
              <Box
                sx={{
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: '50%',
                  p: isMobile ? 1 : 1.2,
                  display: 'flex',
                }}
              >
                <Trophy size={isMobile ? 24 : 32} color="#ffffff" />
              </Box>

              <Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color="white" sx={{ mb: 0.3 }}>
                  Course Leaderboard
                </Typography>
                <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ color: 'rgba(255,255,255,0.95)' }}>
                  {leaderboardData.courseName}
                </Typography>
              </Box>
            </Box>

            <FormControl
              size="small"
              fullWidth={isMobile}
              sx={{
                minWidth: isMobile ? '100%' : 140,
                maxWidth: isMobile ? '100%' : 200,
                zIndex: 1,
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.98)',
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2 },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.8)' },
                  '&.Mui-focused fieldset': { borderColor: '#ffffff', borderWidth: 2 },
                },
              }}
            >
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                sx={{ p: 1 }}
              >
                <MenuItem value={5}>Top 5</MenuItem>
                <MenuItem value={10}>Top 10</MenuItem>
                <MenuItem value={20}>Top 20</MenuItem>
                <MenuItem value={50}>Top 50</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {studentRankData && (
          <Card
            sx={{
              borderRadius: isMobile ? 2 : 3,
              mb: 3,
              background: 'linear-gradient(135deg, #fff 0%, #fff8f3 100%)',
              border: '2px solid #ff6b35',
              boxShadow: '0 8px 28px rgba(255,107,53,0.15)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(90deg, #ff6b35, #ff8c42)',
                p: isMobile ? 1.5 : 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
              }}
            >
              <Star size={isMobile ? 18 : 22} color="#fff" fill="#fff" />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#fff">
                Your Performance
              </Typography>
            </Box>

            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      background: 'rgba(255,107,53,0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1}>
                      Your Rank
                    </Typography>
                    <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold" color="#ff6b35">
                      {getRankIcon(studentRankData.rank)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" mt={1}>
                      out of {studentRankData.totalStudents} students
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      background: 'rgba(76,175,80,0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1}>
                      Final Score
                    </Typography>
                    <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold" color="#4caf50">
                      {formatScore(studentRankData.finalScore)}
                    </Typography>
                    <Chip
                      label={studentRankData.grade}
                      sx={{
                        mt: 1,
                        bgcolor: getGradeColor(studentRankData.grade),
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      background: 'rgba(33,150,243,0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1}>
                      Percentile
                    </Typography>
                    <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold" color="#2196f3">
                      {formatScore(studentRankData.percentile)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" mt={1}>
                      Top {(100 - studentRankData.percentile).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      mt: isMobile ? 1 : 2,
                      p: 2,
                      background: 'rgba(255,107,53,0.03)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} mb={2} color="text.secondary">
                      Score Breakdown
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Attendance
                        </Typography>
                        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#2196f3">
                          {formatScore(studentRankData.attendanceScore)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Assignment
                        </Typography>
                        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#4caf50">
                          {formatScore(studentRankData.assignmentScore)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Quiz
                        </Typography>
                        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#ff6b35">
                          {formatScore(studentRankData.quizScore)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {leaderboardData.statistics && (
          <Grid container spacing={isMobile ? 2 : 3} mb={3}>
            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: isMobile ? 2 : 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                        borderRadius: isMobile ? 1 : 2,
                        p: isMobile ? 0.7 : 1,
                        display: 'flex',
                      }}
                    >
                      <Users size={isMobile ? 16 : 18} color="#fff" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                      Total
                    </Typography>
                  </Box>
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#2196f3">
                    {leaderboardData.statistics.totalStudents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: isMobile ? 2 : 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #4caf50, #388e3c)',
                        borderRadius: isMobile ? 1 : 2,
                        p: isMobile ? 0.7 : 1,
                        display: 'flex',
                      }}
                    >
                      <TrendingUp size={isMobile ? 16 : 18} color="#fff" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                      Average
                    </Typography>
                  </Box>
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#4caf50">
                    {formatScore(leaderboardData.statistics.averageScore)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: isMobile ? 2 : 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #ff6b35, #ff8c42)',
                        borderRadius: isMobile ? 1 : 2,
                        p: isMobile ? 0.7 : 1,
                        display: 'flex',
                      }}
                    >
                      <Award size={isMobile ? 16 : 18} color="#fff" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                      Highest
                    </Typography>
                  </Box>
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#ff6b35">
                    {formatScore(leaderboardData.statistics.highestScore)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: isMobile ? 2 : 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #9c27b0, #7b1fa2)',
                        borderRadius: isMobile ? 1 : 2,
                        p: isMobile ? 0.7 : 1,
                        display: 'flex',
                      }}
                    >
                      <Target size={isMobile ? 16 : 18} color="#fff" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                      Pass Rate
                    </Typography>
                  </Box>
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="#9c27b0">
                    {leaderboardData.statistics.passRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Card
          sx={{
            borderRadius: isMobile ? 2 : 3,
            boxShadow: '0 8px 28px rgba(255,107,53,0.1)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(90deg, #ff6b35, #ff8c42)',
              p: isMobile ? 1.5 : 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
            }}
          >
            <Crown size={isMobile ? 18 : 22} color="#fff" />
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#fff">
              Top Performers
            </Typography>
          </Box>

          {isMobile ? (
            <Box sx={{ p: 2 }}>
              {renderMobileLeaderboard()}
            </Box>
          ) : (
            <TableContainer>
              <Table size={isTablet ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255,107,53,0.04)' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#ff6b35' }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#ff6b35' }}>Student</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#ff6b35' }}>
                      Final Score
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#ff6b35' }}>
                      Grade
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {leaderboardData.topStudents.map((student) => (
                    <TableRow
                      key={student.student.id}
                      sx={{
                        background: isCurrentUser(student.student.id)
                          ? 'linear-gradient(90deg, rgba(255,107,53,0.08), rgba(255,140,66,0.08))'
                          : 'transparent',
                        borderLeft: isCurrentUser(student.student.id) ? '4px solid #ff6b35' : 'none',
                        '&:hover': {
                          background: 'rgba(255,140,66,0.04)',
                        },
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight="bold">
                            {getRankIcon(student.rank)}
                          </Typography>
                          {isCurrentUser(student.student.id) && (
                            <Chip
                              label="YOU"
                              size="small"
                              sx={{
                                bgcolor: '#ff6b35',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar
                            src={student.student.avatar || undefined}
                            sx={{
                              width: isTablet ? 36 : 42,
                              height: isTablet ? 36 : 42,
                              background: isCurrentUser(student.student.id)
                                ? 'linear-gradient(135deg, #ff6b35, #ff8c42)'
                                : 'linear-gradient(135deg, #2196f3, #1976d2)',
                            }}
                          >
                            {student.student.name.charAt(0)}
                          </Avatar>

                          <Box>
                            <Typography
                              fontWeight={isCurrentUser(student.student.id) ? 700 : 600}
                              fontSize={isTablet ? '0.875rem' : '1rem'}
                            >
                              {student.student.name}
                              {isCurrentUser(student.student.id) && ' (You)'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.student.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant={isTablet ? 'body1' : 'h6'} fontWeight="bold" sx={{ color: '#ff6b35' }}>
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

        <Box
          mt={3}
          p={isMobile ? 1.5 : 2}
          textAlign="center"
          sx={{
            background: 'rgba(255,107,53,0.05)',
            borderRadius: 2,
            border: '1px solid rgba(255,107,53,0.1)',
          }}
        >
          <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary" fontWeight={500}>
            Last updated: {new Date(leaderboardData.lastUpdated).toLocaleString('en-US')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CourseLeaderboard;
