import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper, Skeleton, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import listeningService from '../../../services/listeningService';
import type { ListeningContent } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const ListeningDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ListeningContent | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listeningService.getById(id);
        setContent(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Không thể tải chi tiết bài nghe.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="20%" height={32} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="60%" height={56} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="90%" height={32} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 4, mb: 4 }} />
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 4, mb: 4 }} />
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 4 }} />
      </Container>
    );
  }

  if (error && !content) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/dashboard/student/listening')} sx={{ borderRadius: '12px' }}>
          Quay lại danh sách
        </Button>
      </Container>
    );
  }

  if (!content) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/dashboard/student/listening')}
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}
      >
        Back to List
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" gutterBottom>{content.title}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>{content.description}</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Typography variant="caption" sx={{ px: 2, py: 0.5, bgcolor: '#fecaca', color: '#B90000', borderRadius: 4, fontWeight: 'bold' }}>
            Level: {content.level}
          </Typography>
          <Typography variant="caption" sx={{ px: 2, py: 0.5, bgcolor: '#ffedd5', color: '#c2410c', borderRadius: 4, fontWeight: 'bold' }}>
            Topic: {content.topic}
          </Typography>
        </Box>
      </Box>

      {content.audioUrl && (
        <Box sx={{ position: 'sticky', top: 20, zIndex: 10, mb: 4 }}>
          <AudioPlayer src={content.audioUrl} />
        </Box>
      )}

      {content.transcript && (
        <>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => setShowTranscript(!showTranscript)}>
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </Button>
          </Box>

          {showTranscript && (
            <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'grey.50', borderRadius: 4, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" gutterBottom>Transcript</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {content.transcript}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
};

export default ListeningDetailPage;
