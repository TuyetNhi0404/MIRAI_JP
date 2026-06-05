import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Avatar,
  Chip,
  Snackbar,
  Alert,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  X,
} from "lucide-react";
import { requestScheduleService } from "../../services/requestScheduleService";
import { RequestDetailModal } from "./RequestDetailModal";
import type { RequestSchedule, RequestStatus } from "../../types/requestSchedule.types";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const RequestScheduleLeave: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [requests, setRequests] = useState<RequestSchedule[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("all");
  const [selectedRequest, setSelectedRequest] = useState<RequestSchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error"
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = isMobile ? 5 : 10;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestScheduleService.getAllRequests();
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setSnackbar({
        open: true,
        message: "Không thể tải danh sách yêu cầu",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = [...requests];

    if (filterStatus !== "all") {
      filtered = filtered.filter((req) => req.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.createdBy?.name?.toLowerCase().includes(query) ||
          req.createdBy?.email?.toLowerCase().includes(query) ||
          req.calendarId?.courseId?.name?.toLowerCase().includes(query) ||
          req.reason?.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
    setPage(1);
  }, [requests, filterStatus, searchQuery]);

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoading(true);
      await requestScheduleService.acceptRequest(requestId);
      setSnackbar({
        open: true,
        message: "Đã chấp nhận yêu cầu nghỉ học",
        severity: "success"
      });
      fetchRequests();
      setModalOpen(false);
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.response?.data?.message || apiError.message || "Đã xảy ra lỗi",
        severity: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActionLoading(true);
      await requestScheduleService.rejectRequest(requestId);
      setSnackbar({
        open: true,
        message: "Đã từ chối yêu cầu nghỉ học",
        severity: "success"
      });
      fetchRequests();
      setModalOpen(false);
    } catch (error) {
      const apiError = error as ApiError;
      setSnackbar({
        open: true,
        message: apiError.response?.data?.message || apiError.message || "Đã xảy ra lỗi",
        severity: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (request: RequestSchedule, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("View detail clicked for:", request._id);
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      pending: { label: "Đang chờ duyệt", icon: <Clock size={14} />, bgcolor: "#FEF3C7", color: "#92400E" },
      accepted: { label: "Đã chấp nhận", icon: <CheckCircle size={14} />, bgcolor: "#D1FAE5", color: "#065F46" },
      rejected: { label: "Đã từ chối", icon: <XCircle size={14} />, bgcolor: "#FEE2E2", color: "#991B1B" },
    };

    const config = statusConfig[status];
    return (
      <Chip
        label={config.label}
        size="small"
        icon={config.icon}
        sx={{ bgcolor: config.bgcolor, color: config.color, fontWeight: 600 }}
      />
    );
  };

  const FilterButtons = () => (
    <Box display="flex" gap={1} flexWrap="wrap" sx={{ width: '100%' }}>
      {[
        { value: "all", label: "Tất cả", color: "#B90000" },
        { value: "pending", label: "Chờ duyệt", color: "#F59E0B" },
        { value: "accepted", label: "Đã duyệt", color: "#10B981" },
        { value: "rejected", label: "Từ chối", color: "#EF4444" },
      ].map(({ value, label, color }) => (
        <Button
          key={value}
          variant={filterStatus === value ? "contained" : "outlined"}
          onClick={() => {
            setFilterStatus(value as RequestStatus | "all");
            setFilterDrawerOpen(false);
          }}
          size="small"
          sx={{
            bgcolor: filterStatus === value ? color : "transparent",
            borderColor: color,
            color: filterStatus === value ? "white" : color,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            px: { xs: 1.5, sm: 2 },
            textTransform: "none",
            "&:hover": {
              bgcolor: filterStatus === value ? color : `${color}15`,
              borderColor: color,
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: "#B90000" }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      minHeight: '100vh',
      overflowX: 'hidden',
      p: { xs: 1.5, sm: 2, md: 3 },
      boxSizing: 'border-box',
    }}>
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          fontWeight={700}
          color="#333"
          sx={{ mb: 0.5 }}
        >
          Quản lý yêu cầu nghỉ học
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Xem xét và duyệt các yêu cầu nghỉ học của giảng viên
        </Typography>
      </Box>

      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        gap: { xs: 1.5, sm: 2, md: 3 },
        mb: { xs: 2, sm: 3, md: 4 }
      }}>
        {[
          { label: "Chờ duyệt", count: stats.pending, color: "#F59E0B", icon: Clock },
          { label: "Đã chấp nhận", count: stats.accepted, color: "#10B981", icon: CheckCircle },
          { label: "Đã từ chối", count: stats.rejected, color: "#EF4444", icon: XCircle },
        ].map(({ label, count, color, icon: Icon }) => (
          <Card key={label} sx={{ borderRadius: { xs: 2, md: 3 }, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant={isMobile ? "h4" : "h3"}
                    fontWeight={700}
                    color={color}
                  >
                    {count}
                  </Typography>
                </Box>
                <Icon size={isMobile ? 32 : 40} color={color} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        mb: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: { xs: 2, md: 3 },
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <Box display="flex" gap={{ xs: 1, sm: 1.5, md: 2 }} alignItems="center">
          <TextField
            placeholder={isMobile ? "Tìm kiếm..." : "Tìm theo tên, email, khóa học..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 0,
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={isMobile ? 16 : 20} color="#9CA3AF" />
                </InputAdornment>
              ),
            }}
          />
          {isMobile ? (
            <IconButton
              onClick={() => setFilterDrawerOpen(true)}
              sx={{
                bgcolor: "#B90000",
                color: "white",
                width: 36,
                height: 36,
                flexShrink: 0,
                "&:hover": { bgcolor: "#D66A0D" },
              }}
            >
              <Filter size={18} />
            </IconButton>
          ) : (
            <Box display="flex" gap={1} flexWrap="wrap">
              <FilterButtons />
            </Box>
          )}
        </Box>
      </Paper>

      <Drawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px 16px 0 0",
            p: 2,
          },
        }}
      >
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Lọc theo trạng thái
            </Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)} size="small">
              <X size={20} />
            </IconButton>
          </Box>
          <FilterButtons />
        </Box>
      </Drawer>

      {filteredRequests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            Không tìm thấy yêu cầu nào
          </Typography>
        </Paper>
      ) : (
        <>
          {!isMobile && !isTablet && (
            <Paper sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ minWidth: 800 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2.5fr 2.5fr 1fr 120px",
                      gap: 2,
                      p: 2.5,
                      bgcolor: "#F9FAFB",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <Typography variant="body2" fontWeight={700} color="#6B7280">
                      Họ tên
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#6B7280">
                      Email
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#6B7280">
                      Trạng thái
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#6B7280" textAlign="center">
                      Hành động
                    </Typography>
                  </Box>

                  {paginatedRequests.map((request, index) => (
                    <Box
                      key={request._id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2.5fr 2.5fr 1fr 120px",
                        gap: 2,
                        p: 2.5,
                        alignItems: "center",
                        borderBottom: index < paginatedRequests.length - 1 ? "1px solid #F3F4F6" : "none",
                        transition: "background-color 0.2s",
                        "&:hover": {
                          bgcolor: "#F9FAFB",
                        },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                          src={request.createdBy?.avatar}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "#B90000",
                            fontSize: "0.875rem",
                            fontWeight: "bold",
                          }}
                        >
                          {request.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500} color="#111827">
                          {request.createdBy?.name || "Chưa xác định"}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" noWrap>
                        {request.createdBy?.email || "N/A"}
                      </Typography>

                      <Box>{getStatusBadge(request.status)}</Box>

                      <Box display="flex" justifyContent="center">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Eye size={16} />}
                          onClick={(e) => handleViewDetail(request, e)}
                          sx={{
                            borderColor: "#E5E7EB",
                            color: "#6B7280",
                            minWidth: "90px",
                            px: 2,
                            textTransform: "none",
                            fontWeight: 500,
                            "&:hover": {
                              borderColor: "#B90000",
                              color: "#B90000",
                              bgcolor: "#FFF5E6",
                            },
                          }}
                        >
                          Xem
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          )}

          {(isMobile || isTablet) && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
              {paginatedRequests.map((request) => (
                <Card
                  key={request._id}
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    width: '100%',
                  }}
                >
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5} gap={1}>
                      <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                        <Avatar
                          src={request.createdBy?.avatar}
                          sx={{
                            width: { xs: 36, sm: 44 },
                            height: { xs: 36, sm: 44 },
                            bgcolor: "#B90000",
                            flexShrink: 0,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          {request.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            noWrap
                            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                          >
                            {request.createdBy?.name || "Chưa xác định"}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            {request.createdBy?.email || "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                      <Box flexShrink={0}>
                        {getStatusBadge(request.status)}
                      </Box>
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1.5}>
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}
                        >
                          Khóa học
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          noWrap
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                          {request.calendarId?.courseId?.name || "N/A"}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Mobile View clicked for:", request._id);
                          setSelectedRequest(request);
                          setModalOpen(true);
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: "transparent",
                          border: "1px solid #E5E7EB",
                          borderRadius: 1,
                          color: "#6B7280",
                          minWidth: { xs: 70, sm: 90 },
                          height: { xs: 32, sm: 36 },
                          flexShrink: 0,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          fontWeight: 500,
                          px: { xs: 1, sm: 1.5 },
                          textTransform: "none",
                          cursor: "pointer",
                          touchAction: "manipulation",
                          userSelect: "none",
                          WebkitTapHighlightColor: "transparent",
                          "&:hover": {
                            bgcolor: "#FFF5E6",
                            borderColor: "#B90000",
                            color: "#B90000",
                          },
                          "&:active": {
                            transform: 'scale(0.98)',
                            bgcolor: "#FFF5E6",
                          }
                        }}
                      >
                        <Eye size={isMobile ? 14 : 16} />
                        Xem
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {filteredRequests.length > 0 && totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
                {!isMobile && (
                  <Button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    sx={{
                      minWidth: { xs: 32, sm: 40 },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
                      p: 0,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      color: "#6B7280",
                      "&:hover": { bgcolor: "#F3F4F6" },
                      "&.Mui-disabled": { color: "#D1D5DB" },
                    }}
                  >
                    «
                  </Button>
                )}

                <Button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  sx={{
                    minWidth: { xs: 32, sm: 40 },
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    p: 0,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    color: "#6B7280",
                    "&:hover": { bgcolor: "#F3F4F6" },
                    "&.Mui-disabled": { color: "#D1D5DB" },
                  }}
                >
                  ‹
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const showPage = isMobile
                    ? (pageNum === 1 || pageNum === totalPages || pageNum === page)
                    : (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1));

                  if (showPage) {
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        sx={{
                          minWidth: { xs: 32, sm: 40 },
                          width: { xs: 32, sm: 40 },
                          height: { xs: 32, sm: 40 },
                          p: 0,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          borderRadius: "50%",
                          bgcolor: page === pageNum ? "#1E3A5F" : "transparent",
                          color: page === pageNum ? "white" : "#6B7280",
                          fontWeight: page === pageNum ? 600 : 400,
                          "&:hover": {
                            bgcolor: page === pageNum ? "#1E3A5F" : "#F3F4F6",
                          },
                        }}
                      >
                        {pageNum}
                      </Button>
                    );
                  } else if (
                    (!isMobile && (pageNum === page - 2 || pageNum === page + 2)) ||
                    (isMobile && pageNum === page - 1) ||
                    (isMobile && pageNum === page + 1)
                  ) {
                    return (
                      <Typography key={pageNum} sx={{ px: 0.5, color: "#9CA3AF", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        ...
                      </Typography>
                    );
                  }
                  return null;
                })}

                <Button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  sx={{
                    minWidth: { xs: 32, sm: 40 },
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    p: 0,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    color: "#6B7280",
                    "&:hover": { bgcolor: "#F3F4F6" },
                    "&.Mui-disabled": { color: "#D1D5DB" },
                  }}
                >
                  ›
                </Button>

                {!isMobile && (
                  <Button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    sx={{
                      minWidth: { xs: 32, sm: 40 },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
                      p: 0,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      color: "#6B7280",
                      "&:hover": { bgcolor: "#F3F4F6" },
                      "&.Mui-disabled": { color: "#D1D5DB" },
                    }}
                  >
                    »
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </>
      )}

      <RequestDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        request={selectedRequest}
        onAccept={handleAccept}
        onReject={handleReject}
        isLoading={actionLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            bgcolor: snackbar.severity === "success" ? "#B90000" : "#EF4444",
            color: "white",
            "& .MuiAlert-icon": {
              color: "white"
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RequestScheduleLeave;
