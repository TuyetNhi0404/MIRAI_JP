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
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
  Paper,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useEnrollment } from "../../hooks/useEnrollment";
import type { CVInfo, Course } from "../../types/enrollment.types";

interface RegisterFormProps {
  selectedCourse?: Course | null;
  courses?: Course[];
  onClose?: () => void;
  onStepChange?: (step: "manual" | "review") => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  selectedCourse = null,
  courses: coursesProp,
  onClose,
  onStepChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isSmallMobile = useMediaQuery("(max-width:400px)");

  const {
    loading,
    error,
    enrollCourse,
    clearUploadedCV,
    clearError,
  } = useEnrollment();

  const [step, setStep] = useState<"manual" | "review">("manual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [courseId, setCourseId] = useState(selectedCourse?._id || "");
  const [courses, setCourses] = useState<Course[]>(coursesProp || []);
  const [formData, setFormData] = useState<CVInfo>({
    name: "",
    email: "",
    birthday: "",
    phone: "",
    education: {
      institution: "",
      period: "",
      major: "",
      gpa: "",
    },
    experience: "",
    skills: [],
    certifications: [],
    projects: [],
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const parseProjectsString = (projectsInput: string | { name: string; description: string }[]): { name: string; description: string }[] => {
    if (Array.isArray(projectsInput)) {
      return projectsInput.map(p => {
        if (typeof p === 'object' && p !== null && 'name' in p) {
          return {
            name: String(p.name || ''),
            description: String(p.description || '')
          };
        }
        return { name: '', description: '' };
      });
    }

    if (typeof projectsInput === 'string' && projectsInput.trim()) {
      const projectLines = projectsInput
        .split(/\.\s+(?=[A-Z])|[\n\r]+/)
        .filter(line => line.trim().length > 0);

      return projectLines.map((line, index) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          return {
            name: line.substring(0, colonIndex).trim(),
            description: line.substring(colonIndex + 1).trim()
          };
        }
        return {
          name: `Project ${index + 1}`,
          description: line.trim()
        };
      });
    }

    return [];
  };

  // ✅ FIX: Chuyển string thành array
  const convertStringToArray = (value: string | string[] | undefined): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(",")
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    }
    return [];
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!courseId) {
      errors.courseId = "Please choose a course";
    }

    if (formData.birthday) {
      const birthdayRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!birthdayRegex.test(formData.birthday)) {
        errors.birthday = "Date of birth is invalid (DD/MM/YYYY)";
      }
    }

    if (formData.education?.gpa) {
      const gpaNum = parseFloat(formData.education.gpa);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.0) {
        errors.gpa = "GPA must be between 0.0 and 4.0";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    if (error) clearError();
  };

  useEffect(() => {
    if (!coursesProp || coursesProp.length === 0) {
      const fetchCourses = async () => {
        try {
          const res = await fetch("http://localhost:5000/api/courses/available");
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

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);




  const handleManualSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // ✅ FIX: Đảm bảo data đúng format trước khi gửi
    const submitData: CVInfo = {
      ...formData,
      skills: convertStringToArray(formData.skills),
      certifications: convertStringToArray(formData.certifications),
      projects: parseProjectsString(formData.projects || []),
    };

    const result = await enrollCourse({ courseId, cvInfo: submitData });

    if (result.success) {
      setSuccessMessage("Registration successful! Please wait for admin approval.");
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleReviewSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // ✅ FIX: Normalize data trước khi submit
    const submitData: CVInfo = {
      ...formData,
      skills: convertStringToArray(formData.skills),
      certifications: convertStringToArray(formData.certifications),
      projects: parseProjectsString(formData.projects || []),
    };

    console.log("📤 Submitting data:", JSON.stringify(submitData, null, 2));

    const result = await enrollCourse({
      courseId,
      cvInfo: submitData,
      file: selectedFile || undefined,
    });

    if (result.success) {
      setSuccessMessage("Registration successful! Please wait for admin approval.");
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    clearUploadedCV();
    clearError();
    setValidationErrors({});
    setStep("manual");
    setSelectedFile(null);
    setFormData({
      name: "",
      email: "",
      birthday: "",
      phone: "",
      education: { institution: "", period: "", major: "", gpa: "" },
      experience: "",
      skills: [],
      certifications: [],
      projects: [],
    });
    setSuccessMessage("");

    if (onClose) {
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string | string[] | { name: string; description: string }[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleEducationChange = (field: keyof NonNullable<CVInfo['education']>, value: string) => {
    setFormData((prev) => ({
      ...prev,
      education: {
        ...(prev.education || { institution: "", period: "", major: "", gpa: "" }),
        [field]: value
      },
    }));
    clearFieldError(field);
  };

  const handleArrayInputChange = (field: "skills" | "certifications", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value // Keep as string for now, will convert on submit
    }));
  };

  const handleProjectChange = (index: number, field: 'name' | 'description', value: string) => {
    const newProjects = [...(formData.projects || [])];
    newProjects[index] = { ...newProjects[index], [field]: value };
    handleInputChange("projects", newProjects);
  };

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100%",
        overflow: { xs: "auto", md: "hidden" },
      }}
    >
      {onClose && (
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 10 },
            right: { xs: 8, sm: 10 },
            zIndex: 10,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
            },
          }}
        >
          <Close />
        </IconButton>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: { xs: "visible", md: "auto" },
          p: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 1, sm: 2 },
        }}
      >
        <Typography
          variant={isMobile ? "h6" : "h5"}
          fontWeight="bold"
          color="#023665"
          mb={{ xs: 2, sm: 3 }}
          pr={{ xs: 4, sm: 0 }}
        >
          {step === "manual"
              ? "Enter information manually"
              : "Verify information"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            {successMessage}
          </Alert>
        )}


        {/* Step 2: Manual Input */}
        {step === "manual" && (
          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            <TextField
              select
              fullWidth
              label="Choose course"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                clearFieldError("courseId");
              }}
              disabled={!!selectedCourse}
              size={isMobile ? "small" : "medium"}
              error={!!validationErrors.courseId}
              helperText={validationErrors.courseId}
              required
            >
              {courses.length === 0 ? (
                <MenuItem disabled>Loading course...</MenuItem>
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
              label="Full name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              size={isMobile ? "small" : "medium"}
              required
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              size={isMobile ? "small" : "medium"}
              required
            />
          </Stack>
        )}

        {/* Step 3: Review Full Info */}
        {step === "review" && (
          <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                select
                disabled={!!selectedCourse}
                size="small"
                error={!!validationErrors.courseId}
                helperText={validationErrors.courseId}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                size="small"
                multiline={!isSmallMobile}
                maxRows={2}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                size="small"
                multiline={!isSmallMobile}
                maxRows={2}
                required
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <TextField
                fullWidth
                label="Phone number"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                size="small"
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date of birth"
                value={formData.birthday || ""}
                onChange={(e) => handleInputChange("birthday", e.target.value)}
                size="small"
                placeholder="DD/MM/YYYY"
                error={!!validationErrors.birthday}
                helperText={validationErrors.birthday}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Institution"
                value={formData.education?.institution || ""}
                onChange={(e) => handleEducationChange("institution", e.target.value)}
                size="small"
                multiline={!isSmallMobile}
                maxRows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Major"
                value={formData.education?.major || ""}
                onChange={(e) => handleEducationChange("major", e.target.value)}
                size="small"
                multiline={!isSmallMobile}
                maxRows={2}
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <TextField
                fullWidth
                label="Period"
                placeholder="2020-2025"
                value={formData.education?.period || ""}
                onChange={(e) => handleEducationChange("period", e.target.value)}
                size="small"
              />
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <TextField
                fullWidth
                label="GPA (0.0 - 4.0)"
                value={formData.education?.gpa || ""}
                onChange={(e) => handleEducationChange("gpa", e.target.value)}
                size="small"
                error={!!validationErrors.gpa}
                helperText={validationErrors.gpa}
                placeholder="3.5"
              />
            </Grid>

            <Grid item xs={12} sm={12} md={7}>
              <TextField
                fullWidth
                label="Certificates (comma separated)"
                multiline
                rows={1}
                value={
                  Array.isArray(formData.certifications)
                    ? formData.certifications.join(", ")
                    : (formData.certifications || "")
                }
                onChange={(e) => handleArrayInputChange("certifications", e.target.value)}
                size="small"
                placeholder="AWS Certified, Google Cloud"
              />
            </Grid>

            <Grid item xs={12} sm={12} md={5}>
              <TextField
                fullWidth
                label="Skills (separated by commas)"
                multiline
                rows={1}
                value={
                  Array.isArray(formData.skills)
                    ? formData.skills.join(", ")
                    : (formData.skills || "")
                }
                onChange={(e) => handleArrayInputChange("skills", e.target.value)}
                size="small"
                placeholder="React, Node.js, TypeScript"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Experience"
                multiline
                rows={isMobile ? 3 : 2}
                value={formData.experience || ""}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                size="small"
              />
            </Grid>

            {formData.projects && formData.projects.length > 0 && (
              <>
                {formData.projects.map((project, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        bgcolor: "#f5f5f5",
                        borderRadius: 1,
                        border: "1px solid #e0e0e0",
                      }}
                    >
                      <TextField
                        fullWidth
                        label={`Projects ${index + 1}`}
                        value={project.name}
                        onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                        size="small"
                        multiline
                        minRows={1}
                        maxRows={3}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        value={project.description}
                        onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                        multiline
                        minRows={isMobile ? 2 : 3}
                        maxRows={6}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                ))}
              </>
            )}
          </Grid>
        )}
      </Box>

      {(step === "manual" || step === "review") && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            pt: { xs: 1.5, sm: 2 },
            borderTop: "1px solid #eee",
            backgroundColor: "white",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <Button
            fullWidth
            variant="contained"
            onClick={step === "manual" ? handleManualSubmit : handleReviewSubmit}
            disabled={loading}
            size={isMobile ? "medium" : "large"}
            sx={{
              backgroundColor: "#B90000",
              "&:hover": { backgroundColor: "#d66a0d" },
              py: { xs: 1.2, sm: 1.5 },
              fontSize: { xs: "0.875rem", sm: "1rem" },
              fontWeight: "bold",
              boxShadow: 2,
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Confirm enrollment"
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default RegisterForm;
