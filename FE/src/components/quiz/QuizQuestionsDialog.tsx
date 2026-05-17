// src/components/quiz/QuizQuestionsDialog.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
} from "@mui/icons-material";
import type { QuizQuestionsResponse } from "../../types/quiz.types";

interface QuizQuestionsDialogProps {
  open: boolean;
  onClose: () => void;
  quizQuestions: QuizQuestionsResponse | null;
  loading?: boolean;
}

const QuizQuestionsDialog: React.FC<QuizQuestionsDialogProps> = ({
  open,
  onClose,
  quizQuestions,
  loading = false,
}) => {
  if (loading || !quizQuestions) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#B90000" }} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const { quiz, questions } = quizQuestions;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle sx={{ color: "#B90000", fontWeight: 600, pb: 1 }}>
        Quiz Questions: {quiz.title}
      </DialogTitle>
      
      <Box sx={{ px: 3, pb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Total Questions: {quiz.totalQuestions}
        </Typography>
      </Box>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2 }}>
        {questions.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: "center", py: 4, color: "#666" }}>
            No questions found in this quiz
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {questions.map((question, _) => (
              <Paper
                key={question.questionId}
                elevation={2}
                sx={{
                  p: 3,
                  borderLeft: "4px solid #B90000",
                  backgroundColor: "#FAFAFA",
                }}
              >
                {/* Question Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Chip
                    label={`Q${question.order}`}
                    size="small"
                    sx={{
                      backgroundColor: "#B90000",
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Question ID: {question.questionId.slice(-8)}
                  </Typography>
                </Box>

                {/* Question Text */}
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#333",
                  }}
                >
                  {question.questionText}
                </Typography>

                {/* Options */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {question.options.map((option, optIndex) => {
                    const optionNumber = optIndex + 1;
                    const isCorrect = question.correctAnswer === optionNumber;

                    return (
                      <Box
                        key={optIndex}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: isCorrect ? "#E8F5E9" : "white",
                          border: isCorrect ? "2px solid #4CAF50" : "1px solid #E0E0E0",
                          transition: "all 0.2s",
                        }}
                      >
                        {isCorrect ? (
                          <CheckIcon sx={{ color: "#4CAF50", fontSize: 20 }} />
                        ) : (
                          <UncheckedIcon sx={{ color: "#999", fontSize: 20 }} />
                        )}
                        
                        <Chip
                          label={String.fromCharCode(65 + optIndex)}
                          size="small"
                          sx={{
                            backgroundColor: isCorrect ? "#4CAF50" : "#E0E0E0",
                            color: isCorrect ? "white" : "#666",
                            fontWeight: 600,
                            minWidth: 32,
                          }}
                        />

                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            color: isCorrect ? "#2E7D32" : "#333",
                            fontWeight: isCorrect ? 500 : 400,
                          }}
                        >
                          {option}
                        </Typography>

                        {isCorrect && (
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
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0e" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizQuestionsDialog;
