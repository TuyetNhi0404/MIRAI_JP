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
      setError("Please select at least one file");
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
        setSuccess("Resubmitted successfully!");
      } else {
        await submissionService.submitAssignment(assignment._id, formData);
        setSuccess("Submitted successfully!");
      }

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || "An error occurred while submitting";
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
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
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
          {mode === "view" ? "Assignment Submission Details" : mode === "resubmit" ? "Resubmit Assignment" : "Submit Assignment"}
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
            Course: {assignment.courseName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Due: {formatDate(assignment.dueDate)}
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
               File Attachments  ({assignment.fileUrls.length})
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
                  Your Submission
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={submission.status.toUpperCase()}
                    size="small"
                    color={getStatusColor(submission.status)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Submitted on {formatDate(submission.submittedAt)}
                  </Typography>
                </Box>
              </Box>

              {submission.status === "graded" && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Score: {submission.score} / {assignment.maxScore}
                  </Typography>
                  {submission.feedback && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Feedback: {submission.feedback}
                    </Typography>
                  )}
                </Alert>
              )}

              {submission.files && submission.files.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Your Submitted Files ({submission.files.length})
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
                    Your Note
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {submission.note}
                  </Typography>
                </Box>
              )}
            </Box>

            {isGraded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This assignment has been graded. You cannot resubmit.
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
                    Resubmit Assignment
                  </Button>
                </Box>
              </>
            )}

            {isAssignmentClosed && !isGraded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This assignment is closed. You cannot resubmit.
              </Alert>
            )}
          </>
        )}

        {(mode === "submit" || mode === "resubmit") && (
          <>
            {mode === "resubmit" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You are resubmitting this assignment. Your previous submission will be replaced.
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
                Upload files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click to browse or drag and drop files here
              </Typography>
            </Box>

            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({selectedFiles.length})
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
                label="Note (Optional)"
                placeholder="Add a note for your teacher..."
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
          {mode === "view" ? "Close" : "Cancel"}
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
            Resubmit
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
                Uploading...
              </>
            ) : mode === "resubmit" ? (
              "Resubmit"
            ) : (
              "Submit"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SubmissionUploadModal;
