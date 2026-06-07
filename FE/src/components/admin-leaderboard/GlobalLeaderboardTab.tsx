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
import { Globe, Star } from 'lucide-react';
import { CountUp } from '../ui';
import {
  adminLeaderboardService,
  formatScore,
  getRankIcon,
} from '../../services/admin-leaderboard.service';
import type {
  GlobalLeaderboardData,
  GlobalStudent,
} from '../../types/admin-leaderboard.types';

const BRAND_RED = '#B90000';
const BRAND_RED_SOFT = 'rgba(185, 0, 0, 0.08)';
const BRAND_RED_TINT = 'rgba(185, 0, 0, 0.04)';

const GlobalLeaderboardTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [leaderboardData, setLeaderboardData] = useState<GlobalLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [limit]);

  const fetchGlobalLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminLeaderboardService.getGlobalLeaderboard(limit);
      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching global leaderboard:', err);
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thể tải bảng xếp hạng toàn hệ thống'
        : 'Không thể tải bảng xếp hạng toàn hệ thống';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderMobileLeaderboard = () => (
    <Box>
      {leaderboardData?.topStudents.map((student: GlobalStudent) => (
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
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="h5" fontWeight="bold" color="#B90000">
                  {getRankIcon(student.rank)}
                </Typography>
                
                <Avatar
                  src={student.student.avatar || undefined}
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #B90000, #E53935)',
                  }}
                >
                  {student.student.name.charAt(0)}
                </Avatar>

                <Box flex={1}>
                  <Typography fontWeight={700} fontSize="1rem">
                    {student.student.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {student.student.email}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Điểm trung bình
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="#B90000" mt={0.5}>
                      {formatScore(student.averageFinalScore)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Đã đạt
                    </Typography>
                    <Box mt={0.5}>
                      <Chip 
                        label={student.passedCourses} 
                        sx={{ 
                          bgcolor: 'rgba(185,0,0,0.15)', 
                          color: '#B90000', 
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }} 
                      />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Tỷ lệ đạt
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold" 
                      mt={0.5}
                      sx={{ color: student.passRate >= 80 ? '#B90000' : '#B90000' }}
                    >
                      {student.passRate.toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress sx={{ color: '#B90000' }} size={45} />
        <Typography variant="body1" color="text.secondary">Đang tải bảng xếp hạng hệ thống...</Typography>
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
      <Card sx={{ borderRadius: isMobile ? 2 : 3, mb: 3, boxShadow: '0 4px 20px rgba(185,0,0,0.08)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
                <Globe size={isMobile ? 20 : 24} color="#B90000" />
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#B90000">
                  Bảng xếp hạng hệ thống
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                <InputLabel>Giới hạn</InputLabel>
                <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))} label="Giới hạn">
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
          background: 'linear-gradient(135deg, #B90000, #E53935)',
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
          <Star size={isMobile ? 18 : 22} color="#fff" style={{ position: 'relative' }} />
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            fontWeight="bold"
            color="#fff"
            sx={{ position: 'relative' }}
          >
            Học viên xuất sắc toàn hệ thống
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
                <TableRow sx={{ background: 'rgba(185,0,0,0.04)' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#B90000' }}>Thứ hạng</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#B90000' }}>Học viên</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#B90000' }}>Điểm trung bình</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#B90000' }}>Đã đạt</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#B90000' }}>Tỷ lệ đạt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="mira-stagger">
                {leaderboardData.topStudents.map((student: GlobalStudent) => (
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
                            background: 'linear-gradient(135deg, #B90000, #E53935)',
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
                      <Typography variant={isTablet ? 'body1' : 'h6'} fontWeight="bold" sx={{ color: '#B90000' }}>
                        {formatScore(student.averageFinalScore)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={student.passedCourses} 
                        sx={{ bgcolor: 'rgba(185,0,0,0.15)', color: '#B90000', fontWeight: 600 }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold" sx={{ color: student.passRate >= 80 ? '#B90000' : '#B90000' }}>
                        {student.passRate.toFixed(1)}%
                      </Typography>
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

export default GlobalLeaderboardTab;
