// src/components/enrollment/EnrollmentDetailModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close, CheckCircle, Cancel } from "@mui/icons-material";
import { useEnrollment } from "../../hooks/useEnrollment";
import type { Enrollment } from "../../types/enrollment.types";

interface EnrollmentDetailModalProps {
  open: boolean;
  enrollment: Enrollment;
  onClose: () => void;
}

type CourseData = {
  _id: string;
  name: string;
  managerName?: string;
  startDate?: Date;
  endDate?: Date;
};

const EnrollmentDetailModal: React.FC<EnrollmentDetailModalProps> = ({
  open,
  enrollment,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { approveEnrollment, rejectEnrollment } = useEnrollment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const courseName = React.useMemo(() => {
    if (typeof enrollment.courseId === "object" && enrollment.courseId !== null) {
      const course = enrollment.courseId as CourseData;
      return course.name || "N/A";
    }
    return "N/A";
  }, [enrollment.courseId]);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    const result = await approveEnrollment(enrollment._id);
    if (result.success) {
      setSuccess("Application approved successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.error || "Unable to approve application");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);
    const result = await rejectEnrollment(enrollment._id);
    if (result.success) {
      setSuccess("Application rejected successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.error || "Cannot refuse application");
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "warning";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile} // Fullscreen on mobile
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? "100vh" : "90vh",
          m: isMobile ? 0 : 2
        }
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#F5F3EE",
          position: "relative",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 }
        }}
      >
        <Typography
          variant={isMobile ? "h6" : "h5"}
          fontWeight="bold"
          color="#023665"
          sx={{ pr: 5 }}
        >
          Application details
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: { xs: 4, sm: 8 },
            top: { xs: 4, sm: 8 }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ mb: 2 }}>
          <Chip
            label={getStatusLabel(enrollment.status)}
            color={getStatusColor(enrollment.status)}
            sx={{ fontWeight: "bold" }}
            size={isMobile ? "small" : "medium"}
          />
        </Box>

        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
              Course
            </Typography>
            <Typography variant="body1" fontWeight="500" fontSize={{ xs: 14, sm: 16 }}>
              {courseName}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
              Full name
            </Typography>
            <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
              {enrollment.studentName}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
              Email
            </Typography>
            <Typography
              variant="body1"
              fontSize={{ xs: 14, sm: 16 }}
              sx={{ wordBreak: 'break-word' }}
            >
              {enrollment.studentEmail}
            </Typography>
          </Grid>

          {enrollment.cvBirthday && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                Date of birth
              </Typography>
              <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                {enrollment.cvBirthday}
              </Typography>
            </Grid>
          )}

          {enrollment.cvPhone && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                Phone number
              </Typography>
              <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                {enrollment.cvPhone}
              </Typography>
            </Grid>
          )}

          {enrollment.cvEducation && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  color="#023665"
                  fontWeight="bold"
                >
                  Education
                </Typography>
              </Grid>

              {enrollment.cvEducation.institution && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                    Institution
                  </Typography>
                  <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                    {enrollment.cvEducation.institution}
                  </Typography>
                </Grid>
              )}

              {enrollment.cvEducation.period && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                    Period
                  </Typography>
                  <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                    {enrollment.cvEducation.period}
                  </Typography>
                </Grid>
              )}

              {enrollment.cvEducation.major && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                    Major
                  </Typography>
                  <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                    {enrollment.cvEducation.major}
                  </Typography>
                </Grid>
              )}

              {enrollment.cvEducation.gpa && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                    GPA
                  </Typography>
                  <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
                    {enrollment.cvEducation.gpa}
                  </Typography>
                </Grid>
              )}
            </>
          )}

          {enrollment.cvExperience && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                Experience
              </Typography>
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap" }}
                fontSize={{ xs: 14, sm: 16 }}
              >
                {enrollment.cvExperience}
              </Typography>
            </Grid>
          )}

          {enrollment.cvSkills && enrollment.cvSkills.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" mb={1} fontSize={{ xs: 12, sm: 14 }}>
                Skills
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0.5, sm: 1 } }}>
                {enrollment.cvSkills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: { xs: 11, sm: 13 } }}
                  />
                ))}
              </Box>
            </Grid>
          )}

          {enrollment.cvCertifications && enrollment.cvCertifications.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" mb={1} fontSize={{ xs: 12, sm: 14 }}>
                Certifications
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0.5, sm: 1 } }}>
                {enrollment.cvCertifications.map((cert, index) => (
                  <Chip
                    key={index}
                    label={cert}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontSize: { xs: 11, sm: 13 } }}
                  />
                ))}
              </Box>
            </Grid>
          )}

          {enrollment.cvProjects && enrollment.cvProjects.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" mb={1} fontSize={{ xs: 12, sm: 14 }}>
                Projects
              </Typography>
              {enrollment.cvProjects.map((project, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 1,
                    p: { xs: 1, sm: 1.5 },
                    backgroundColor: "#f9f9f9",
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body2" fontWeight="600" fontSize={{ xs: 13, sm: 14 }}>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontSize={{ xs: 12, sm: 13 }}>
                    {project.description}
                  </Typography>
                </Box>
              ))}
            </Grid>
          )}

          {enrollment.cvFileUrl && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
                CV File
              </Typography>
              <Button
                variant="outlined"
                href={enrollment.cvFileUrl}
                target="_blank"
                size={isMobile ? "small" : "medium"}
                sx={{ mt: 1 }}
                fullWidth={isMobile}
              >
                View CV
              </Button>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontSize={{ xs: 12, sm: 14 }}>
              Enroll date
            </Typography>
            <Typography variant="body1" fontSize={{ xs: 14, sm: 16 }}>
              {new Date(enrollment.createdAt).toLocaleString("vi-VN")}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      {enrollment.status === "pending" && (
        <DialogActions
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: "#F5F3EE",
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={handleReject}
            disabled={loading}
            fullWidth={isMobile}
            sx={{
              color: "#d32f2f",
              borderColor: "#d32f2f",
              "&:hover": {
                borderColor: "#b71c1c",
                backgroundColor: "#ffebee",
              },
            }}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            onClick={handleApprove}
            disabled={loading}
            fullWidth={isMobile}
            sx={{
              backgroundColor: "#2e7d32",
              "&:hover": {
                backgroundColor: "#1b5e20",
              },
            }}
          >
            Approve
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default EnrollmentDetailModal;
