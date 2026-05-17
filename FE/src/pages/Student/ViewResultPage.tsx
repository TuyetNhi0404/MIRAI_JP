// src/pages/Student/ViewResultPage.tsx
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Grid,
} from "@mui/material";
import {
  CheckCircle as CorrectIcon,
  Cancel as WrongIcon,
  ArrowBack as BackIcon,
  Timer as TimerIcon,
  Score as ScoreIcon,
} from "@mui/icons-material";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import type { UserWithId } from "../../types/quiz.types";

const ViewResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { attemptDetail, loading, error, loadAttemptResult } = useQuiz();

  useEffect(() => {
    if (attemptId) {
      const userId = user?._id || (user as UserWithId)?.id;
      loadAttemptResult(attemptId, userId);
    }
  }, [attemptId, loadAttemptResult, user]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: "#B90000" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/dashboard/student/quizzes")}
          sx={{ color: "#B90000" }}
        >
          Back to Quizzes
        </Button>
      </Box>
    );
  }

  if (!attemptDetail) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="textSecondary">
          Result not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Back Button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate("/dashboard/student/quizzes")}
        sx={{ mb: 3, color: "#B90000" }}
      >
        Back to Quizzes
      </Button>

      {/* Result Summary */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, backgroundColor: "#FFF5E6" }}>
        <Typography variant="h4" sx={{ color: "#B90000", fontWeight: 700, mb: 2 }}>
          {attemptDetail.quizTitle}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", backgroundColor: "white" }}>
              <ScoreIcon sx={{ fontSize: 40, color: "#B90000", mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#B90000" }}>
                {attemptDetail.score}/{attemptDetail.totalQuestions}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Score
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", backgroundColor: "white" }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: attemptDetail.passed ? "#4CAF50" : "#f44336",
                  mb: 1,
                }}
              >
                {attemptDetail.percentage}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Percentage
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", backgroundColor: "white" }}>
              <TimerIcon sx={{ fontSize: 40, color: "#2196F3", mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#2196F3" }}>
                {attemptDetail.timeSpent}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Minutes
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", backgroundColor: "white" }}>
              <Chip
                icon={attemptDetail.passed ? <CorrectIcon /> : <WrongIcon />}
                label={attemptDetail.passed ? "PASSED" : "FAILED"}
                color={attemptDetail.passed ? "success" : "error"}
                sx={{ fontSize: "16px", fontWeight: 700, px: 2, py: 3 }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="body2" color="textSecondary">
          Completed: {new Date(attemptDetail.completedAt).toLocaleString()}
        </Typography>
      </Paper>

      {/* Detailed Results */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: "#333" }}>
        Question Review
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {attemptDetail.results.map((result, index) => {
          const isCorrect = result.isCorrect;

          return (
            <Paper
              key={index}
              elevation={2}
              sx={{
                p: 3,
                borderLeft: `4px solid ${isCorrect ? "#4CAF50" : "#f44336"}`,
              }}
            >
              {/* Question Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip
                  label={`Q${result.questionIndex + 1}`}
                  sx={{
                    backgroundColor: isCorrect ? "#4CAF50" : "#f44336",
                    color: "white",
                    fontWeight: 600,
                  }}
                />
                {isCorrect ? (
                  <Chip
                    icon={<CorrectIcon />}
                    label="Correct"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<WrongIcon />}
                    label="Incorrect"
                    color="error"
                    size="small"
                  />
                )}
              </Box>

              {/* Question Text */}
              <Typography variant="h6" sx={{ mb: 2, fontSize: "16px", fontWeight: 500 }}>
                {result.question}
              </Typography>

              <Divider sx={{ mb: 2 }} />

              {/* Options */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {result.options.map((option, optIndex) => {
                  const optionNumber = optIndex + 1;
                  const isStudentAnswer = result.studentAnswer === optionNumber;
                  const isCorrectAnswer = result.correctAnswer === optionNumber;

                  let backgroundColor = "white";
                  let borderColor = "#E0E0E0";
                  let textColor = "#333";

                  if (isCorrectAnswer) {
                    backgroundColor = "#E8F5E9";
                    borderColor = "#4CAF50";
                    textColor = "#2E7D32";
                  } else if (isStudentAnswer && !isCorrect) {
                    backgroundColor = "#FFEBEE";
                    borderColor = "#f44336";
                    textColor = "#c62828";
                  }

                  return (
                    <Box
                      key={optIndex}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor,
                        border: `2px solid ${borderColor}`,
                      }}
                    >
                      {isCorrectAnswer ? (
                        <CorrectIcon sx={{ color: "#4CAF50", fontSize: 20 }} />
                      ) : isStudentAnswer ? (
                        <WrongIcon sx={{ color: "#f44336", fontSize: 20 }} />
                      ) : (
                        <Box sx={{ width: 20 }} />
                      )}

                      <Chip
                        label={String.fromCharCode(65 + optIndex)}
                        size="small"
                        sx={{
                          backgroundColor: isCorrectAnswer ? "#4CAF50" : "#E0E0E0",
                          color: isCorrectAnswer ? "white" : "#666",
                          fontWeight: 600,
                          minWidth: 32,
                        }}
                      />

                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          color: textColor,
                          fontWeight: isCorrectAnswer || isStudentAnswer ? 500 : 400,
                        }}
                      >
                        {option}
                      </Typography>

                      {isStudentAnswer && (
                        <Chip
                          label="Your Answer"
                          size="small"
                          sx={{
                            backgroundColor: isCorrect ? "#4CAF50" : "#f44336",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {isCorrectAnswer && !isStudentAnswer && (
                        <Chip
                          label="Correct Answer"
                          size="small"
                          sx={{
                            backgroundColor: "#4CAF50",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Bottom Navigation */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          startIcon={<BackIcon />}
          onClick={() => navigate("/dashboard/student/quizzes")}
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0e" },
            px: 4,
          }}
        >
          Back to Quizzes
        </Button>
      </Box>
    </Box>
  );
};

export default ViewResultPage;
