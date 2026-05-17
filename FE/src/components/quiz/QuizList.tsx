// src/components/quiz/QuizList.tsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Grid,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionIcon,
  ListAlt as ListIcon,
  Event as EventIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type { Quiz } from "../../types/quiz.types";

interface QuizListProps {
  quizzes: Quiz[];
  onEdit?: (quiz: Quiz) => void;
  onDelete?: (quizId: string) => void;
  onViewStats?: (quizId: string) => void;
  onViewQuestions?: (quizId: string) => void;
  onStartQuiz?: (quizId: string) => void;
  isTeacher?: boolean;
}

const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  onEdit,
  onDelete,
  onViewStats,
  onViewQuestions,
  onStartQuiz,
  isTeacher = false,
}) => {
  // ✅ Helper: Check if quiz is expired
  const isQuizExpired = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() <= Date.now();
  };

  // ✅ Helper: Format due date
  const formatDueDate = (dueDate?: string): string => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return "Expired";
    if (diffHours < 24) return `${diffHours}h left`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d left`;
  };

  // ✅ Helper: Get due date color
  const getDueDateColor = (dueDate?: string): "error" | "warning" | "default" => {
    if (!dueDate) return "default";
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return "error";
    if (diffHours < 24) return "warning";
    return "default";
  };

  if (quizzes.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 8,
          color: "#666",
        }}
      >
        <Typography variant="h6">No quizzes available yet</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {quizzes.map((quiz) => {
        const isExpired = isQuizExpired(quiz.dueDate);
        const dueDateText = formatDueDate(quiz.dueDate);
        const dueDateColor = getDueDateColor(quiz.dueDate);

        return (
          <Grid item xs={12} sm={6} md={4} key={quiz._id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s",
                opacity: isExpired ? 0.6 : 1,
                border: isExpired ? "2px solid #f44336" : "none",
                "&:hover": {
                  transform: isExpired ? "none" : "translateY(-4px)",
                  boxShadow: isExpired 
                    ? "none" 
                    : "0 4px 20px rgba(236, 117, 16, 0.2)",
                },
                cursor: !isTeacher && onStartQuiz && !isExpired ? "pointer" : "default",
              }}
              onClick={() => !isTeacher && onStartQuiz && !isExpired && onStartQuiz(quiz._id)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: isExpired ? "#666" : "#B90000",
                      fontWeight: 600,
                      fontSize: "18px",
                      flex: 1,
                    }}
                  >
                    {quiz.title}
                  </Typography>
                  {isTeacher && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="View Questions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewQuestions?.(quiz._id);
                          }}
                          sx={{ color: "#1976d2" }}
                        >
                          <ListIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Statistics">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewStats?.(quiz._id);
                          }}
                        >
                          <AssessmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(quiz);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(quiz._id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>

                {/* ✅ ADDED: Expired Badge */}
                {isExpired && (
                  <Chip
                    icon={<WarningIcon />}
                    label="EXPIRED"
                    color="error"
                    size="small"
                    sx={{ mb: 2, fontWeight: 600 }}
                  />
                )}

                {quiz.description && (
                  <Typography
                    variant="body2"
                    sx={{ color: "#666", mb: 2, minHeight: "40px" }}
                  >
                    {quiz.description}
                  </Typography>
                )}

                {/* Chapter Info */}
                <Box sx={{ mb: 2 }}>
                  {quiz.coversAllChapters ? (
                    <Chip
                      label="All Chapters"
                      size="small"
                      sx={{ 
                        backgroundColor: "#E3F2FD",
                        color: "#1976d2",
                        fontWeight: 500,
                      }}
                    />
                  ) : quiz.chapterIds && quiz.chapterIds.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "#666", mr: 0.5 }}>
                        Chapters:
                      </Typography>
                      <Chip
                        label={`${quiz.chapterIds.length} selected`}
                        size="small"
                        sx={{ backgroundColor: "#FFF5E6" }}
                      />
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  <Chip
                    icon={<QuestionIcon />}
                    label={`${quiz.totalQuestions} questions`}
                    size="small"
                    sx={{ backgroundColor: "#FFF5E6" }}
                  />
                  {quiz.durationMinutes && (
                    <Chip
                      icon={<TimerIcon />}
                      label={`${quiz.durationMinutes} mins`}
                      size="small"
                      sx={{ backgroundColor: "#FFF5E6" }}
                    />
                  )}
                  
                  {/* ✅ ADDED: Due Date Chip */}
                  {quiz.dueDate && (
                    <Chip
                      icon={<EventIcon />}
                      label={dueDateText}
                      color={dueDateColor}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                  
                  <Chip
                    label={quiz.isActive ? "Active" : "Inactive"}
                    size="small"
                    color={quiz.isActive ? "success" : "default"}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default QuizList;
