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
import { 
  adminLeaderboardService, 
  formatScore, 
  getRankIcon 
} from '../../services/admin-leaderboard.service';
import type { 
  GlobalLeaderboardData, 
  GlobalStudent 
} from '../../types/admin-leaderboard.types';

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
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="h5" fontWeight="bold" color="#ff6b35">
                  {getRankIcon(student.rank)}
                </Typography>
                
                <Avatar
                  src={student.student.avatar || undefined}
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #ff6b35, #ff8c42)',
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
                    <Typography variant="h6" fontWeight="bold" color="#ff6b35" mt={0.5}>
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
                          bgcolor: 'rgba(255,140,66,0.15)', 
                          color: '#ff6b35', 
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
                      sx={{ color: student.passRate >= 80 ? '#ff6b35' : '#B90000' }}
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
        <CircularProgress sx={{ color: '#ff6b35' }} size={45} />
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
      <Card sx={{ borderRadius: isMobile ? 2 : 3, mb: 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
                <Globe size={isMobile ? 20 : 24} color="#ff6b35" />
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#ff6b35">
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
      <Card sx={{ borderRadius: isMobile ? 2 : 3, boxShadow: '0 8px 28px rgba(255,107,53,0.1)', overflow: 'hidden' }}>
        <Box sx={{ 
          background: 'linear-gradient(90deg, #ff6b35, #ff8c42)', 
          p: isMobile ? 1.5 : 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.2 
        }}>
          <Star size={isMobile ? 18 : 22} color="#fff" />
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="#fff">
            Học viên xuất sắc toàn hệ thống
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
                  <TableCell sx={{ fontWeight: 700, color: '#ff6b35' }}>Thứ hạng</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#ff6b35' }}>Học viên</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#ff6b35' }}>Điểm trung bình</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#ff6b35' }}>Đã đạt</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#ff6b35' }}>Tỷ lệ đạt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboardData.topStudents.map((student: GlobalStudent) => (
                  <TableRow key={student.student.id} sx={{ '&:hover': { background: 'rgba(255,107,53,0.04)' } }}>
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
                            background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' 
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
                      <Typography variant={isTablet ? 'body1' : 'h6'} fontWeight="bold" sx={{ color: '#ff6b35' }}>
                        {formatScore(student.averageFinalScore)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={student.passedCourses} 
                        sx={{ bgcolor: 'rgba(255,140,66,0.15)', color: '#ff6b35', fontWeight: 600 }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold" sx={{ color: student.passRate >= 80 ? '#ff6b35' : '#B90000' }}>
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
