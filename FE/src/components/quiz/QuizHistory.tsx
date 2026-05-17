// src/components/quiz/QuizHistory.tsx
import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  Timer as TimerIcon,
  Score as ScoreIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { QuizAttempt } from "../../types/quiz.types";

interface QuizHistoryProps {
  attempts: QuizAttempt[];
}

const QuizHistory: React.FC<QuizHistoryProps> = ({ attempts }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const handleViewResult = (attemptId: string) => {
    navigate(`/dashboard/student/quiz/result/${attemptId}`);
  };

  if (attempts.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: { xs: 4, sm: 8 }, color: "#666" }}>
        <Typography variant={isMobile ? "body1" : "h6"}>
          No quiz attempts yet
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Start taking quizzes to see your results here
        </Typography>
      </Box>
    );
  }

  // Mobile & Tablet View - Cards
  if (isMobile || isTablet) {
    return (
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        {attempts.map((attempt) => {
          const quizTitle = typeof attempt.quizId === 'string'
            ? "Unknown Quiz"
            : attempt.quizId.title || "Unknown Quiz";

          return (
            <Card
              key={attempt._id}
              elevation={2}
              sx={{
                border: attempt.passed ? '2px solid #4CAF50' : '2px solid #f44336',
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                {/* Header */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                  gap: 1
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant={isMobile ? "body1" : "h6"}
                      sx={{
                        fontWeight: 600,
                        color: "#B90000",
                        fontSize: { xs: '1rem', sm: '1.125rem' },
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {quizTitle}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      <CalendarIcon sx={{ fontSize: '0.875rem' }} />
                      {new Date(attempt.completedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>

                  <Chip
                    icon={attempt.passed ? <PassIcon /> : <FailIcon />}
                    label={attempt.passed ? "Passed" : "Failed"}
                    color={attempt.passed ? "success" : "error"}
                    size="small"
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                      height: { xs: 24, sm: 28 },
                      fontWeight: 600
                    }}
                  />
                </Box>

                {/* Stats Grid */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: { xs: 1.5, sm: 2 },
                  mb: 2,
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      <ScoreIcon sx={{ fontSize: '0.875rem' }} />
                      Score
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }}
                    >
                      {attempt.score}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      <QuizIcon sx={{ fontSize: '0.875rem' }} />
                      Percentage
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: attempt.passed ? "#4CAF50" : "#f44336",
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }}
                    >
                      {attempt.percentage}%
                    </Typography>
                  </Box>

                  <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      <TimerIcon sx={{ fontSize: '0.875rem' }} />
                      Time Spent
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }}
                    >
                      {attempt.timeSpent} mins
                    </Typography>
                  </Box>
                </Box>

                {/* Action Button */}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => handleViewResult(attempt._id)}
                  sx={{
                    backgroundColor: "#B90000",
                    "&:hover": { backgroundColor: "#d66a0e" },
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                    py: { xs: 0.75, sm: 1 }
                  }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  }

  // Desktop View - Table
  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{
        '& .MuiTable-root': {
          minWidth: 800
        }
      }}
    >
      <Table>
        <TableHead sx={{ backgroundColor: "#FFF5E6" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Quiz Title
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }} align="center">
              Score
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }} align="center">
              Percentage
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }} align="center">
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }} align="center">
              Time Spent
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Completed At
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }} align="center">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attempts.map((attempt) => {
            const quizTitle = typeof attempt.quizId === 'string'
              ? "Unknown Quiz"
              : attempt.quizId.title || "Unknown Quiz";

            return (
              <TableRow
                key={attempt._id}
                sx={{
                  "&:hover": { backgroundColor: "#FAFAFA" },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {quizTitle}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {attempt.score}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: attempt.passed ? "#4CAF50" : "#f44336",
                    }}
                  >
                    {attempt.percentage}%
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={attempt.passed ? <PassIcon /> : <FailIcon />}
                    label={attempt.passed ? "Passed" : "Failed"}
                    color={attempt.passed ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {attempt.timeSpent} mins
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: "13px" }}>
                    {new Date(attempt.completedAt).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewResult(attempt._id)}
                    sx={{
                      color: "#B90000",
                      "&:hover": { backgroundColor: "#FFF5E6" },
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default QuizHistory;
