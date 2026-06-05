"use client"

// components/StudentStatistics.tsx - Enhanced with Charts
import type React from "react"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Tabs,
  Tab,
} from "@mui/material"
import { Award, BookOpen, CheckCircle, Clock, Target, TrendingUp, BarChart3 } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { getStudentCourseStatistics, getStudentCourses, getErrorMessage } from "../../services/statistics.service"
import type { StudentCourseStatistics } from "../../types/statistics.types"
import type { RootState } from "../../redux/store"

// Type cho Course từ API
interface CourseData {
  _id: string
  name: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  homeroomTeacher?: string
  capacity?: number
  session?: number
  enrolledCount?: number
}

const StudentStatisticsDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user)
  const studentId = user?._id || ""

  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<StudentCourseStatistics | null>(null)
  const [tabValue, setTabValue] = useState(0)

  useEffect(() => {
    if (!user || !studentId) {
      setError("User information not found. Please log in again.")
      setLoading(false)
      return
    }

    if (user.role !== "student") {
      setError("This feature is only available for students.")
      setLoading(false)
      return
    }

    loadCourseAndStatistics()
  }, [user, studentId])

  const loadCourseAndStatistics = async () => {
    if (!studentId) {
      setError("User information not found. Please log in again.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const coursesResponse = await getStudentCourses()
      const coursesData = coursesResponse.data.data || []

      if (coursesData.length === 0) {
        setError("You have not been approved to join any courses yet.")
        setLoading(false)
        return
      }

      const studentCourse = coursesData[0]
      setCourse(studentCourse)

      try {
        const statsResponse = await getStudentCourseStatistics(studentId, studentCourse._id)
        setStatistics(statsResponse.data.data)
      } catch (statsError) {
        console.error("❌ Error loading statistics:", statsError)
        setError(getErrorMessage(statsError))
      }
    } catch (err) {
      console.error("❌ Error loading course:", err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status?: string): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "in_progress":
        return "warning"
      case "not_yet":
        return "default"
      case "complete":
        return "success"
      default:
        return "default"
    }
  }

  const getStatusText = (status?: string): string => {
    switch (status) {
      case "in_progress":
        return "In Progress"
      case "not_yet":
        return "Not Started"
      case "complete":
        return "Completed"
      default:
        return "Unknown"
    }
  }

  // Prepare chart data
  const getRadarData = () => {
    if (!statistics) return []
    return [
      {
        subject: "Attendance",
        score: statistics.scoreComponent.attendanceScore,
        fullMark: 10,
      },
      {
        subject: "Assignments",
        score: statistics.scoreComponent.assignmentScore,
        fullMark: 10,
      },
      {
        subject: "Quizzes",
        score: statistics.scoreComponent.quizScore,
        fullMark: 10,
      },
    ]
  }

  const getBarData = () => {
    if (!statistics) return []
    return [
      {
        name: "Attendance",
        points: statistics.scoreComponent.attendanceScore,
        weight: statistics.finalScore.weights.attendance,
      },
      {
        name: "Assignments",
        points: statistics.scoreComponent.assignmentScore,
        weight: statistics.finalScore.weights.assignment,
      },
      {
        name: "Quizzes",
        points: statistics.scoreComponent.quizScore,
        weight: statistics.finalScore.weights.quiz,
      },
    ]
  }

  const getPieData = () => {
    if (!statistics) return []
    return [
      {
        name: "Attendance",
        value: statistics.finalScore.weights.attendance,
        color: "#a44d0fff",
      },
      {
        name: "Assignments",
        value: statistics.finalScore.weights.assignment,
        color: "#fb923c",
      },
      {
        name: "Quizzes",
        value: statistics.finalScore.weights.quiz,
        color: "#fed7aa",
      },
    ]
  }

 
  if (!user) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Please log in to view performance statistics.</Alert>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: "#f97316" }} />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box mb={{ xs: 4, md: 6 }}>
        <Typography 
          variant="h3" 
          fontWeight="700" 
          gutterBottom 
          sx={{ 
            color: "#1f2937",
            fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3rem" }
          }}
        >
          Learning Performance Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: "#6b7280", 
            fontSize: { xs: "0.9rem", md: "1.05rem" }
          }}
        >
          Track your academic progress and achievements
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {course && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderLeft: 4,
            borderColor: "#f97316",
            backgroundColor: "#f7f9fbff",
            borderRadius: 2,
            transition: "box-shadow 0.2s ease",
            "&:hover": { boxShadow: "0 3px 10px rgba(0,0,0,0.25)" },
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 2.2 } }}> 
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography
                  variant="h6"
                  fontWeight="700"
                  sx={{ 
                    color: "rgba(31, 29, 29, 0.7)", 
                    mb: 0.5,
                    fontSize: { xs: "1rem", md: "1.25rem" }
                  }}
                >
                  {course.name}
                </Typography>

                {course.description && (
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: "rgba(37, 34, 34, 0.7)", 
                      mb: 1,
                      fontSize: { xs: "0.8rem", md: "0.875rem" }
                    }}
                  >
                    {course.description}
                  </Typography>
                )}

                {course.homeroomTeacher && (
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: "rgba(36, 31, 31, 0.7)",
                      fontSize: { xs: "0.8rem", md: "0.875rem" }
                    }}
                  >
                    <strong>Instructor:</strong> {course.homeroomTeacher}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  display="flex"
                  flexDirection="column"
                  gap={1}
                  alignItems={{ xs: "flex-start", md: "flex-end" }}
                >
                  <Chip
                    label={getStatusText(course.status)}
                    color={getStatusColor(course.status)}
                    size="small"
                    sx={{
                      fontWeight: 500,
                      height: { xs: 24, md: 26 },
                      fontSize: { xs: "0.7rem", md: "0.75rem" },
                    }}
                  />

                  {course.startDate && (
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: "rgba(31, 29, 29, 0.6)",
                        fontSize: { xs: "0.7rem", md: "0.75rem" }
                      }}
                    >
                      Started:{" "}
                      {new Date(course.startDate).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  )}

                  {course.endDate && (
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: "rgba(34, 30, 30, 0.6)",
                        fontSize: { xs: "0.7rem", md: "0.75rem" }
                      }}
                    >
                      Ends:{" "}
                      {new Date(course.endDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* No Course Message */}
      {!course && !error && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          You haven't joined any courses yet
        </Alert>
      )}

      {/* Statistics Display */}
      {statistics && course && (
        <>
          {/* Final Score Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              mb: { xs: 3, md: 4 },
              background: "linear-gradient(135deg, #f97316 50%, #ea580c 50%)",
              borderRadius: 2,
              boxShadow: "0 10px 30px rgba(249, 115, 22, 0.15)",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "10px" }}>
                    <Award size={window.innerWidth < 600 ? 32 : 40} color="white" />
                  </Box>
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "rgba(255,255,255,0.85)", 
                        fontWeight: 500, 
                        mb: 0,
                        fontSize: { xs: "0.8rem", md: "0.875rem" }
                      }}
                    >
                      Overall Score
                    </Typography>
                    <Typography 
                      variant="h4" 
                      fontWeight="800" 
                      sx={{ 
                        color: "white", 
                        lineHeight: 1.1,
                        fontSize: { xs: "2rem", md: "2.125rem" }
                      }}
                    >
                      {statistics.finalScore.finalScore.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Grid container spacing={1.2}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}>
                        Grade:
                      </Typography>
                      <Chip
                        label={statistics.finalScore.grade}
                        sx={{
                          bgcolor: "white",
                          color: "#f97316",
                          fontWeight: "700",
                          fontSize: { xs: "0.8rem", md: "0.9rem" },
                          px: 1.5,
                          height: { xs: 26, md: 28 },
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}>
                        Status:
                      </Typography>
                      <Chip
                        label={statistics.finalScore.passed ? "Passed" : "Not Passed"}
                        color={statistics.finalScore.passed ? "success" : "error"}
                        sx={{ 
                          fontWeight: 600, 
                          height: { xs: 26, md: 28 },
                          fontSize: { xs: "0.75rem", md: "0.8125rem" }
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}>
                        Rank:
                      </Typography>
                      <Typography sx={{ color: "white", fontWeight: "700", fontSize: { xs: "0.9rem", md: "1rem" }, lineHeight: 1 }}>
                        {statistics.finalScore.rank}/{statistics.finalScore.totalStudents}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>

          {/* Tabs for different views */}
          <Paper sx={{ mb: { xs: 3, md: 4 }, borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: { xs: "0.8rem", md: "0.95rem" },
                  fontWeight: 500,
                  color: "#6b7280",
                  minHeight: { xs: 48, md: 56 },
                  "&.Mui-selected": { color: "#f97316" },
                },
                "& .MuiTabs-indicator": { backgroundColor: "#f97316" },
              }}
            >
              <Tab icon={<BarChart3 size={18} />} label="Score Details" iconPosition="start" />
              <Tab icon={<TrendingUp size={18} />} label="Analytics" iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab 0: Component Scores Grid */}
          {tabValue === 0 && (
            <Grid container spacing={{ xs: 2, md: 3 }} mb={4}>
              {/* Attendance Score */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={2} mb={{ xs: 2, md: 3 }}>
                      <Box sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: "#fef3c7", borderRadius: "10px" }}>
                        <CheckCircle size={24} color="#f97316" />
                      </Box>
                      <Typography variant="h6" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                        Attendance
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="800" sx={{ color: "#f97316", mb: { xs: 2, md: 3 }, fontSize: { xs: "2rem", md: "3rem" } }}>
                      {statistics.scoreComponent.attendanceScore.toFixed(1)}
                    </Typography>
                    <Divider sx={{ my: { xs: 1.5, md: 2.5 } }} />
                    <Box display="flex" flexDirection="column" gap={{ xs: 1, md: 1.5 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Total Sessions:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.attendanceDetails.totalSessions}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Present:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#e1762aff", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.attendanceDetails.presentCount}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Absent:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#ef4444", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.attendanceDetails.absentCount}
                        </Typography>
                      </Box>
                    </Box>
                    <Box mt={{ xs: 2, md: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Participation Rate
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.attendanceDetails.percentage.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={statistics.scoreComponent.attendanceDetails.percentage}
                        sx={{
                          height: { xs: 6, md: 8 },
                          borderRadius: 4,
                          backgroundColor: "#e5e7eb",
                          "& .MuiLinearProgress-bar": { backgroundColor: "#f97316" },
                        }}
                      />
                    </Box>
                    <Chip
                      label={`Weight: ${statistics.finalScore.weights.attendance}%`}
                      size="small"
                      sx={{ mt: { xs: 2, md: 2.5 }, fontWeight: 500, color: "#6b7280", fontSize: { xs: "0.7rem", md: "0.8125rem" } }}
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Assignment Score */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={2} mb={{ xs: 2, md: 3 }}>
                      <Box sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: "#fee8dbff", borderRadius: "10px" }}>
                        <BookOpen size={24} color="#ef7c2aff" />
                      </Box>
                      <Typography variant="h6" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                        Assignments
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="800" sx={{ color: "#ec7b30ff", mb: { xs: 2, md: 3 }, fontSize: { xs: "2rem", md: "3rem" } }}>
                      {statistics.scoreComponent.assignmentScore.toFixed(1)}
                    </Typography>
                    <Divider sx={{ my: { xs: 1.5, md: 2.5 } }} />
                    <Box display="flex" flexDirection="column" gap={{ xs: 1, md: 1.5 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Total Assignments:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.assignmentDetails.totalAssignments}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Graded:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#f6993bff", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.assignmentDetails.gradedAssignments}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Average Score:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.assignmentDetails.averageScore.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box mt={{ xs: 2, md: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Completion Rate
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.assignmentDetails.totalAssignments > 0
                            ? (
                                (statistics.scoreComponent.assignmentDetails.gradedAssignments /
                                  statistics.scoreComponent.assignmentDetails.totalAssignments) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={
                          statistics.scoreComponent.assignmentDetails.totalAssignments > 0
                            ? (statistics.scoreComponent.assignmentDetails.gradedAssignments /
                                statistics.scoreComponent.assignmentDetails.totalAssignments) *
                              100
                            : 0
                        }
                        sx={{
                          height: { xs: 6, md: 8 },
                          borderRadius: 4,
                          backgroundColor: "#e5e7eb",
                          "& .MuiLinearProgress-bar": { backgroundColor: "#3b82f6" },
                        }}
                      />
                    </Box>
                    <Chip
                      label={`Weight: ${statistics.finalScore.weights.assignment}%`}
                      size="small"
                      sx={{ mt: { xs: 2, md: 2.5 }, fontWeight: 500, color: "#6b7280", fontSize: { xs: "0.7rem", md: "0.8125rem" } }}
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Quiz Score */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={2} mb={{ xs: 2, md: 3 }}>
                      <Box sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: "#fed7aa", borderRadius: "10px" }}>
                        <Target size={24} color="#f97316" />
                      </Box>
                      <Typography variant="h6" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                        Quizzes
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="800" sx={{ color: "#f97316", mb: { xs: 2, md: 3 }, fontSize: { xs: "2rem", md: "3rem" } }}>
                      {statistics.scoreComponent.quizScore.toFixed(1)}
                    </Typography>
                    <Divider sx={{ my: { xs: 1.5, md: 2.5 } }} />
                    <Box display="flex" flexDirection="column" gap={{ xs: 1, md: 1.5 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Total Quizzes:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.quizDetails.totalQuizzes}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Completed:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#f97316", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.quizDetails.completedQuizzes}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Average Score:
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.quizDetails.averageScore.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box mt={{ xs: 2, md: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          Completion Rate
                        </Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#1f2937", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                          {statistics.scoreComponent.quizDetails.totalQuizzes > 0
                            ? (
                                (statistics.scoreComponent.quizDetails.completedQuizzes /
                                  statistics.scoreComponent.quizDetails.totalQuizzes) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={
                          statistics.scoreComponent.quizDetails.totalQuizzes > 0
                            ? (statistics.scoreComponent.quizDetails.completedQuizzes /
                                statistics.scoreComponent.quizDetails.totalQuizzes) *
                              100
                            : 0
                        }
                        sx={{
                          height: { xs: 6, md: 8 },
                          borderRadius: 4,
                          backgroundColor: "#e5e7eb",
                          "& .MuiLinearProgress-bar": { backgroundColor: "#f97316" },
                        }}
                      />
                    </Box>
                    <Chip
                      label={`Weight: ${statistics.finalScore.weights.quiz}%`}
                      size="small"
                      sx={{ mt: { xs: 2, md: 2.5 }, fontWeight: 500, color: "#6b7280", fontSize: { xs: "0.7rem", md: "0.8125rem" } }}
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Chart Visualizations */}
          {tabValue === 1 && (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {/* Radar Chart */}
              <Grid item xs={12} md={6}>
                <Card elevation={0} sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: { xs: 2, md: 3 }, color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                      Score Overview
                    </Typography>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 250 : 300}>
                      <RadarChart data={getRadarData()}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" stroke="#6b7280" style={{ fontSize: window.innerWidth < 600 ? "0.75rem" : "0.875rem" }} />
                        <PolarRadiusAxis stroke="#d1d5db" style={{ fontSize: window.innerWidth < 600 ? "0.7rem" : "0.8rem" }} />
                        <Radar name="Score" dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            borderRadius: "8px",
                            color: "white",
                            fontSize: window.innerWidth < 600 ? "0.75rem" : "0.875rem",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Pie Chart */}
              <Grid item xs={12} md={6}>
                <Card elevation={0} sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: { xs: 2, md: 3 }, color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                      Score Weight Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 250 : 300}>
                      <PieChart>
                        <Pie
                          data={getPieData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}%`}
                          outerRadius={window.innerWidth < 600 ? 60 : 80}
                          fill="#8884d8"
                          dataKey="value"
                          style={{ fontSize: window.innerWidth < 600 ? "0.7rem" : "0.875rem" }}
                        >
                          {getPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            borderRadius: "8px",
                            color: "white",
                            fontSize: window.innerWidth < 600 ? "0.75rem" : "0.875rem",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Bar Chart */}
              <Grid item xs={12}>
                <Card elevation={0} sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" fontWeight="700" sx={{ mb: { xs: 2, md: 3 }, color: "#1f2937", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                      Detailed Score Breakdown
                    </Typography>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 250 : 300}>
                      <BarChart data={getBarData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: window.innerWidth < 600 ? "0.7rem" : "0.875rem" }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: window.innerWidth < 600 ? "0.7rem" : "0.875rem" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            borderRadius: "8px",
                            color: "white",
                            fontSize: window.innerWidth < 600 ? "0.75rem" : "0.875rem",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: window.innerWidth < 600 ? "0.75rem" : "0.875rem" }} />
                        <Bar dataKey="points" fill="#a33f14ff" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="weight" fill="#fb923c" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* Last Updated */}
      <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end" sx={{ mt: 4 }}>
        <Clock size={16} color="#6b7280" />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
          Last Calculated:{" "}
          {statistics
            ? new Date(statistics.scoreComponent.lastCalculated).toLocaleString("vi-VN", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A"}
        </Typography>
      </Box>
    </Container>
  )
}

export default StudentStatisticsDashboard
