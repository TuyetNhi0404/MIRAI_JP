import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Button, Chip } from '@mui/material';
import { PlayArrow, Headset, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { mockListeningContents } from '../mockData';
import ListeningFilter from '../components/ListeningFilter';

const ListeningListPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');

  const filteredContents = mockListeningContents.filter(content => {
    if (topic !== 'all' && content.topic !== topic) return false;
    if (level !== 'all' && content.level !== level) return false;
    return true;
  });

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={800} gutterBottom sx={{
          background: 'linear-gradient(45deg, #B90000, #ff4d4d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Listening Practice
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Luyện nghe tiếng Nhật một cách dễ dàng và hiệu quả.
        </Typography>
      </Box>

      <ListeningFilter topic={topic} level={level} setTopic={setTopic} setLevel={setLevel} />

      <Grid container spacing={4}>
        {filteredContents.map((content) => (
          <Grid item xs={12} sm={6} md={4} key={content._id}>
            <Card sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              boxShadow: '10px 10px 30px #e0e0e0, -10px -10px 30px #ffffff',
              '&:hover': {
                transform: 'translateY(-10px)',
                boxShadow: '15px 15px 40px #d1d1d1, -15px -15px 40px #ffffff',
              }
            }}>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={content.thumbnailUrl}
                  alt={content.title}
                  sx={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
                />
                <Chip 
                   label={content.level} 
                   color="secondary"
                   sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 'bold' }} 
                />
              </Box>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography gutterBottom variant="h6" fontWeight="bold">
                  {content.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {content.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                    <Headset fontSize="small" />
                    <Typography variant="caption">{content.playCount} plays</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 'medium', color: '#B90000' }}>
                    {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlayArrow />}
                  onClick={() => navigate(`/dashboard/student/listening/${content._id}`)}
                  sx={{
                    bgcolor: '#B90000',
                    color: 'white',
                    '&:hover': { bgcolor: '#990000' },
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px 0 rgba(185, 0, 0, 0.39)',
                  }}
                >
                  Start Practice
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {filteredContents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Search sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary">
            Không tìm thấy tài liệu phù hợp với bộ lọc của bạn.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ListeningListPage;
