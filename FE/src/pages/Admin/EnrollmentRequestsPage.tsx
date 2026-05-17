// src/pages/Admin/EnrollmentRequestsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Card,
    CardContent,
    Stack,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { Visibility } from "@mui/icons-material";
import axiosInstance from "../../api/axiosInstance";
import EnrollmentDetailModal from "../../components/enrollment/EnrollmentDetailModal";
import type { Enrollment } from "../../types/enrollment.types";

const EnrollmentRequestsPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useSelector((state: RootState) => state.auth.user);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending");

    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // ✅ Check authentication
    useEffect(() => {
        if (!user) {
            navigate("/", { replace: true });
            return;
        }

        if (user.role !== "admin") {
            alert("You do not have permission to access this page");
            const redirectPath = user.role === "teacher"
                ? "/dashboard/teacher"
                : "/dashboard/student";
            navigate(redirectPath, { replace: true });
            return;
        }
    }, [user, navigate]);

    // ✅ Fetch enrollments
    useEffect(() => {
        if (user && user.role === "admin") {
            fetchEnrollments();
        }
    }, [statusFilter, user]);

    const fetchEnrollments = async () => {
        setLoading(true);
        setError("");

        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const response = await axiosInstance.get("/enrollments", { params });

            console.log("✅ Enrollments fetched:", response.data);
            setEnrollments(response.data.data || []);
        } catch (err: unknown) {
            console.error("❌ Error fetching enrollments:", err);

            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { message?: string } } };
                setError(axiosError.response?.data?.message || "Unable to load enrollment list");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unable to load enrollment list");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (enrollment: Enrollment) => {
        setSelectedEnrollment(enrollment);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedEnrollment(null);
        fetchEnrollments();
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

    // ✅ Helper function to get course name safely
    const getCourseName = (courseId: Enrollment['courseId']): string => {
        if (!courseId) return "Course deleted";

        if (typeof courseId === "object" && courseId !== null && 'name' in courseId) {
            return courseId.name;
        }

        return "N/A";
    };

    // ✅ Mobile Card Component
    const MobileEnrollmentCard: React.FC<{ enrollment: Enrollment }> = ({ enrollment }) => {
        const courseName = getCourseName(enrollment.courseId);

        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Stack spacing={1.5}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {enrollment.studentName || "N/A"}
                            </Typography>
                            <Chip
                                label={getStatusLabel(enrollment.status)}
                                color={getStatusColor(enrollment.status)}
                                size="small"
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {enrollment.studentEmail || "N/A"}
                        </Typography>

                        <Box>
                            <Typography variant="body2" fontWeight="500">
                                {courseName}
                            </Typography>
                            {courseName === "Course deleted" && (
                                <Chip
                                    label="Deleted"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ mt: 0.5 }}
                                />
                            )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            {enrollment.createdAt
                                ? new Date(enrollment.createdAt).toLocaleDateString("en-US")
                                : "N/A"
                            }
                        </Typography>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetail(enrollment)}
                            fullWidth
                            sx={{
                                color: "#B90000",
                                borderColor: "#B90000",
                                "&:hover": {
                                    borderColor: "#d66a0d",
                                    backgroundColor: "#FFF5E6",
                                },
                            }}
                        >
                            View Details
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        );
    };

    if (!user || user.role !== "admin") {
        return null;
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
                variant={isMobile ? "h5" : "h4"}
                fontWeight="bold"
                color="#023665"
                mb={{ xs: 2, sm: 3 }}
            >
                Enrollment Management
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: { xs: 2, sm: 3 } }}>
                <Tabs
                    value={statusFilter}
                    onChange={(_, newValue) => setStatusFilter(newValue)}
                    textColor="inherit"
                    variant={isMobile ? "scrollable" : "standard"}
                    scrollButtons={isMobile ? "auto" : false}
                    sx={{
                        "& .MuiTab-root": {
                            color: "#666",
                            fontSize: { xs: 13, sm: 14 },
                            minWidth: { xs: 80, sm: 120 },
                            px: { xs: 1, sm: 2 }
                        },
                        "& .Mui-selected": { color: "#B90000" },
                        "& .MuiTabs-indicator": { backgroundColor: "#B90000" },
                    }}
                >
                    <Tab label="Pending" value="pending" />
                    <Tab label="Approved" value="approved" />
                    <Tab label="Rejected" value="rejected" />
                    <Tab label="All" value="" />
                </Tabs>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress sx={{ color: "#B90000" }} />
                </Box>
            ) : enrollments.length === 0 ? (
                <Alert severity="info">No enrollment requests</Alert>
            ) : (
                <>
                    {/* Mobile View - Cards */}
                    {isMobile ? (
                        <Box>
                            {enrollments.map((enrollment) => (
                                <MobileEnrollmentCard key={enrollment._id} enrollment={enrollment} />
                            ))}
                        </Box>
                    ) : (
                        /* Tablet & Desktop View - Table */
                        <TableContainer component={Paper} elevation={2}>
                            <Table>
                                <TableHead sx={{ backgroundColor: "#F5F3EE" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Full Name</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Email</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Course</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Registration Date</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Status</strong>
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Actions</strong>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {enrollments.map((enrollment) => {
                                        const courseName = getCourseName(enrollment.courseId);

                                        return (
                                            <TableRow key={enrollment._id} hover>
                                                <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                                    {enrollment.studentName || "N/A"}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: { sm: 13, md: 14 }, wordBreak: 'break-word' }}>
                                                    {enrollment.studentEmail || "N/A"}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                                    {courseName}
                                                    {courseName === "Course deleted" && (
                                                        <Chip
                                                            label="Deleted"
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                                    {enrollment.createdAt
                                                        ? new Date(enrollment.createdAt).toLocaleDateString("en-US")
                                                        : "N/A"
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={getStatusLabel(enrollment.status)}
                                                        color={getStatusColor(enrollment.status)}
                                                        size={isTablet ? "small" : "medium"}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<Visibility />}
                                                        onClick={() => handleViewDetail(enrollment)}
                                                        sx={{
                                                            color: "#B90000",
                                                            borderColor: "#B90000",
                                                            fontSize: { sm: 12, md: 13 },
                                                            "&:hover": {
                                                                borderColor: "#d66a0d",
                                                                backgroundColor: "#FFF5E6",
                                                            },
                                                        }}
                                                    >
                                                        {isTablet ? "View" : "View Details"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}

            {selectedEnrollment && (
                <EnrollmentDetailModal
                    open={modalOpen}
                    enrollment={selectedEnrollment}
                    onClose={handleCloseModal}
                />
            )}
        </Box>
    );
};

export default EnrollmentRequestsPage;
