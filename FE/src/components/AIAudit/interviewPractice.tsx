import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Mic,
  Play,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

const AppState = {
  IDLE: 'IDLE',
  GETTING_QUESTION: 'GETTING_QUESTION',
  ASKING_QUESTION: 'ASKING_QUESTION',
  READY_TO_RECORD: 'READY_TO_RECORD',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  SHOWING_FEEDBACK: 'SHOWING_FEEDBACK',
  ERROR: 'ERROR',
} as const;

type AppState = typeof AppState[keyof typeof AppState];

interface EvaluationResult {
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    SpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const API_BASE_URL = 'http://localhost:5000/api';

// Orange-White Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#ff6b35',
      light: '#ff8c61',
      dark: '#e64a19',
    },
    secondary: {
      main: '#B90000',
      light: '#ffb74d',
      dark: '#B90000',
    },
    background: {
      default: '#fff8f5',
      paper: '#ffffff',
    },
    error: {
      main: '#d32f2f',
    },
    success: {
      main: '#ff6b35',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(255, 107, 53, 0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 12,
        },
      },
    },
  },
});

const InterviewPractice: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-US' | 'vi-VN'>('en-US');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>('');

  const questions = {
    'en-US': [
      "Explain the concept of Virtual DOM in React",
      "What does HTML stand for?",
      "Difference between Authentication and Authorization",
      "Role of HTML and CSS in web development",
    ],
    'vi-VN': [
      "Giải thích về Virtual DOM trong React",
      "HTML là viết tắt của gì?",
      "Sự khác biệt giữa xác thực và ủy quyền",
      "Vai trò của HTML và CSS trong phát triển web",
    ]
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscriptPart = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptPart += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }
        
        if (finalTranscriptPart) {
          transcriptRef.current += finalTranscriptPart;
          setFinalTranscript(transcriptRef.current);
          console.log('Saved:', transcriptRef.current);
        }
        
        setUserAnswer(transcriptRef.current + interimTranscript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current.onend = () => {
        if (isRecordingActive) {
          try {
            setTimeout(() => {
              if (recognitionRef.current && isRecordingActive) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch (err) {
            console.error('Failed to restart:', err);
          }
        }
      };
    }

       return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors when stopping recognition
        }
      }
    };
  }, [isRecordingActive, selectedLanguage]);

  const getRandomQuestion = (): string => {
    const questionList = questions[selectedLanguage];
    return questionList[Math.floor(Math.random() * questionList.length)];
  };

  const generateAndPlayAudio = async (text: string, isQuestion: boolean = true): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Failed to generate audio');

      const data = await response.json();
      const audioBlob = base64ToBlob(data.audio, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      
      if (isQuestion) {
        questionAudioRef.current = audio;
        setIsPlayingQuestion(true);
      } else {
        feedbackAudioRef.current = audio;
        setIsPlayingFeedback(true);
      }

      audio.onended = () => {
        if (isQuestion) {
          setIsPlayingQuestion(false);
          setAppState(AppState.READY_TO_RECORD);
        } else {
          setIsPlayingFeedback(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (err) {
      console.error('Error generating audio:', err);
      setError('Không thể tạo audio');
      if (isQuestion) {
        setAppState(AppState.READY_TO_RECORD);
      }
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([byteNumbers], { type: mimeType });
  };

  const startInterview = async (): Promise<void> => {
    setError('');
    setEvaluation(null);
    setUserAnswer('');
    setFinalTranscript('');
    transcriptRef.current = '';
    setAppState(AppState.GETTING_QUESTION);

    const question = getRandomQuestion();
    setCurrentQuestion(question);
    
    setAppState(AppState.ASKING_QUESTION);
    await generateAndPlayAudio(question, true);
  };

  const startRecording = async (): Promise<void> => {
    try {
      setUserAnswer('');
      setFinalTranscript('');
      transcriptRef.current = '';
      setIsRecordingActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setAppState(AppState.RECORDING);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition started');
        } catch (e) {
          console.error('Recognition already started:', e);
        }
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Cannot access microphone');
      setAppState(AppState.ERROR);
      setIsRecordingActive(false);
    }
  };

  const stopRecording = (): void => {
    setIsRecordingActive(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped');
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    setAppState(AppState.PROCESSING);
    
    // Use finalTranscript for evaluation
    setTimeout(() => {
      evaluateAnswer();
    }, 500);
  };

  const evaluateAnswer = async (): Promise<void> => {
    try {
      const answerToEvaluate = transcriptRef.current.trim() || finalTranscript.trim();
      
      console.log('Evaluating answer:', answerToEvaluate);
      
      if (!answerToEvaluate) {
        setError('No answer detected. Please speak clearly and try again.');
        setAppState(AppState.ERROR);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/audit/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          answer: answerToEvaluate,
        }),
      });

      if (!response.ok) throw new Error('Failed to evaluate answer');

      const result: EvaluationResult = await response.json();
      setEvaluation(result);
      setAppState(AppState.SHOWING_FEEDBACK);

      await generateAndPlayAudio(
        `You scored ${result.score} points. ${result.feedback}`,
        false
      );
    } catch (err) {
      console.error('Error evaluating answer:', err);
      setError('Failed to evaluate answer');
      setAppState(AppState.ERROR);
    }
  };

  const stopQuestionAudio = (): void => {
    if (questionAudioRef.current) {
      questionAudioRef.current.pause();
      questionAudioRef.current.currentTime = 0;
      setIsPlayingQuestion(false);
      setAppState(AppState.READY_TO_RECORD);
    }
  };

  const stopFeedbackAudio = (): void => {
    if (feedbackAudioRef.current) {
      feedbackAudioRef.current.pause();
      feedbackAudioRef.current.currentTime = 0;
      setIsPlayingFeedback(false);
    }
  };

  const replayQuestion = (): void => {
    if (currentQuestion) {
      generateAndPlayAudio(currentQuestion, true);
    }
  };

  const replayFeedback = (): void => {
    if (evaluation) {
      generateAndPlayAudio(
        `You scored ${evaluation.score} points. ${evaluation.feedback}`,
        false
      );
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return '#4caf50';
    if (score >= 6) return '#B90000';
    return '#f44336';
  };

  const getStateMessage = (): string => {
    switch (appState) {
      case AppState.GETTING_QUESTION:
        return 'Getting question...';
      case AppState.ASKING_QUESTION:
        return 'Reading question...';
      case AppState.READY_TO_RECORD:
        return 'Ready to record your answer';
      case AppState.RECORDING:
        return 'Recording...';
      case AppState.PROCESSING:
        return 'Evaluating answer...';
      case AppState.SHOWING_FEEDBACK:
        return 'Evaluation Result';
      default:
        return 'Start Interview Practice';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #fff8f5 0%, #ffe8dc 100%)',
        py: 4 
      }}>
        <Container maxWidth="md">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Box sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 2, 
              mb: 2,
              p: 2,
              background: 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)',
              borderRadius: 3,
              boxShadow: '0 8px 24px rgba(255, 107, 53, 0.3)',
            }}>
              <Sparkles size={32} color="#fff" />
              <Typography variant="h3" sx={{ color: '#fff', mb: 0 }}>
                AI Interview Coach
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#ff6b35', fontWeight: 500, mb: 2 }}>
              Practice IT interviews with AI - Get instant feedback
            </Typography>
            
            {/* Language Selector */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant={selectedLanguage === 'en-US' ? 'contained' : 'outlined'}
                onClick={() => setSelectedLanguage('en-US')}
                disabled={appState !== AppState.IDLE}
                sx={{
                  px: 3,
                  py: 1,
                  borderColor: '#ff6b35',
                  color: selectedLanguage === 'en-US' ? '#fff' : '#ff6b35',
                  background: selectedLanguage === 'en-US' 
                    ? 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)'
                    : 'transparent',
                  '&:hover': {
                    borderColor: '#e64a19',
                    background: selectedLanguage === 'en-US'
                      ? 'linear-gradient(135deg, #e64a19 0%, #B90000 100%)'
                      : 'rgba(255, 107, 53, 0.04)',
                  },
                  '&:disabled': {
                    opacity: 0.6,
                  }
                }}
              >
                🇺🇸 English
              </Button>
              <Button
                variant={selectedLanguage === 'vi-VN' ? 'contained' : 'outlined'}
                onClick={() => setSelectedLanguage('vi-VN')}
                disabled={appState !== AppState.IDLE}
                sx={{
                  px: 3,
                  py: 1,
                  borderColor: '#ff6b35',
                  color: selectedLanguage === 'vi-VN' ? '#fff' : '#ff6b35',
                  background: selectedLanguage === 'vi-VN'
                    ? 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)'
                    : 'transparent',
                  '&:hover': {
                    borderColor: '#e64a19',
                    background: selectedLanguage === 'vi-VN'
                      ? 'linear-gradient(135deg, #e64a19 0%, #B90000 100%)'
                      : 'rgba(255, 107, 53, 0.04)',
                  },
                  '&:disabled': {
                    opacity: 0.6,
                  }
                }}
              >
                🇻🇳 Tiếng Việt
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError('')} 
              sx={{ mb: 3, borderRadius: 3 }}
            >
              {error}
            </Alert>
          )}

          <Card elevation={0} sx={{ 
            background: '#ffffff',
            border: '2px solid',
            borderColor: 'rgba(255, 107, 53, 0.1)',
          }}>
            <CardContent sx={{ p: 4 }}>
              {/* Status Header */}
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Chip
                  label={getStateMessage()}
                  color={appState === AppState.ERROR ? 'error' : 'primary'}
                  icon={
                    appState === AppState.RECORDING ? (
                      <Mic size={18} />
                    ) : appState === AppState.PROCESSING ? (
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : appState === AppState.SHOWING_FEEDBACK ? (
                      <CheckCircle2 size={18} />
                    ) : undefined
                  }
                  sx={{ 
                    fontSize: '1.1rem', 
                    py: 3, 
                    px: 4,
                    background: appState === AppState.RECORDING 
                      ? 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)'
                      : 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)',
                    color: '#fff',
                    '& .MuiChip-icon': {
                      color: '#fff'
                    }
                  }}
                />
              </Box>

              {/* Progress Bar */}
              {(appState === AppState.GETTING_QUESTION ||
                appState === AppState.PROCESSING) && (
                <LinearProgress 
                  sx={{ 
                    mb: 4, 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #ff6b35 0%, #B90000 100%)'
                    }
                  }} 
                />
              )}

              {/* Question Display */}
              {currentQuestion && appState !== AppState.IDLE && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%)',
                    border: '2px solid #ffd4ba',
                    borderRadius: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="overline" sx={{ color: '#ff6b35', fontWeight: 700 }}>
                        📝 Interview Question
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 1, color: '#333', lineHeight: 1.6 }}>
                        {currentQuestion}
                      </Typography>
                    </Box>
                    {appState >= AppState.READY_TO_RECORD && (
                      <Tooltip title={isPlayingQuestion ? "Stop reading" : "Replay question"}>
                        <IconButton
                          onClick={isPlayingQuestion ? stopQuestionAudio : replayQuestion}
                          disabled={appState === AppState.RECORDING}
                          sx={{
                            backgroundColor: '#ff6b35',
                            color: '#fff',
                            '&:hover': {
                              backgroundColor: '#e64a19',
                            },
                            '&:disabled': {
                              backgroundColor: 'rgba(255, 107, 53, 0.3)',
                            }
                          }}
                        >
                          {isPlayingQuestion ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              )}

              {/* Recording Section */}
              {appState === AppState.RECORDING && userAnswer && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    border: '2px solid #ffb74d',
                    borderRadius: 3,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.01)' }
                    }
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#B90000', fontWeight: 700 }}>
                    🎙️ Recording your answer...
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, color: '#333', lineHeight: 1.8 }}>
                    {userAnswer || 'Speak now...'}
                  </Typography>
                </Paper>
              )}

              {/* Evaluation Result */}
              {evaluation && appState === AppState.SHOWING_FEEDBACK && (
                <Box sx={{ mb: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      mb: 2,
                      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                      border: '2px solid #4caf50',
                      borderRadius: 3,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="overline" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                          Score
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" sx={{ color: getScoreColor(evaluation.score) }}>
                          {evaluation.score}/10
                        </Typography>
                      </Box>
                      <Tooltip title={isPlayingFeedback ? "Stop reading" : "Replay feedback"}>
                        <IconButton
                          onClick={isPlayingFeedback ? stopFeedbackAudio : replayFeedback}
                          sx={{
                            backgroundColor: '#4caf50',
                            color: '#fff',
                            '&:hover': {
                              backgroundColor: '#388e3c',
                            }
                          }}
                        >
                          {isPlayingFeedback ? <VolumeX size={22} /> : <Volume2 size={22} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#333', lineHeight: 1.8 }}>
                      {evaluation.feedback}
                    </Typography>
                  </Paper>

                  {evaluation.userAnswer && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        background: '#fafafa',
                        border: '1px solid #e0e0e0',
                        borderRadius: 3,
                      }}
                    >
                      <Typography variant="overline" sx={{ color: '#666', fontWeight: 700 }}>
                        💬 Your Answer
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: '#555', lineHeight: 1.8 }}>
                        {evaluation.userAnswer}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {appState === AppState.IDLE && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Play size={22} />}
                    onClick={startInterview}
                    sx={{ 
                      px: 5, 
                      py: 2,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #e64a19 0%, #B90000 100%)',
                      }
                    }}
                  >
                    Start Practice
                  </Button>
                )}

                {appState === AppState.READY_TO_RECORD && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Mic size={22} />}
                    onClick={startRecording}
                    sx={{ 
                      px: 5, 
                      py: 2,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #d32f2f 0%, #c2185b 100%)',
                      }
                    }}
                  >
                    Start Answering
                  </Button>
                )}

                {appState === AppState.RECORDING && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Square size={22} />}
                    onClick={stopRecording}
                    sx={{ 
                      px: 5, 
                      py: 2,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #d32f2f 0%, #c2185b 100%)',
                      }
                    }}
                  >
                    Stop & Evaluate
                  </Button>
                )}

                {appState === AppState.SHOWING_FEEDBACK && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<RefreshCw size={22} />}
                    onClick={startInterview}
                    sx={{ 
                      px: 5, 
                      py: 2,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #ff6b35 0%, #B90000 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #e64a19 0%, #B90000 100%)',
                      }
                    }}
                  >
                    New Question
                  </Button>
                )}

                {(appState === AppState.ERROR || appState === AppState.SHOWING_FEEDBACK) && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      setAppState(AppState.IDLE);
                      setCurrentQuestion('');
                      setUserAnswer('');
                      setFinalTranscript('');
                      transcriptRef.current = '';
                      setEvaluation(null);
                      setError('');
                      setIsRecordingActive(false);
                    }}
                    sx={{ 
                      px: 5, 
                      py: 2,
                      fontSize: '1.1rem',
                      borderColor: '#ff6b35',
                      color: '#ff6b35',
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: '#e64a19',
                        backgroundColor: 'rgba(255, 107, 53, 0.04)',
                        borderWidth: 2,
                      }
                    }}
                  >
                    Back to Home
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Paper 
            elevation={0} 
            sx={{ 
              mt: 4, 
              p: 4, 
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#ff6b35', fontWeight: 700 }}>
              📋 How to Use
            </Typography>
            <Box component="ol" sx={{ pl: 3, m: 0, color: '#555' }}>
              <Typography component="li" variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>
                Click <strong>"Start Practice"</strong> to get a random interview question
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>
                The AI system will read the question aloud (you can replay it anytime)
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>
                Click <strong>"Start Answering"</strong> and speak your answer continuously
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>
                Click <strong>"Stop & Evaluate"</strong> when you finish your answer
              </Typography>
              <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                Receive your score and detailed feedback from the AI Coach instantly
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default InterviewPractice;
