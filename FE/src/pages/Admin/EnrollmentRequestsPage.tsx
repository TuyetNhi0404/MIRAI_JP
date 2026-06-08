import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Search, RefreshCw, FileText, Inbox } from "lucide-react";
import type { RootState } from "../../redux/store";
import axiosInstance from "../../api/axiosInstance";
import EnrollmentDetailModal from "../../components/enrollment/EnrollmentDetailModal";
import type { Enrollment } from "../../types/enrollment.types";
import { PageHeader, StatusTag } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { Text } = Typography;

const EnrollmentRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { message: msgApi } = App.useApp();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      msgApi.warning("Bạn không có quyền truy cập trang này");
      const redirectPath =
        user.role === "teacher" ? "/dashboard/teacher" : "/dashboard/student";
      navigate(redirectPath, { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchEnrollments();
    }
  }, [statusFilter, user]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await axiosInstance.get("/enrollments", { params });
      setEnrollments(response.data.data || []);
    } catch (err: unknown) {
      console.error("Error fetching enrollments:", err);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        msgApi.error(axiosError.response?.data?.message || "Không thể tải danh sách");
      } else {
        msgApi.error("Không thể tải danh sách đăng ký học");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    if (status === "approved") return { label: "Đã phê duyệt", type: "success" as const };
    if (status === "rejected") return { label: "Đã từ chối", type: "error" as const };
    return { label: "Đang chờ duyệt", type: "warning" as const };
  };

  const getCourseName = (courseId: Enrollment["courseId"]): { name: string; isDeleted: boolean } => {
    if (!courseId) return { name: "Khóa học đã bị xóa", isDeleted: true };
    if (typeof courseId === "object" && courseId !== null && "name" in courseId) {
      return { name: courseId.name, isDeleted: false };
    }
    return { name: "N/A", isDeleted: false };
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

  const filteredEnrollments = useMemo(() => {
    if (!searchQuery.trim()) return enrollments;
    const q = searchQuery.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.studentName?.toLowerCase().includes(q) ||
        e.studentEmail?.toLowerCase().includes(q) ||
        (typeof e.courseId === "object" &&
          e.courseId !== null &&
          "name" in e.courseId &&
          e.courseId.name?.toLowerCase().includes(q))
    );
  }, [enrollments, searchQuery]);

  const columns: ColumnsType<Enrollment> = [
    {
      title: "Họ tên",
      dataIndex: "studentName",
      key: "studentName",
      width: 220,
      render: (name: string, record) => (
        <Space size={10}>
          <Avatar
            size={36}
            style={{
              background: brandColors.redSoft,
              color: brandColors.red,
              fontWeight: 600,
            }}
          >
            {(name || "U").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{name || "N/A"}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.studentEmail || "N/A"}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Khóa học",
      key: "course",
      render: (_, record) => {
        const { name, isDeleted } = getCourseName(record.courseId);
        return (
          <Space size={4} wrap>
            <Text style={{ fontWeight: isDeleted ? 400 : 500 }}>{name}</Text>
            {isDeleted && (
              <Tag color="error" style={{ margin: 0 }}>
                Đã xóa
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Ngày đăng ký",
      key: "createdAt",
      width: 140,
      render: (_, record) =>
        record.createdAt
          ? new Date(record.createdAt).toLocaleDateString("vi-VN")
          : "N/A",
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 160,
      render: (_, record) => {
        const info = getStatusInfo(record.status);
        return <StatusTag status={info.type} text={info.label} />;
      },
    },
    {
      title: "",
      key: "actions",
      width: 140,
      align: "right",
      render: (_, record) => (
        <Button
          type="default"
          size="small"
          icon={<FileText size={14} />}
          onClick={() => handleViewDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const statusOptions = [
    { label: "Chờ duyệt", value: "pending" },
    { label: "Đã duyệt", value: "approved" },
    { label: "Đã từ chối", value: "rejected" },
    { label: "Tất cả", value: "" },
  ];

  return (
    <div>
      <PageHeader
        icon={Inbox}
        title="Yêu cầu ghi danh"
        subtitle="Quản lý và phê duyệt các yêu cầu đăng ký khóa học từ học viên"
      />

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
              placeholder="Tìm theo tên, email, khóa học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12} lg={14}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Segmented
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as string)}
                options={statusOptions}
              />
              <Button
                icon={<RefreshCw size={16} />}
                onClick={fetchEnrollments}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredEnrollments}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} yêu cầu`,
            size: "small",
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có yêu cầu đăng ký học nào"
              />
            ),
          }}
        />
      </Card>

      {selectedEnrollment && (
        <EnrollmentDetailModal
          open={modalOpen}
          enrollment={selectedEnrollment}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default EnrollmentRequestsPage;
