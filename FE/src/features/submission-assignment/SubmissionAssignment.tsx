import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
  Grid,
  Menu,
  MenuItem,
  ListItemText,
} from "@mui/material";
import { Search, Filter } from "lucide-react";
import SubmissionUploadModal from "./SubmissionUploadModal";
import { submissionService } from "../../services/submissionService";
import type { EnrolledCourse, AssignmentWithSubmission } from "../../types/submission.types";
import { format } from "date-fns";

interface AssignmentCardProps {
  assignment: AssignmentWithSubmission;
  onClick: () => void;
}

const SubmissionAssignment: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmission | null>(null);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const response = await submissionService.getMyEnrolledCourses();
        
        if (response.courses.length === 0) {
          setError("You have not enrolled in any courses. Please register for a course first.");
          setInitialLoading(false);
          return;
        }

        setEnrolledCourses(response.courses);
        
        const savedCourseId = localStorage.getItem("selectedCourseId");
        const courseToSelect =
          savedCourseId && response.courses.find((c) => c._id === savedCourseId)
            ? savedCourseId
            : response.courses[0]._id;
        setSelectedCourseId(courseToSelect);
      } catch (err) {
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 404) {
          setError("You have not enrolled in any courses. Please register for a course first.");
        } else {
          setError("Unable to load course list. Please try again.");
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);



  const fetchAssignments = useCallback(async () => {
    if (!selectedCourseId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await submissionService.getAllAssignments(
        selectedCourseId,
        {
          search: searchQuery || undefined,
          limit: 100,
          page: 1,
        }
      );

      const assignmentsWithStatus = await Promise.all(
        (response.assignments || []).map(async (assignment) => {
          try {
            const submissionResponse = await submissionService.getMySubmission(assignment._id);
            return {
              ...assignment,
              submission: submissionResponse.submission,
            } as AssignmentWithSubmission;
          } catch  {
            return {
              ...assignment,
              submission: null,
            } as AssignmentWithSubmission;
          }
        })
      );

      setAssignments(assignmentsWithStatus);
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || "Unable to load assignments";
      if (error.response?.status === 404) {
        setError(null);
        setAssignments([]);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setError("You do not have access permission. Please log in again.");
      } else {
        setError(errorMsg);
        setAssignments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, searchQuery]);

  const handleViewDetail = (assignment: AssignmentWithSubmission) => {
    setSelectedAssignment(assignment);
    setOpenUpload(true);
  };

  const handleUploadSuccess = async () => {
    await fetchAssignments();
    setOpenUpload(false);
    setSelectedAssignment(null);
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return assignment.status !== "closed";
    if (statusFilter === "closed") return assignment.status === "closed";
    return true;
  });

  useEffect(() => {
    if (selectedCourseId) {
      fetchAssignments();
    }
  }, [selectedCourseId, fetchAssignments]);

  if (initialLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress sx={{ color: "#B90000" }} />
        <Typography sx={{ ml: 2 }}>Loading your courses...</Typography>
      </Box>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          p: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          You have not enrolled in any courses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please register for a course to view and submit assignments
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      <Typography
        variant="h4"
        sx={{
          mb: 2.5,
          fontWeight: 600,
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
        }}
      >
        Assignments
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2.5,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}
      >
        <TextField
          placeholder="Search assignments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!selectedCourseId || loading}
          size="small"
          sx={{
            width: { xs: '100%', sm: '400px' },
            backgroundColor: "white",
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#ddd",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          onClick={(e) => {
            setFilterAnchorEl(e.currentTarget);
            setShowFilterMenu(!showFilterMenu);
          }}
          sx={{
            border: "1px solid #ddd",
            borderRadius: 1,
            backgroundColor: statusFilter !== "all" ? "#FFF5E6" : "white",
            "&:hover": {
              backgroundColor: statusFilter !== "all" ? "#FFE8CC" : "#f5f5f5",
            },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-start', sm: 'center' },
            px: { xs: 2, sm: 1 }
          }}
        >
          <Filter size={20} />
          {statusFilter !== "all" && (
            <Chip
              label={statusFilter.toUpperCase()}
              size="small"
              sx={{
                ml: 1,
                height: 20,
                backgroundColor: "#B90000",
                color: "white",
                fontSize: "0.7rem",
              }}
            />
          )}
        </IconButton>

        <Menu
          open={showFilterMenu}
          onClose={() => {
            setShowFilterMenu(false);
            setFilterAnchorEl(null);
          }}
          anchorEl={filterAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <MenuItem
            onClick={() => {
              setStatusFilter("all");
              setShowFilterMenu(false);
              setFilterAnchorEl(null);
            }}
            selected={statusFilter === "all"}
          >
            <ListItemText>All</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setStatusFilter("active");
              setShowFilterMenu(false);
              setFilterAnchorEl(null);
            }}
            selected={statusFilter === "active"}
          >
            <ListItemText>Active</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setStatusFilter("closed");
              setShowFilterMenu(false);
              setFilterAnchorEl(null);
            }}
            selected={statusFilter === "closed"}
          >
            <ListItemText>Closed</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: "#B90000" }} />
        </Box>
      )}

      {!loading && selectedCourseId && (
        <>
          {filteredAssignments.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: { xs: 6, sm: 8, md: 10 },
              }}
            >
              <Typography 
                variant="h6" 
                color="text.secondary"
                sx={{ fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}
              >
                {searchQuery
                  ? "No assignments found with your search"
                  : statusFilter === "closed"
                  ? "You don't have any closed assignments"
                  : statusFilter === "active"
                  ? "You don't have any active assignments"
                  : "No assignments yet"}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 2 }}>
              {filteredAssignments.map((assignment) => (
                <Grid 
                  item 
                  xs={12}  
                  sm={6}   
                  md={4}   
                  lg={3}   
                  key={assignment._id}
                >
                  <AssignmentCard
                    assignment={assignment}
                    onClick={() => handleViewDetail(assignment)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <SubmissionUploadModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        assignment={selectedAssignment}
        onSuccess={handleUploadSuccess}
      />
    </Box>
  );
};

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onClick }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy, h:mm a");
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'closed' ? '#d32f2f' : '#2e7d32';
  };

  const getSubmissionColor = (status?: string) => {
    switch (status) {
      case "submitted":
        return "#2e7d32";
      case "late":
        return "#ed6c02";
      case "graded":
        return "#1976d2";
      default:
        return "#ed6c02";
    }
  };

  const getSubmissionLabel = (status?: string) => {
    switch (status) {
      case "submitted":
        return "SUBMITTED";
      case "late":
        return "LATE";
      case "graded":
        return "GRADED";
      default:
        return "NOT SUBMITTED";
    }
  };

  const submissionStatus = assignment.submission?.status || "not_submitted";

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 1.8, md: 2 },
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 2,
        border: '1px solid',
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
          borderColor: '#B90000',
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ mb: 0.8 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ 
            display: 'block',
            mb: 0.2,
            fontSize: '0.6rem'
          }}
        >
          Title
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: '#333',
            fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.88rem' },
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {assignment.title}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 0.6, sm: 0.8 }}>
        <Grid item xs={6} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Type
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.68rem', sm: '0.7rem' }
            }}
          >
            Assignment
          </Typography>
        </Grid>

        <Grid item xs={6} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Status
          </Typography>
          <Chip
            label={assignment.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
            size="small"
            sx={{
              backgroundColor: getStatusColor(assignment.status),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.55rem',
              height: 16,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Start Time
          </Typography>
          <Typography 
            variant="body2"
            sx={{ fontSize: { xs: '0.63rem', sm: '0.65rem' } }}
          >
            {formatDate(assignment.createdAt)}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Due Time
          </Typography>
          <Typography 
            variant="body2" 
            color="error"
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.63rem', sm: '0.65rem' }
            }}
          >
            {formatDate(assignment.dueDate)}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Class Name
          </Typography>
          <Typography 
            variant="body2"
            sx={{ fontSize: { xs: '0.63rem', sm: '0.65rem' } }}
          >
            {assignment.courseName}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Submission Status
          </Typography>
          <Chip
            label={getSubmissionLabel(submissionStatus)}
            size="small"
            sx={{
              backgroundColor: getSubmissionColor(submissionStatus),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.55rem',
              height: 16,
            }}
          />
        </Grid>

        {assignment.submission?.status === "graded" && (
          <Grid item xs={12}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ 
                display: 'block',
                mb: 0.2,
                fontSize: '0.6rem'
              }}
            >
              Score
            </Typography>
            <Typography 
              variant="body2"
              sx={{ 
                fontSize: { xs: '0.68rem', sm: '0.7rem' },
                fontWeight: 600,
                color: '#1976d2'
              }}
            >
              {assignment.submission.score} / {assignment.maxScore}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              mb: 0.2,
              fontSize: '0.6rem'
            }}
          >
            Created By
          </Typography>
          <Typography 
            variant="body2"
            sx={{ fontSize: { xs: '0.63rem', sm: '0.65rem' } }}
          >
            {assignment.teacherName}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SubmissionAssignment;
