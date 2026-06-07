// src/components/enrollment/RegisterForm.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  IconButton,
  Stack,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useEnrollment } from "../../hooks/useEnrollment";
import { getApiBaseUrl } from "../../utils/apiBase";
import type { Course } from "../../types/enrollment.types";

interface RegisterFormProps {
  selectedCourse?: Course | null;
  courses?: Course[];
  onClose?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  selectedCourse = null,
  courses: coursesProp,
  onClose,
}) => {
  const {
    loading,
    error,
    enrollCourse,
    clearError,
  } = useEnrollment();

  const [courseId, setCourseId] = useState(selectedCourse?._id || "");
  const [courses, setCourses] = useState<Course[]>(coursesProp || []);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!coursesProp || coursesProp.length === 0) {
      const fetchCourses = async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/courses/available`);
          const data = await res.json();
          if (data?.data) {
            setCourses(data.data);
          }
        } catch (err) {
          console.error("Error fetching courses:", err);
        }
      };
      fetchCourses();
    }
  }, [coursesProp]);

  const handleSubmit = async () => {
    if (!courseId || !studentName || !studentEmail) {
      return;
    }

    const result = await enrollCourse({ courseId, studentName, studentEmail });

    if (result.success) {
      setSuccessMessage("Đăng ký thành công! Vui lòng chờ quản trị viên phê duyệt.");
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    clearError();
    setStudentName("");
    setStudentEmail("");
    setSuccessMessage("");

    if (onClose) {
      onClose();
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100%",
        overflow: "auto",
      }}
    >
      {onClose && (
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 1)" },
          }}
        >
          <Close />
        </IconButton>
      )}

      <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h5" fontWeight="bold" color="#023665" mb={3}>
          Đăng ký khóa học
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <TextField
            select
            fullWidth
            label="Chọn khóa học"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={!!selectedCourse}
            required
          >
            {courses.length === 0 ? (
              <MenuItem disabled>Đang tải khóa học...</MenuItem>
            ) : (
              courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.name}
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            fullWidth
            label="Họ và tên"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            required
          />
        </Stack>
      </Box>

      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderTop: "1px solid #eee",
          backgroundColor: "white",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          size="large"
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0d" },
            py: 1.5,
            fontWeight: "bold",
            boxShadow: 2,
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Xác nhận đăng ký"
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default RegisterForm;
