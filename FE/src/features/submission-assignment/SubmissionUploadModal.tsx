import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Divider,
  Chip,
} from "@mui/material";
import {
  X,
  CloudUpload,
  Trash2,
  FileText,
  Download,
  Edit,
} from "lucide-react";
import { submissionService } from "../../services/submissionService";
import type { AssignmentWithSubmission } from "../../types/submission.types";
import { format } from "date-fns";

interface SubmissionUploadModalProps {
  open: boolean;
  onClose: () => void;
  assignment: AssignmentWithSubmission | null;
  onSuccess: () => void;
}

interface SubmissionFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

const SubmissionUploadModal: React.FC<SubmissionUploadModalProps> = ({
  open,
  onClose,
  assignment,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"view" | "submit" | "resubmit">("submit");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submission = assignment?.submission;
  const isSubmitted = submission !== null && submission !== undefined;
  const isGraded = submission?.status === "graded";
  const isAssignmentClosed = assignment?.status === "closed";

  useEffect(() => {
    if (assignment) {
      if (isSubmitted) {
        setMode("view");
      } else {
        setMode("submit");
      }
      
      setSelectedFiles([]);
      setNote("");
      setError(null);
      setSuccess(null);
    }
  }, [assignment, open, isSubmitted]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!assignment) return;

    if (selectedFiles.length === 0) {
      setError("Vui lòng chọn ít nhất một tệp tin");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      if (mode === "resubmit" && submission?._id) {
        await submissionService.updateSubmission(submission._id, formData);
        setSuccess("Nộp lại bài tập thành công!");
      } else {
        await submissionService.submitAssignment(assignment._id, formData);
        setSuccess("Nộp bài tập thành công!");
      }

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || "Có lỗi xảy ra trong quá trình nộp bài";
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setNote("");
    setError(null);
    setSuccess(null);
    setMode("submit");
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'lúc' HH:mm");
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded":
        return "primary";
      case "late":
        return "warning";
      case "submitted":
        return "success";
      default:
        return "default";
    }
  };

  if (!assignment) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #B90000",
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {mode === "view" ? "Chi tiết bài nộp" : mode === "resubmit" ? "Nộp lại bài tập" : "Nộp bài tập"}
        </Typography>
        <IconButton onClick={handleClose} size="small" disabled={uploading}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {assignment.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Khóa học: {assignment.courseName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hạn nộp: {formatDate(assignment.dueDate)}
          </Typography>
          {assignment.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {assignment.description}
            </Typography>
          )}
        </Box>

        {assignment.fileUrls && assignment.fileUrls.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: "#B90000" }}>
             Tệp đính kèm  ({assignment.fileUrls.length})
            </Typography>
            <List dense>
              {assignment.fileUrls.map((fileUrl: string, index: number) => {
                const fileName = fileUrl.split('/').pop() || `file-${index + 1}`;
                return (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDownloadFile(fileUrl, fileName)}
                        sx={{ color: "#B90000" }}
                      >
                        <Download size={18} />
                      </IconButton>
                    }
                    sx={{
                      border: "1px solid #FFE8CC",
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: "#FFF5E6",
                    }}
                  >
                    <ListItemIcon>
                      <FileText size={20} color="#B90000" />
                    </ListItemIcon>
                    <ListItemText
                      primary={fileName}
                      primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 500 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

        {mode === "view" && submission && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Bài nộp của bạn
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={submission.status.toUpperCase()}
                    size="small"
                    color={getStatusColor(submission.status)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Đã nộp vào {formatDate(submission.submittedAt)}
                  </Typography>
                </Box>
              </Box>

              {submission.status === "graded" && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Điểm số: {submission.score} / {assignment.maxScore}
                  </Typography>
                  {submission.feedback && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Phản hồi: {submission.feedback}
                    </Typography>
                  )}
                </Alert>
              )}

              {submission.files && submission.files.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Các tệp đã nộp ({submission.files.length})
                  </Typography>
                  <List dense>
                    {submission.files.map((file: string | SubmissionFile, index: number) => {
                      const fileUrl = typeof file === "string" ? file : file.fileUrl;
                      const fileName = typeof file === "string" 
                        ? file.split('/').pop() || 'file' 
                        : file.fileName;
                      const fileSize = typeof file === "string" ? 0 : file.fileSize;

                      return (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleDownloadFile(fileUrl, fileName)}
                              sx={{ color: "#B90000" }}
                            >
                              <Download size={18} />
                            </IconButton>
                          }
                          sx={{
                            border: "1px solid #e0e0e0",
                            borderRadius: 1,
                            mb: 1,
                            backgroundColor: "white",
                          }}
                        >
                          <ListItemIcon>
                            <FileText size={20} color="#B90000" />
                          </ListItemIcon>
                          <ListItemText
                            primary={fileName}
                            secondary={fileSize > 0 ? formatFileSize(fileSize) : ""}
                            primaryTypographyProps={{ fontSize: "0.9rem" }}
                            secondaryTypographyProps={{ fontSize: "0.75rem" }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {submission.note && (
                <Box sx={{ p: 2, backgroundColor: "#FFFBF0", borderRadius: 1, border: "1px solid #FFE8CC" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ghi chú của bạn
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {submission.note}
                  </Typography>
                </Box>
              )}
            </Box>

            {isGraded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Bài tập này đã được chấm điểm. Bạn không thể nộp lại.
              </Alert>
            )}

            {!isGraded && !isAssignmentClosed && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: "center" }}>
                  <Button
                    variant="outlined"
                    startIcon={<Edit size={18} />}
                    onClick={() => setMode("resubmit")}
                    sx={{
                      borderColor: "#B90000",
                      color: "#B90000",
                      "&:hover": {
                        borderColor: "#D66410",
                        backgroundColor: "#FFF5E6",
                      },
                    }}
                  >
                    Nộp lại bài tập
                  </Button>
                </Box>
              </>
            )}

            {isAssignmentClosed && !isGraded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Hạn nộp bài tập đã đóng. Bạn không thể nộp lại.
              </Alert>
            )}
          </>
        )}

        {(mode === "submit" || mode === "resubmit") && (
          <>
            {mode === "resubmit" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Bạn đang nộp lại bài tập này. Bài nộp trước đó sẽ bị ghi đè.
              </Alert>
            )}

            <Box
              sx={{
                border: "2px dashed #B90000",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                backgroundColor: "#FFFBF0",
                cursor: uploading ? "not-allowed" : "pointer",
                "&:hover": {
                  backgroundColor: uploading ? "#FFFBF0" : "#FFF5E6",
                },
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileSelect}
                accept="*/*"
                disabled={uploading}
              />
              <CloudUpload
                size={48}
                color="#B90000"
                style={{ marginBottom: 8 }}
              />
              <Typography variant="body1" fontWeight={500} gutterBottom>
                Tải tệp lên
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Nhấp để chọn tệp hoặc kéo thả tệp vào đây
              </Typography>
            </Box>

            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Các tệp đã chọn ({selectedFiles.length})
                </Typography>
                <List dense>
                  {selectedFiles.map((file, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          disabled={uploading}
                          sx={{ color: "#d32f2f" }}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      }
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: "white",
                      }}
                    >
                      <ListItemIcon>
                        <FileText size={20} color="#B90000" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={formatFileSize(file.size)}
                        primaryTypographyProps={{ fontSize: "0.9rem" }}
                        secondaryTypographyProps={{ fontSize: "0.75rem" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Ghi chú (Tùy chọn)"
                placeholder="Thêm ghi chú cho giáo viên của bạn..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={uploading}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          disabled={uploading}
        >
          {mode === "view" ? "Đóng" : "Hủy"}
        </Button>
        
        {mode === "view" && !isAssignmentClosed && !isGraded && (
          <Button
            onClick={() => setMode("resubmit")}
            variant="contained"
            startIcon={<Edit size={18} />}
            sx={{
              backgroundColor: "#B90000",
              "&:hover": { backgroundColor: "#D66410" },
            }}
          >
            Nộp lại
          </Button>
        )}

        {(mode === "submit" || mode === "resubmit") && (
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || selectedFiles.length === 0}
            sx={{
              backgroundColor: "#B90000",
              "&:hover": { backgroundColor: "#D66410" },
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: "white" }} />
                Đang tải lên...
              </>
            ) : mode === "resubmit" ? (
              "Nộp lại"
            ) : (
              "Nộp bài"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SubmissionUploadModal;
