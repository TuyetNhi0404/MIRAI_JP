import React from "react";
import {
  Dialog,
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { RequestSchedule, RequestStatus } from "../../types/requestSchedule.types";

interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  request: RequestSchedule | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isLoading: boolean;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  open,
  onClose,
  request,
  onAccept,
  onReject,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  if (!request) return null;

  const statusConfig: Record<RequestStatus, { label: string; icon: React.ReactElement; bgcolor: string; color: string }> = {
    pending: {
      label: "Chờ duyệt",
      icon: <Clock size={14} />,
      bgcolor: "#FEF3C7",
      color: "#92400E",
    },
    accepted: {
      label: "Đã chấp nhận",
      icon: <CheckCircle size={14} />,
      bgcolor: "#D1FAE5",
      color: "#065F46",
    },
    rejected: {
      label: "Đã từ chối",
      icon: <XCircle size={14} />,
      bgcolor: "#FEE2E2",
      color: "#991B1B",
    },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const buttonBaseStyles = {
    py: { xs: 1, sm: 1.2 },
    px: { xs: 2, sm: 3 },
    minWidth: { xs: 80, sm: 100 },
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
    fontWeight: 600,
  };

  const statusInfo = statusConfig[request.status];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: isMobile ? 'calc(100vw - 32px)' : isTablet ? 500 : 400,
          width: '100%',
          m: isMobile ? 1 : 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box 
        sx={{ 
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 2.5, md: 3 },
          background: "linear-gradient(135deg, #B90000 0%, #FF8C42 100%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <Typography variant="body1" fontWeight={600} fontSize={{ xs: '0.95rem', sm: '1.05rem', md: '1.1rem' }}>
          Chi tiết yêu cầu nghỉ học
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{ 
            color: "white",
            padding: '4px',
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }
          }}
        >
          <X size={18} />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ py: { xs: 1.5, sm: 2, md: 2.5 }, px: { xs: 2, sm: 2.5, md: 3 }, maxHeight: '60vh', overflowY: 'auto' }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Avatar
            src={request.createdBy?.avatar}
            sx={{
              width: { xs: 38, sm: 48, md: 52 },
              height: { xs: 38, sm: 48, md: 52 },
              bgcolor: "#B90000",
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              fontWeight: "bold",
              flexShrink: 0
            }}
          >
            {request.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600} 
              color="#333"
              fontSize={{ xs: '0.875rem', sm: '0.9375rem', md: '1rem' }}
              noWrap
            >
              {request.createdBy?.name || "Chưa xác định"}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              fontSize={{ xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' }}
              noWrap
            >
              {request.createdBy?.email || "N/A"}
            </Typography>
          </Box>
          <Chip
            label={statusInfo.label}
            size="small"
            icon={statusInfo.icon}
            sx={{ 
              bgcolor: statusInfo.bgcolor, 
              color: statusInfo.color, 
              fontWeight: 600,
              flexShrink: 0
            }}
          />
        </Box>

        <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
          {[
            { icon: CalendarIcon, label: "Ngày", value: formatDate(request.calendarId?.date) },
            { icon: Clock, label: "Ca học", value: request.calendarId?.sessionId?.sessionName || "N/A" }
          ].map(({ icon: Icon, label, value }) => (
            <Box key={label} display="flex" alignItems="flex-start" gap={1.5}>
              <Icon size={isMobile ? 16 : isTablet ? 18 : 20} color="#B90000" style={{ flexShrink: 0, marginTop: 2 }} />
              <Box minWidth={0}>
                <Typography variant="body2" color="text.secondary" fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={500} fontSize={{ xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' }}>
                  {value}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box mb={1.5}>
          <Typography variant="body2" color="text.secondary" mb={0.5} fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
            Lý do
          </Typography>
          <Typography 
            variant="body2" 
            fontSize={{ xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' }}
            lineHeight={1.6}
            sx={{ wordBreak: 'break-word' }}
          >
            {request.reason}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.7rem', sm: '0.75rem', md: '0.8rem' }}>
          Đã gửi vào {formatDate(request.createdAt)}
        </Typography>
      </Box>

      <Divider />

      <Box 
        sx={{ 
          p: { xs: 1.5, sm: 2, md: 2.5 }, 
          bgcolor: "#FAFAFA",
          display: 'flex',
          gap: { xs: 1, sm: 1.5 },
          justifyContent: 'center'
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isLoading}
          sx={{
            ...buttonBaseStyles,
            minWidth: { xs: 80, sm: 100, md: 110 },
            borderColor: "#D1D5DB",
            color: "#6B7280",
            "&:hover": {
              borderColor: "#9CA3AF",
              bgcolor: "#F3F4F6",
            },
          }}
        >
          ĐÓNG
        </Button>
        {request.status === "pending" && (
          <>
            <Button
              variant="outlined"
              onClick={() => onReject(request._id)}
              disabled={isLoading}
              sx={{
                ...buttonBaseStyles,
                borderColor: "#FCA5A5",
                color: "#DC2626",
                "&:hover": {
                  borderColor: "#F87171",
                  bgcolor: "#FEF2F2",
                },
                "&:disabled": {
                  borderColor: "#FEE2E2",
                  color: "#FCA5A5",
                }
              }}
            >
              {isLoading ? <CircularProgress size={14} /> : 'TỪ CHỐI'}
            </Button>
            <Button
              variant="contained"
              onClick={() => onAccept(request._id)}
              disabled={isLoading}
              sx={{
                ...buttonBaseStyles,
                bgcolor: "#10B981",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                "&:hover": { 
                  bgcolor: "#059669",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                },
                "&:disabled": {
                  bgcolor: "#A7F3D0",
                }
              }}
            >
              {isLoading ? <CircularProgress size={14} sx={{ color: "white" }} /> : 'ĐỒNG Ý'}
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default RequestDetailModal;
