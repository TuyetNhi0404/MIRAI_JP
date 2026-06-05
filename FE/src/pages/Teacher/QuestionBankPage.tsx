// src/pages/Teacher/QuestionBankPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  IconButton,
  Alert,
  Snackbar,
  CardContent,
  CardActions,
  Slide,
  AlertTitle,
} from "@mui/material";
import {
  Add as Plus,
  Edit,
  Delete as Trash2,
  MenuBook as BookOpen,
  ArrowForward as ArrowRight,
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../redux/store";
import {
  fetchChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  clearError,
} from "../../redux/slices/questionSlice";
import ChapterModal from "../../components/question/ChapterModal";
import type { IChapter } from "../../types/question.types";

const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { chapters, loading, error } = useSelector((state: RootState) => state.question);

  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<IChapter | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    dispatch(fetchChapters());
  }, [dispatch]);

  const handleChapterSubmit = async (data: { name: string; description?: string }) => {
    try {
      if (editingChapter) {
        await dispatch(updateChapter({ id: editingChapter._id, payload: data })).unwrap();
        setSuccessMsg("Cập nhật chương thành công");
      } else {
        await dispatch(createChapter(data)).unwrap();
        setSuccessMsg("Tạo chương thành công");
      }
      setEditingChapter(null);
    } catch (err) {
      const error = err as Error;
      console.error(error);
    }
  };

  const handleDeleteChapter = async (chapter: IChapter) => {
    if (
      window.confirm(
        `Xóa chương "${chapter.name}"? Tất cả câu hỏi trong chương này cũng sẽ bị xóa.`
      )
    ) {
      try {
        await dispatch(deleteChapter(chapter._id)).unwrap();
        setSuccessMsg("Xóa chương thành công");
      } catch (err) {
        const error = err as Error;
        console.error(error);
      }
    }
  };

  const handleViewQuestions = (chapterId: string) => {
    navigate(`/dashboard/teacher/questions/${chapterId}`);
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#B90000">
            Ngân hàng câu hỏi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý các chương và câu hỏi cho khóa học của bạn
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus fontSize="small" />}
          onClick={() => {
            setEditingChapter(null);
            setChapterModalOpen(true);
          }}
          sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
        >
          Chương mới
        </Button>
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
          <AlertTitle sx={{ fontWeight: 600, fontSize: "1rem" }}>Lỗi</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Chapters Grid */}
      {loading && chapters.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <Typography color="text.secondary">Đang tải danh sách chương...</Typography>
        </Box>
      ) : chapters.length === 0 ? (
        <Card sx={{ p: 5, textAlign: "center" }}>
          <BookOpen sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có chương nào
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Tạo chương đầu tiên để bắt đầu thêm câu hỏi
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus fontSize="small" />}
            onClick={() => setChapterModalOpen(true)}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
          >
            Tạo chương
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {chapters.map((chapter) => (
            <Grid item xs={12} sm={6} md={4} key={chapter._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "start", gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        bgcolor: "#FFF5E6",
                        p: 1.5,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BookOpen sx={{ fontSize: 24, color: "#B90000" }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {chapter.name}
                      </Typography>
                      {chapter.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {chapter.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingChapter(chapter);
                        setChapterModalOpen(true);
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
                      onClick={() => handleDeleteChapter(chapter)}
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

                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<ArrowRight fontSize="small" />}
                    onClick={() => handleViewQuestions(chapter._id)}
                    sx={{
                      bgcolor: "#B90000",
                      "&:hover": { bgcolor: "#d66609" },
                    }}
                  >
                    Xem câu hỏi
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chapter Modal */}
      <ChapterModal
        open={chapterModalOpen}
        onClose={() => {
          setChapterModalOpen(false);
          setEditingChapter(null);
        }}
        onSubmit={handleChapterSubmit}
        chapter={editingChapter}
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
          <AlertTitle sx={{ fontWeight: 600 }}>Thành công</AlertTitle>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuestionBankPage;
