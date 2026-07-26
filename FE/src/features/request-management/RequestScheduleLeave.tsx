import React, { useState, useEffect, useMemo } from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Segmented,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  Search,
  CalendarOff,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestScheduleService } from "../../services/requestScheduleService";
import { RequestDetailModal } from "./RequestDetailModal";
import type { RequestSchedule, RequestStatus } from "../../types/requestSchedule.types";
import { PageHeader, StatCard, StatusTag, EmptyState } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { Text } = Typography;

interface ApiError {
  background?: string;
  response?: { data?: { message?: string } };
  message?: string;
}

const STATUS_INFO: Record<
  RequestStatus,
  { label: string; type: "warning" | "success" | "error"; icon: React.ReactNode }
> = {
  pending: {
    label: "Đang chờ duyệt",
    type: "warning",
    icon: <Clock size={12} />,
  },
  accepted: {
    label: "Đã chấp nhận",
    type: "success",
    icon: <CheckCircle2 size={12} />,
  },
  rejected: {
    label: "Đã từ chối",
    type: "error",
    icon: <XCircle size={12} />,
  },
};

export const RequestScheduleLeave: React.FC = () => {
  const { message: msgApi } = App.useApp();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("all");
  const [selectedRequest, setSelectedRequest] = useState<RequestSchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestScheduleService.getAllRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      msgApi.error("Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
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
    return filtered;
  }, [requests, filterStatus, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStatus]);

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      accepted: requests.filter((r) => r.status === "accepted").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  );

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoading(true);
      await requestScheduleService.acceptRequest(requestId);
      msgApi.success("Đã chấp nhận yêu cầu nghỉ học");
      
      const calendarId = typeof selectedRequest?.calendarId === "object"
        ? selectedRequest?.calendarId?._id
        : selectedRequest?.calendarId;

      fetchRequests();
      setModalOpen(false);

      if (calendarId) {
        navigate(`/dashboard/admin/schedule-management?editCalendarId=${calendarId}&fromLeaveRequest=true`);
      }
    } catch (error) {
      const apiError = error as ApiError;
      msgApi.error(apiError.response?.data?.message || apiError.message || "Đã xảy ra lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActionLoading(true);
      await requestScheduleService.rejectRequest(requestId);
      msgApi.success("Đã từ chối yêu cầu nghỉ học");
      fetchRequests();
      setModalOpen(false);
    } catch (error) {
      const apiError = error as ApiError;
      msgApi.error(apiError.response?.data?.message || apiError.message || "Đã xảy ra lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (request: RequestSchedule) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const formatDate = (input?: string) => {
    if (!input) return "-";
    try {
      return new Date(input).toLocaleDateString("vi-VN");
    } catch {
      return "-";
    }
  };

  const statusOptions = [
    { label: `Tất cả (${requests.length})`, value: "all" },
    { label: `Chờ duyệt (${stats.pending})`, value: "pending" },
    { label: `Đã duyệt (${stats.accepted})`, value: "accepted" },
    { label: `Từ chối (${stats.rejected})`, value: "rejected" },
  ];

  return (
    <div>
      <PageHeader
        icon={CalendarOff}
        title="Yêu cầu xin nghỉ (slot)"
        subtitle="Xem xét và duyệt các yêu cầu nghỉ học của giảng viên"
        extra={
          <Button
            icon={<RefreshCw size={16} />}
            onClick={fetchRequests}
            loading={loading}
          >
            Làm mới
          </Button>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }} className="mira-stagger">
        <Col xs={24} sm={8}>
          <StatCard
            label="Chờ duyệt"
            value={stats.pending}
            icon={Clock}
            accent="warning"
            loading={loading && requests.length === 0}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã chấp nhận"
            value={stats.accepted}
            icon={CheckCircle2}
            accent="success"
            loading={loading && requests.length === 0}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã từ chối"
            value={stats.rejected}
            icon={XCircle}
            accent="primary"
            loading={loading && requests.length === 0}
          />
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
          marginBottom: 20,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Input
              allowClear
              size="large"
              prefix={<Search size={16} color={brandColors.textTertiary} />}
              placeholder="Tìm theo tên, email, khóa học, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12} lg={14}>
            <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
              <Segmented
                value={filterStatus}
                onChange={(v) => setFilterStatus(v as RequestStatus | "all")}
                options={statusOptions}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {loading && requests.length === 0 ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col xs={24} key={i}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton active avatar paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="Không có yêu cầu nào"
          description="Chưa có yêu cầu xin nghỉ nào phù hợp với bộ lọc hiện tại"
          icon={CalendarOff}
        />
      ) : (
        <Row gutter={[12, 12]} className="mira-stagger">
          {filteredRequests
            .slice((page - 1) * pageSize, page * pageSize)
            .map((req) => {
              const info = STATUS_INFO[req.status];
              const course = req.calendarId?.courseId;
              return (
                <Col xs={24} key={req._id}>
                  <Card
                    hoverable
                    className="mira-card-hover"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${brandColors.border}`,
                    }}
                    styles={{ body: { padding: 18 } }}
                  >
                    <Row gutter={[16, 12]} align="middle">
                      <Col xs={24} sm={6} md={5}>
                        <Space size={10}>
                          <Avatar
                            size={40}
                            style={{
                              background: brandColors.redSoft,
                              color: brandColors.red,
                              fontWeight: 600,
                            }}
                          >
                            {(req.createdBy?.name || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>
                              {req.createdBy?.name || "N/A"}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {req.createdBy?.email || ""}
                            </Text>
                          </div>
                        </Space>
                      </Col>
                      <Col xs={24} sm={6} md={5}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          Khóa học
                        </Text>
                        <Text style={{ fontSize: 14 }}>
                          {course?.name || "Không xác định"}
                        </Text>
                      </Col>
                      <Col xs={12} sm={4} md={3}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          Ngày
                        </Text>
                        <Text style={{ fontSize: 14 }}>
                          {formatDate(req.calendarId?.date)}
                        </Text>
                      </Col>
                      <Col xs={12} sm={4} md={3}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          Trạng thái
                        </Text>
                        <StatusTag
                          status={info.type}
                          text={info.label}
                          icon={info.icon}
                        />
                      </Col>
                      <Col xs={24} sm={4} md={3} style={{ textAlign: "right" }}>
                        <Button
                          type="default"
                          size="small"
                          icon={<Eye size={14} />}
                          onClick={() => handleViewDetail(req)}
                        >
                          Chi tiết
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
        </Row>
      )}

      {filteredRequests.length > pageSize && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <Space>
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Text type="secondary">
              Trang {page} / {Math.ceil(filteredRequests.length / pageSize)}
            </Text>
            <Button
              disabled={page >= Math.ceil(filteredRequests.length / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </Space>
        </div>
      )}

      <RequestDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        request={selectedRequest}
        onAccept={handleAccept}
        onReject={handleReject}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default RequestScheduleLeave;
