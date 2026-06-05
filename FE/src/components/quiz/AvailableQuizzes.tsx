// src/components/quiz/student/AvailableQuizzes.tsx
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  MenuItem,
  Alert,
  useMediaQuery,
  useTheme,
  Stack,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionIcon,
  CheckCircle as CompletedIcon,
  Event as EventIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { QuizWithAttempt } from "../../types/quiz.types";

interface AvailableQuizzesProps {
  quizzes: QuizWithAttempt[];
}

const AvailableQuizzes: React.FC<AvailableQuizzesProps> = ({ quizzes = [] }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const isQuizExpired = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() <= Date.now();
  };

  const formatDueDate = (dueDate?: string): string => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemainingText = (dueDate?: string): string => {
    if (!dueDate) return "";
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    
    if (diffMs < 0) return "Expired";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h left`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d left`;
  };

  const getDueDateColor = (dueDate?: string): "error" | "warning" | "success" | "default" => {
    if (!dueDate) return "default";
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return "error";
    if (diffHours < 24) return "warning";
    if (diffHours < 72) return "success";
    return "default";
  };

  const courseName = quizzes.length > 0 && quizzes[0].courseName 
    ? quizzes[0].courseName 
    : "Unknown Course";

  const filteredQuizzes = quizzes.filter((quiz) => {
    const completedMatch = showCompleted || !quiz.hasAttempted;
    return completedMatch;
  });

  const handleStartQuiz = (quizId: string, hasAttempted: boolean, dueDate?: string) => {
    if (isQuizExpired(dueDate)) {
      alert("This quiz has expired and can no longer be taken.");
      return;
    }
    
    if (hasAttempted) {
      alert("You have already completed this quiz!");
      return;
    }
    navigate(`/dashboard/student/quiz/${quizId}`);
  };

  const handleViewResult = (quiz: QuizWithAttempt) => {
    console.log("View result for quiz:", quiz._id);
  };

  if (quizzes.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: { xs: 4, sm: 8 } }}>
        <Alert severity="info">
          <Typography variant={isMobile ? "body1" : "h6"}>
            No quizzes available yet
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You haven't joined any courses yet or no quizzes have been created
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Course Info */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={{ xs: 2, sm: 2 }}
        >
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Typography 
              variant={isMobile ? "body1" : "h6"}
              sx={{ 
                color: "#B90000", 
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >
              {courseName}
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                mt: 0.5
              }}
            >
              Total: {quizzes.length} • 
              Available: {quizzes.filter(q => !q.hasAttempted && !isQuizExpired(q.dueDate)).length} • 
              Completed: {quizzes.filter(q => q.hasAttempted).length}
            </Typography>
          </Box>
          
          <TextField
            select
            label="Show Completed"
            value={showCompleted ? "yes" : "no"}
            onChange={(e) => setShowCompleted(e.target.value === "yes")}
            sx={{ 
              minWidth: { xs: '100%', sm: 180 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
            size="small"
          >
            <MenuItem value="no">Available Only</MenuItem>
            <MenuItem value="yes">Show All</MenuItem>
          </TextField>
        </Stack>
      </Box>

      {/* Quiz Cards */}
      {filteredQuizzes.length === 0 ? (
        <Box sx={{ 
          textAlign: "center", 
          py: { xs: 4, sm: 8 }, 
          color: "#666" 
        }}>
          <Typography variant={isMobile ? "body1" : "h6"}>
            {showCompleted ? "No quizzes found" : "No available quizzes"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {showCompleted 
              ? "Try unchecking 'Show All' to view available quizzes"
              : "You have completed all quizzes or no quizzes have been created yet"}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
          {filteredQuizzes.map((quiz) => {
            const isExpired = isQuizExpired(quiz.dueDate);
            const timeRemaining = getTimeRemainingText(quiz.dueDate);
            const dueDateColor = getDueDateColor(quiz.dueDate);

            return (
              <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s",
                    opacity: quiz.hasAttempted || isExpired ? 0.7 : 1,
                    border: quiz.hasAttempted 
                      ? "2px solid #4CAF50" 
                      : isExpired 
                        ? "2px solid #f44336" 
                        : "1px solid #e0e0e0",
                    "&:hover": {
                      transform: quiz.hasAttempted || isExpired ? "none" : "translateY(-4px)",
                      boxShadow: quiz.hasAttempted || isExpired
                        ? "none"
                        : "0 4px 20px rgba(236, 117, 16, 0.2)",
                    },
                  }}
                >
                  <CardContent sx={{ 
                    flexGrow: 1, 
                    display: "flex", 
                    flexDirection: "column",
                    p: { xs: 2, sm: 2, md: 2.5 }
                  }}>
                    {/* Status Badges */}
                    <Box sx={{ 
                      display: "flex", 
                      gap: { xs: 0.5, sm: 1 }, 
                      mb: { xs: 1, sm: 1.5 }, 
                      flexWrap: "wrap" 
                    }}>
                      {quiz.hasAttempted && (
                        <Chip
                          icon={<CompletedIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label={`Completed - ${quiz.attemptPercentage}%`}
                          color={quiz.attemptPassed ? "success" : "error"}
                          size="small"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
                          }}
                        />
                      )}
                      {isExpired && !quiz.hasAttempted && (
                        <Chip
                          icon={<WarningIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label="EXPIRED"
                          color="error"
                          size="small"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant={isMobile ? "body1" : "h6"}
                      sx={{
                        color: quiz.hasAttempted || isExpired ? "#666" : "#B90000",
                        fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.125rem' },
                        mb: { xs: 0.5, sm: 1 },
                        lineHeight: 1.3,
                      }}
                    >
                      {quiz.title}
                    </Typography>

                    {quiz.description && (
                      <Typography
                        variant="body2"
                        sx={{ 
                          color: "#666", 
                          mb: { xs: 1.5, sm: 2 }, 
                          flexGrow: 1,
                          fontSize: { xs: '0.875rem', sm: '0.875rem' },
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: { xs: 2, sm: 3 },
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {quiz.description}
                      </Typography>
                    )}

                    <Box sx={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: { xs: 0.5, sm: 1 }, 
                      mb: { xs: 1, sm: 1.5 } 
                    }}>
                      <Chip
                        icon={<QuestionIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                        label={`${quiz.totalQuestions} questions`}
                        size="small"
                        sx={{ 
                          backgroundColor: "#FFF5E6",
                          fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                          height: { xs: 24, sm: 28 }
                        }}
                      />
                      {quiz.durationMinutes && (
                        <Chip
                          icon={<TimerIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label={`${quiz.durationMinutes} minutes`}
                          size="small"
                          sx={{ 
                            backgroundColor: "#FFF5E6",
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
                          }}
                        />
                      )}
                      
                      {quiz.dueDate && (
                        <Chip
                          icon={<EventIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label={timeRemaining}
                          color={dueDateColor}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
                          }}
                        />
                      )}
                    </Box>

                    {quiz.dueDate && !isExpired && (
                      <Typography 
                        variant="caption" 
                        color="textSecondary" 
                        sx={{ 
                          mb: { xs: 1.5, sm: 2 },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      >
                        📅 Due: {formatDueDate(quiz.dueDate)}
                      </Typography>
                    )}

                    {/* Action Buttons */}
                    {quiz.hasAttempted ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleViewResult(quiz)}
                        disabled
                        sx={{
                          mt: "auto",
                          color: "#666",
                          borderColor: "#ccc",
                          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          py: { xs: 0.75, sm: 1 }
                        }}
                      >
                        Completed
                      </Button>
                    ) : isExpired ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled
                        sx={{
                          mt: "auto",
                          color: "#f44336",
                          borderColor: "#f44336",
                          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          py: { xs: 0.75, sm: 1 }
                        }}
                      >
                        Quiz Expired
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<StartIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                        onClick={() => handleStartQuiz(quiz._id, quiz.hasAttempted, quiz.dueDate)}
                        sx={{
                          backgroundColor: "#B90000",
                          "&:hover": { backgroundColor: "#d66a0e" },
                          mt: "auto",
                          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          py: { xs: 0.75, sm: 1 }
                        }}
                      >
                        Start Quiz
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default AvailableQuizzes;
