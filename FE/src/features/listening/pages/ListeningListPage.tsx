import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Button, Chip, Skeleton, Alert } from '@mui/material';
import { PlayArrow, Headset, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import listeningService from '../../../services/listeningService';
import type { ListeningContent } from '../types';
import ListeningFilter from '../components/ListeningFilter';

const ListeningListPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');
  const [contents, setContents] = useState<ListeningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listeningService.getAll({
          topic: topic !== 'all' ? topic : undefined,
          level: level !== 'all' ? level : undefined,
        });
        setContents(res.contents);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Không thể tải danh sách bài nghe. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    fetchContents();
  }, [topic, level]);

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={800} gutterBottom sx={{
          background: 'linear-gradient(45deg, #B90000, #ff4d4d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Luyện nghe
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Luyện nghe tiếng Nhật một cách dễ dàng và hiệu quả.
        </Typography>
      </Box>

      <ListeningFilter topic={topic} level={level} setTopic={setTopic} setLevel={setLevel} />

      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ height: '100%', borderRadius: '20px' }}>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} width="80%" />
                  <Skeleton variant="text" height={20} width="95%" />
                  <Skeleton variant="text" height={20} width="60%" />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="20%" />
                  </Box>
                  <Skeleton variant="rectangular" height={36} sx={{ mt: 2, borderRadius: '12px' }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          contents.map((content) => (
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
                    image={content.thumbnailUrl || "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800"}
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
                      <Typography variant="caption">{content.playCount || 0} lượt nghe</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 'medium', color: '#B90000' }}>
                      {Math.floor((content.duration || 0) / 60)}:{((content.duration || 0) % 60).toString().padStart(2, '0')}
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
                    Bắt đầu luyện tập
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      
      {!loading && contents.length === 0 && (
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
