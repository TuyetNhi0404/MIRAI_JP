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
            alert("Bạn không có quyền truy cập trang này");
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
                setError(axiosError.response?.data?.message || "Không thể tải danh sách đăng ký học");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Không thể tải danh sách đăng ký học");
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
                return "Đã phê duyệt";
            case "rejected":
                return "Đã từ chối";
            default:
                return "Đang chờ duyệt";
        }
    };

    // ✅ Helper function to get course name safely
    const getCourseName = (courseId: Enrollment['courseId']): string => {
        if (!courseId) return "Khóa học đã bị xóa";

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
                            {courseName === "Khóa học đã bị xóa" && (
                                <Chip
                                    label="Đã xóa"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ mt: 0.5 }}
                                />
                            )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            {enrollment.createdAt
                                ? new Date(enrollment.createdAt).toLocaleDateString("vi-VN")
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
                            Xem chi tiết
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
                Quản lý đăng ký học
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
                    <Tab label="Chờ duyệt" value="pending" />
                    <Tab label="Đã phê duyệt" value="approved" />
                    <Tab label="Đã từ chối" value="rejected" />
                    <Tab label="Tất cả" value="" />
                </Tabs>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress sx={{ color: "#B90000" }} />
                </Box>
            ) : enrollments.length === 0 ? (
                <Alert severity="info">Không có yêu cầu đăng ký học nào</Alert>
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
                                            <strong>Họ tên</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Email</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Khóa học</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Ngày đăng ký</strong>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Trạng thái</strong>
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontSize: { sm: 13, md: 14 } }}>
                                            <strong>Hành động</strong>
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
                                                    {courseName === "Khóa học đã bị xóa" && (
                                                        <Chip
                                                            label="Đã xóa"
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: { sm: 13, md: 14 } }}>
                                                    {enrollment.createdAt
                                                        ? new Date(enrollment.createdAt).toLocaleDateString("vi-VN")
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
                                                        {isTablet ? "Xem" : "Xem chi tiết"}
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
