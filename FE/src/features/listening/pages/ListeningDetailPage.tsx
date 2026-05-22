import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Divider, Paper, Radio, RadioGroup, FormControlLabel, FormControl, TextField } from '@mui/material';
import { ArrowBack, CheckCircleOutline } from '@mui/icons-material';
import { mockListeningContents, mockExercises } from '../mockData';
import AudioPlayer from '../components/AudioPlayer';

const ListeningDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState(mockListeningContents.find(c => c._id === id));
  const [exercises, setExercises] = useState(mockExercises[id || ''] || []);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!content) {
      // In a real app, you would fetch the data here.
      navigate('/dashboard/student/listening');
    }
  }, [content, navigate]);

  if (!content) return null;

  const handleAnswerChange = (exerciseId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [exerciseId]: val }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/dashboard/student/listening')}
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}
      >
        Back to List
      </Button>

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

      <Box sx={{ position: 'sticky', top: 20, zIndex: 10, mb: 4 }}>
        <AudioPlayer src={content.audioUrl} />
      </Box>

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

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>Exercises</Typography>

      {exercises.map((ex, index) => (
        <Paper key={ex._id} elevation={0} sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 4, 
          border: '1px solid', 
          borderColor: isSubmitted && (answers[ex._id] === (ex as any).correctAnswer) ? 'success.main' : 'grey.200',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ bgcolor: '#B90000', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {index + 1}
            </Box>
            {ex.question}
          </Typography>

          <Box sx={{ mt: 3, ml: 4 }}>
            {ex.type === 'quiz' && (
              <FormControl component="fieldset">
                <RadioGroup 
                  value={answers[ex._id] || ''} 
                  onChange={(e) => handleAnswerChange(ex._id, e.target.value)}
                >
                  {(ex as any).options.map((opt: string) => (
                    <FormControlLabel 
                      key={opt} 
                      value={opt} 
                      control={<Radio disabled={isSubmitted} />} 
                      label={opt} 
                      sx={{
                        mb: 1,
                        color: isSubmitted && opt === (ex as any).correctAnswer ? 'success.main' : 'inherit',
                        fontWeight: isSubmitted && opt === (ex as any).correctAnswer ? 'bold' : 'normal'
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}

            {ex.type === 'fill_blank' && (
              <Box>
                <Typography variant="body1" sx={{ lineHeight: 2 }}>
                  {(ex as any).textWithBlanks.split('___').map((part: string, i: number, arr: any[]) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <TextField
                          variant="standard"
                          size="small"
                          disabled={isSubmitted}
                          value={answers[ex._id]?.[i] || ''}
                          onChange={(e) => {
                            const newAnswers = [...(answers[ex._id] || [])];
                            newAnswers[i] = e.target.value;
                            handleAnswerChange(ex._id, newAnswers);
                          }}
                          sx={{ mx: 1, width: 80, input: { textAlign: 'center' } }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </Typography>
                {isSubmitted && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 2, fontWeight: 'bold' }}>
                    Answers: {(ex as any).answers.join(', ')}
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
                  placeholder="Listen and type here..."
                  value={answers[ex._id] || ''}
                  onChange={(e) => handleAnswerChange(ex._id, e.target.value)}
                  sx={{ mb: 2 }}
                />
                {isSubmitted && (
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="success.dark" gutterBottom>Correct Text:</Typography>
                    <Typography variant="body1" color="success.dark">{(ex as any).targetText}</Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      ))}

      {!isSubmitted ? (
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          fullWidth 
          onClick={handleSubmit}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold', fontSize: '1.1rem', bgcolor: '#B90000', color: 'white', '&:hover': { bgcolor: '#990000' } }}
        >
          Submit Answers
        </Button>
      ) : (
        <Paper elevation={0} sx={{ p: 3, bgcolor: '#fff5f5', borderRadius: 4, textAlign: 'center' }}>
          <CheckCircleOutline sx={{ fontSize: 48, color: '#B90000', mb: 1 }} />
          <Typography variant="h5" color="#B90000" fontWeight="bold">Great Job!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            You have completed this listening practice. Review your answers above.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/dashboard/student/listening')}>
            Back to Listening List
          </Button>
        </Paper>
      )}
    </Container>
  );
};

export default ListeningDetailPage;
