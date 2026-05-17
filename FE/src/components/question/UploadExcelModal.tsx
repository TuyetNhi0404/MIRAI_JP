// src/components/question/UploadExcelModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  AlertTitle,
  LinearProgress,
} from "@mui/material";
import { Upload, TableChart, ErrorOutline, CheckCircle } from "@mui/icons-material";
import questionService from "../../services/question.service";

interface UploadExcelModalProps {
  open: boolean;
  onClose: () => void;
  chapterId: string;
  onSuccess: () => void;
}

const UploadExcelModal: React.FC<UploadExcelModalProps> = ({
  open,
  onClose,
  chapterId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please select a valid Excel file (.xls or .xlsx)");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const result = await questionService.uploadQuestionsExcel(chapterId, file);
      setUploadSuccess(result.count);
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
        setFile(null);
        setUploadSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setError(null);
      setUploadSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "#B90000", color: "white", pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Upload />
          <Typography variant="h6" fontWeight={600}>
            Upload Questions from Excel
          </Typography>
        </Box>
      </DialogTitle>
      
      {loading && <LinearProgress sx={{ bgcolor: "#FFE5CC", "& .MuiLinearProgress-bar": { bgcolor: "#B90000" } }} />}
      
      <DialogContent>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Info Alert */}
          <Alert 
            severity="info" 
            sx={{ 
              fontSize: "0.9rem",
              borderRadius: 2,
              "& .MuiAlert-icon": {
                fontSize: 24
              }
            }}
          >
            <AlertTitle sx={{ fontWeight: 600, mb: 1 }}>Excel Format Requirements</AlertTitle>
            <Typography variant="body2" component="div">
              <strong>Standard columns:</strong> question_text, answer_1, answer_2, answer_3, answer_4, correct_answer (1-4)
              <br />
              <strong>Alternative columns:</strong> Question, A, B, C, D, Answer
            </Typography>
          </Alert>

          {/* Upload Area */}
          <Box
            sx={{
              border: "2px dashed #B90000",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              bgcolor: "#FFF5E6",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              "&:hover": { 
                bgcolor: loading ? "#FFF5E6" : "#FFE5CC",
                transform: loading ? "none" : "scale(1.02)"
              },
            }}
          >
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="excel-upload"
              disabled={loading}
            />
            <label htmlFor="excel-upload" style={{ cursor: loading ? "not-allowed" : "pointer" }}>
              {file ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                  <TableChart sx={{ fontSize: 32, color: "#B90000" }} />
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="body1" fontWeight={600} color="#B90000">
                      {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(file.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Upload sx={{ fontSize: 48, color: "#B90000", mb: 1 }} />
                  <Typography variant="h6" color="#B90000" fontWeight={600} gutterBottom>
                    Click to select Excel file
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports .xls and .xlsx formats
                  </Typography>
                </Box>
              )}
            </label>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              icon={<ErrorOutline fontSize="inherit" />}
              sx={{ 
                borderRadius: 2,
                "& .MuiAlert-icon": {
                  fontSize: 24
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600 }}>Upload Failed</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {uploadSuccess !== null && (
            <Alert 
              severity="success" 
              icon={<CheckCircle fontSize="inherit" />}
              sx={{ 
                borderRadius: 2,
                bgcolor: "#e8f5e9",
                "& .MuiAlert-icon": {
                  fontSize: 24,
                  color: "#2e7d32"
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, color: "#2e7d32" }}>Upload Successful!</AlertTitle>
              <Typography variant="body2" color="#2e7d32">
                Successfully imported <strong>{uploadSuccess}</strong> questions
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ 
            color: "#666",
            "&:hover": { bgcolor: "#f5f5f5" }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || loading || uploadSuccess !== null}
          startIcon={loading ? null : <Upload />}
          sx={{
            bgcolor: "#B90000",
            minWidth: 120,
            transition: "all 0.2s ease",
            "&:hover": { 
              bgcolor: "#d66609",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(236, 117, 16, 0.3)"
            },
            "&:disabled": {
              bgcolor: "#ccc"
            }
          }}
        >
          {loading ? "Uploading..." : uploadSuccess !== null ? "Uploaded" : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadExcelModal;
