import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Divider, Paper, Radio, RadioGroup, FormControlLabel, FormControl, TextField, Skeleton, Alert, CircularProgress } from '@mui/material';
import { ArrowBack, CheckCircleOutline, CancelOutlined, CheckCircle } from '@mui/icons-material';
import listeningService, { type SubmitResult } from '../../../services/listeningService';
import type { ListeningContent, ListeningExercise } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const ListeningDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ListeningContent | null>(null);
  const [exercises, setExercises] = useState<ListeningExercise[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listeningService.getById(id);
        setContent(data);
        setExercises(data.exercises || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Không thể tải chi tiết bài nghe.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleAnswerChange = (exerciseId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [exerciseId]: val }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const payloadAnswers = exercises.map(ex => {
        const answerVal = answers[ex._id || ''] || '';
        // format fill_blank answers as comma separated string
        const formattedAnswer = Array.isArray(answerVal) ? answerVal.join(',') : answerVal;
        return {
          exerciseId: ex._id || '',
          studentAnswer: formattedAnswer,
        };
      });

      const res = await listeningService.submit(id, { answers: payloadAnswers });
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Nộp bài thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

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
        Quay lại danh sách
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
            Cấp độ: {content.level}
          </Typography>
          <Typography variant="caption" sx={{ px: 2, py: 0.5, bgcolor: '#ffedd5', color: '#c2410c', borderRadius: 4, fontWeight: 'bold' }}>
            Chủ đề: {content.topic}
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
              {showTranscript ? "Ẩn văn bản" : "Hiện văn bản"}
            </Button>
          </Box>

          {showTranscript && (
            <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'grey.50', borderRadius: 4, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" gutterBottom>Văn bản ghi âm</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {content.transcript}
              </Typography>
            </Paper>
          )}
        </>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>Bài tập luyện tập</Typography>

      {exercises.map((ex, index) => {
        const evaluation = result?.answers?.find(ans => ans.exerciseId === ex._id);
        const isSubmitted = result !== null;
        const isCorrect = evaluation?.isCorrect || false;

        return (
          <Paper key={ex._id} elevation={0} sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 4, 
            border: '1px solid', 
            borderColor: isSubmitted ? (isCorrect ? 'success.main' : 'error.main') : 'grey.200',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            position: 'relative'
          }}>
            {isSubmitted && (
              <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                {isCorrect ? (
                  <CheckCircle color="success" sx={{ fontSize: 28 }} />
                ) : (
                  <CancelOutlined color="error" sx={{ fontSize: 28 }} />
                )}
              </Box>
            )}

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
              <Box component="span" sx={{ bgcolor: '#B90000', color: 'white', minWidth: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {index + 1}
              </Box>
              {ex.question}
            </Typography>

            <Box sx={{ mt: 3, ml: 4 }}>
              {ex.type === 'quiz' && (
                <FormControl component="fieldset">
                  <RadioGroup 
                    value={answers[ex._id || ''] || ''} 
                    onChange={(e) => handleAnswerChange(ex._id || '', e.target.value)}
                  >
                    {(ex.options || []).map((opt: string) => (
                      <FormControlLabel 
                        key={opt} 
                        value={opt} 
                        control={<Radio disabled={isSubmitted} />} 
                        label={opt} 
                        sx={{
                          mb: 1,
                          color: isSubmitted ? (opt === ex.correctAnswer ? 'success.main' : (opt === answers[ex._id || ''] ? 'error.main' : 'inherit')) : 'inherit',
                          fontWeight: isSubmitted && (opt === ex.correctAnswer || opt === answers[ex._id || '']) ? 'bold' : 'normal'
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}

              {ex.type === 'fill_blank' && (
                <Box>
                  <Typography variant="body1" sx={{ lineHeight: 2 }}>
                    {(ex.textWithBlanks || '').split('___').map((part: string, i: number, arr: any[]) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <TextField
                            variant="standard"
                            size="small"
                            disabled={isSubmitted}
                            value={answers[ex._id || '']?.[i] || ''}
                            onChange={(e) => {
                              const currentVal = answers[ex._id || ''] || [];
                              const newAnswers = [...(Array.isArray(currentVal) ? currentVal : [])];
                              newAnswers[i] = e.target.value;
                              handleAnswerChange(ex._id || '', newAnswers);
                            }}
                            sx={{ mx: 1, width: 80, input: { textAlign: 'center' } }}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </Typography>
                  {isSubmitted && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 2, fontWeight: 'bold' }}>
                      Đáp án đúng: {(ex.answers || []).join(', ')}
                    </Typography>
                  )}
                </Box>
              )}

              {ex.type === 'dictation' && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    disabled={isSubmitted}
                    placeholder="Nghe và nhập nội dung tại đây..."
                    value={answers[ex._id || ''] || ''}
                    onChange={(e) => handleAnswerChange(ex._id || '', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  {isSubmitted && (
                    <Paper elevation={0} sx={{ p: 2, bgcolor: isCorrect ? 'success.50' : 'error.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color={isCorrect ? 'success.dark' : 'error.dark'} gutterBottom>Văn bản chính xác:</Typography>
                      <Typography variant="body1" color={isCorrect ? 'success.dark' : 'error.dark'}>{ex.targetText}</Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        );
      })}

      {result === null ? (
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          fullWidth 
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold', fontSize: '1.1rem', bgcolor: '#B90000', color: 'white', '&:hover': { bgcolor: '#990000' } }}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : 'Nộp bài'}
        </Button>
      ) : (
        <Paper elevation={0} sx={{ p: 4, bgcolor: '#fff5f5', borderRadius: 4, textAlign: 'center', border: '1px solid', borderColor: '#fecaca' }}>
          <CheckCircleOutline sx={{ fontSize: 56, color: '#B90000', mb: 2 }} />
          <Typography variant="h4" color="#B90000" fontWeight="bold" gutterBottom>
            Kết quả: {result.totalScore} / {result.maxScore}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
            Chúc mừng bạn đã hoàn thành bài tập nghe! Hãy xem lại chi tiết đúng sai của từng câu ở trên nhé.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/dashboard/student/listening')} sx={{ borderRadius: '12px' }}>
              Quay lại danh sách
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setResult(null);
                setAnswers({});
              }} 
              sx={{ bgcolor: '#B90000', color: 'white', '&:hover': { bgcolor: '#990000' }, borderRadius: '12px' }}
            >
              Làm lại bài
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default ListeningDetailPage;
