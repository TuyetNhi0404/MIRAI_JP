// src/pages/StudentDashboard.tsx
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Avatar 
} from '@mui/material';
import { 
  MenuBook, 
  EmojiEvents, 
  TrackChanges, 
  AutoAwesome,
  Headset
} from '@mui/icons-material';

const StudentDashboard = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 50%, #e3f2fd 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 }
      }}
    >
      <Container maxWidth="md">
        <Card
          elevation={8}
          sx={{
            borderRadius: { xs: 3, sm: 4 },
            position: 'relative',
            overflow: 'visible',
            background: '#ffffff',
            maxHeight: { xs: '90vh', sm: 'auto' },
            overflowY: { xs: 'auto', sm: 'visible' }
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              top: { xs: -15, sm: -30 },
              left: { xs: -15, sm: -30 },
              width: { xs: 60, sm: 120 },
              height: { xs: 60, sm: 120 },
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #B90000 0%, #B90000 100%)',
              opacity: 0.2,
              zIndex: 0,
              display: { xs: 'none', sm: 'block' }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: -20, sm: -40 },
              right: { xs: -20, sm: -40 },
              width: { xs: 75, sm: 150 },
              height: { xs: 75, sm: 150 },
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              opacity: 0.2,
              zIndex: 0,
              display: { xs: 'none', sm: 'block' }
            }}
          />

          <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
            {/* Icon Header */}
            <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 2 } }}>
              <Avatar
                sx={{
                  width: { xs: 55, sm: 65, md: 70 },
                  height: { xs: 55, sm: 65, md: 70 },
                  margin: '0 auto',
                  mb: { xs: 1.5, sm: 2 },
                  background: 'linear-gradient(135deg, #B90000 0%, #B90000 100%)',
                  boxShadow: 4
                }}
              >
                <AutoAwesome sx={{ fontSize: { xs: 28, sm: 32, md: 35 } }} />
              </Avatar>

              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  color: '#263238',
                  mb: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                }}
              >
                Chào mừng bạn đến với Trang Học Viên
              </Typography>

              <Typography 
                variant="subtitle1" 
                color="text.secondary"
                sx={{ 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  px: { xs: 1, sm: 0 }
                }}
              >
                MIRAI JAPANESE LMS - Hệ thống học tập thực tập sinh
              </Typography>
            </Box>

            {/* Feature Icons */}
            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: { xs: 45, sm: 50, md: 55 },
                      height: { xs: 45, sm: 50, md: 55 },
                      margin: '0 auto',
                      mb: { xs: 1, sm: 1.5 },
                      bgcolor: '#e3f2fd',
                      color: '#1976d2'
                    }}
                  >
                    <MenuBook sx={{ fontSize: { xs: 22, sm: 25, md: 28 } }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Học tập
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box 
                  onClick={() => navigate('/dashboard/student/listening')}
                  sx={{ 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover .MuiAvatar-root': {
                      transform: 'scale(1.1)',
                      boxShadow: '0 8px 20px rgba(156, 39, 176, 0.2)'
                    },
                    transition: 'all 0.3s'
                  }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 45, sm: 50, md: 55 },
                      height: { xs: 45, sm: 50, md: 55 },
                      margin: '0 auto',
                      mb: { xs: 1, sm: 1.5 },
                      bgcolor: '#f3e5f5',
                      color: '#9c27b0',
                      transition: 'all 0.3s'
                    }}
                  >
                    <Headset sx={{ fontSize: { xs: 22, sm: 25, md: 28 } }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Luyện nghe
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={3}>
                <Box 
                  onClick={() => navigate('/dashboard/student/kana-practice')}
                  sx={{ 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover .MuiAvatar-root': {
                      transform: 'scale(1.1) rotate(5deg)',
                      boxShadow: '0 8px 20px rgba(185, 0, 0, 0.2)'
                    },
                    transition: 'all 0.3s'
                  }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 45, sm: 50, md: 55 },
                      height: { xs: 45, sm: 50, md: 55 },
                      margin: '0 auto',
                      mb: { xs: 1, sm: 1.5 },
                      bgcolor: '#fff5f5',
                      color: '#B90000',
                      border: '1px solid #fecaca',
                      transition: 'all 0.3s'
                    }}
                  >
                    <AutoAwesome sx={{ fontSize: { xs: 22, sm: 25, md: 28 } }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Luyện chữ Kana
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: { xs: 45, sm: 50, md: 55 },
                      height: { xs: 45, sm: 50, md: 55 },
                      margin: '0 auto',
                      mb: { xs: 1, sm: 1.5 },
                      bgcolor: '#e8f5e9',
                      color: '#388e3c'
                    }}
                  >
                    <TrackChanges sx={{ fontSize: { xs: 22, sm: 25, md: 28 } }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Luyện tập
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: { xs: 45, sm: 50, md: 55 },
                      height: { xs: 45, sm: 50, md: 55 },
                      margin: '0 auto',
                      mb: { xs: 1, sm: 1.5 },
                      bgcolor: '#f3e5f5',
                      color: '#7b1fa2'
                    }}
                  >
                    <EmojiEvents sx={{ fontSize: { xs: 22, sm: 25, md: 28 } }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Thành tích
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Footer */}
            <Box 
              sx={{ 
                mt: { xs: 2, sm: 2.5, md: 3 }, 
                pt: { xs: 2, sm: 2.5 }, 
                borderTop: '1px solid #e0e0e0',
                textAlign: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                MIRAI JAPANESE LMS • Hệ thống đào tạo thực tập sinh
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default StudentDashboard;
