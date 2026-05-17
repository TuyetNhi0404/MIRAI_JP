// src/pages/Teacher/ChapterQuestionsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Slide,
  AlertTitle,
} from "@mui/material";
import {
  Add as Plus,
  Edit,
  Delete as Trash2,
  Search,
  Upload,
  ArrowBack as ArrowLeft,
  HelpOutline as HelpCircle,
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../redux/store";
import {
  fetchQuestionsByChapter,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  setSelectedChapter,
  clearError,
} from "../../redux/slices/questionSlice";
import QuestionModal from "../../components/question/QuestionModal";
import UploadExcelModal from "../../components/question/UploadExcelModal";
import type { IQuestion, CreateQuestionPayload } from "../../types/question.types";

const ChapterQuestionsPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { chapters, questions, selectedChapter, loading, error } = useSelector(
    (state: RootState) => state.question
  );

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (chapterId) {
      const chapter = chapters.find((c) => c._id === chapterId);
      if (chapter) {
        dispatch(setSelectedChapter(chapter));
        dispatch(fetchQuestionsByChapter(chapterId));
      }
    }
  }, [chapterId, chapters, dispatch]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const filteredQuestions = questions.filter((q) =>
    q.questionText.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const handleQuestionSubmit = async (data: Omit<CreateQuestionPayload, "chapterId">) => {
    try {
      if (editingQuestion) {
        await dispatch(updateQuestion({ id: editingQuestion._id, payload: data })).unwrap();
        setSuccessMsg("Question updated successfully");
      } else {
        if (!chapterId) return;
        const createPayload: CreateQuestionPayload = {
          ...data,
          chapterId,
        };
        await dispatch(createQuestion(createPayload)).unwrap();
        setSuccessMsg("Question created successfully");
      }
      setEditingQuestion(null);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (question: IQuestion) => {
    if (window.confirm("Delete this question?")) {
      try {
        await dispatch(deleteQuestion(question._id)).unwrap();
        setSuccessMsg("Question deleted successfully");
      } catch (err: unknown) {
        console.error(err);
      }
    }
  };

  const handleUploadSuccess = () => {
    if (chapterId) {
      dispatch(fetchQuestionsByChapter(chapterId));
      setSuccessMsg("Questions imported successfully");
    }
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  if (!selectedChapter) {
    return (
      <Box sx={{ textAlign: "center", py: 5 }}>
        <Typography color="text.secondary">Loading chapter...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate("/dashboard/teacher/questions")}
          sx={{
            color: "#B90000",
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Question Bank
        </Link>
        <Typography variant="body2" color="text.primary">
          {selectedChapter.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 3 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Button
              variant="text"
              startIcon={<ArrowLeft fontSize="small" />}
              onClick={() => navigate("/dashboard/teacher/questions")}
              sx={{ color: "#B90000", mb: 1 }}
            >
              Back to Chapters
            </Button>
          </Box>
          <Typography variant="h4" fontWeight={700} color="#B90000">
            {selectedChapter.name}
          </Typography>
          {selectedChapter.description && (
            <Typography variant="body2" color="text.secondary">
              {selectedChapter.description}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Total Questions: {questions.length}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Upload fontSize="small" />}
            onClick={() => setUploadModalOpen(true)}
            sx={{ borderColor: "#B90000", color: "#B90000" }}
          >
            Import Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus fontSize="small" />}
            onClick={() => {
              setEditingQuestion(null);
              setQuestionModalOpen(true);
            }}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
          >
            Add Question
          </Button>
        </Box>
      </Box>

      {/* Error Alert - Improved Design */}
      {error && (
        <Alert 
          severity="error" 
          onClose={handleClearError} 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(211, 47, 47, 0.15)",
            "& .MuiAlert-icon": {
              fontSize: 28
            }
          }}
          icon={<ErrorIcon fontSize="inherit" />}
        >
          <AlertTitle sx={{ fontWeight: 600, fontSize: "1rem" }}>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Search questions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3, maxWidth: 500 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {/* Questions List */}
      {loading && questions.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <Typography color="text.secondary">Loading questions...</Typography>
        </Box>
      ) : filteredQuestions.length === 0 ? (
        <Card sx={{ p: 5, textAlign: "center" }}>
          <HelpCircle sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {debouncedSearchQuery ? "No questions match your search" : "No questions yet"}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {debouncedSearchQuery
              ? "Try different search terms"
              : "Add questions to this chapter or import from Excel"}
          </Typography>
          {!debouncedSearchQuery && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="outlined"
                startIcon={<Upload fontSize="small" />}
                onClick={() => setUploadModalOpen(true)}
                sx={{ borderColor: "#B90000", color: "#B90000" }}
              >
                Import Excel
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus fontSize="small" />}
                onClick={() => setQuestionModalOpen(true)}
                sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
              >
                Add Question
              </Button>
            </Box>
          )}
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredQuestions.map((question, index) => (
            <Card key={question._id} sx={{ p: 3, border: "1px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="body2" fontWeight={600} color="#B90000">
                  Question #{index + 1}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingQuestion(question);
                      setQuestionModalOpen(true);
                    }}
                    sx={{
                      "&:hover": {
                        bgcolor: "#FFF5E6",
                        color: "#B90000",
                      },
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteQuestion(question)}
                    sx={{
                      "&:hover": {
                        bgcolor: "#ffebee",
                        color: "#d32f2f",
                      },
                    }}
                  >
                    <Trash2 fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="body1" fontWeight={500} mb={2}>
                {question.questionText}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[1, 2, 3, 4].map((num) => (
                  <Box
                    key={num}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: question.correctAnswer === num ? "#e8f5e9" : "#f5f5f5",
                      border:
                        question.correctAnswer === num
                          ? "2px solid #4caf50"
                          : "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        minWidth: 24,
                        color: question.correctAnswer === num ? "#2e7d32" : "inherit",
                      }}
                    >
                      {num}.
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        color: question.correctAnswer === num ? "#2e7d32" : "inherit",
                      }}
                    >
                      {question[`answer${num}` as keyof IQuestion] as string}
                    </Typography>
                    {question.correctAnswer === num && (
                      <Chip
                        label="Correct Answer"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Modals */}
      <QuestionModal
        open={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleQuestionSubmit}
        question={editingQuestion}
      />

      <UploadExcelModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        chapterId={chapterId || ""}
        onSuccess={handleUploadSuccess}
      />

      {/* Success Snackbar - Improved Design */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSuccessMsg("")}
          severity="success"
          variant="filled"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{
            minWidth: 300,
            boxShadow: "0 8px 24px rgba(46, 125, 50, 0.25)",
            borderRadius: 2,
            "& .MuiAlert-icon": {
              fontSize: 28
            }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>Success</AlertTitle>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChapterQuestionsPage;
