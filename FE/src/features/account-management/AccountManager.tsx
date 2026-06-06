import React, { useState, useEffect, useMemo } from "react";
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
  Tabs,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Search,
  Plus,
  RefreshCw,
  Users as UsersIcon,
  UserCheck,
  UserCog,
} from "lucide-react";
import { userService } from "../../services/accountService";
import type { User } from "../../types/account.types";
import { AccountLock } from "./AccountLock";
import { AddAccountUsers } from "./AddAccountUsers";
import { PageHeader, StatCard, StatusTag } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { Text } = Typography;

const roleLabels: Record<string, string> = {
  student: "Học viên",
  teacher: "Giáo viên",
  admin: "Quản trị viên",
};

const ITEMS_PER_PAGE = 10;

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

export default function AccountManagement() {
  const { message: msgApi } = App.useApp();
  const [selectedRole, setSelectedRole] =
    useState<"student" | "teacher" | "admin">("teacher");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "locked">(
    "all"
  );
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openAddModal, setOpenAddModal] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      const userList = res?.users || [];
      setUsers(userList);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      msgApi.error("Không thể tải danh sách người dùng");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roleStats = useMemo(() => {
    const byRole = { student: 0, teacher: 0, admin: 0 };
    users.forEach((u) => {
      if (u.role in byRole) byRole[u.role as keyof typeof byRole]++;
    });
    return byRole;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const roleMatch = user.role === selectedRole;
      const statusMatch =
        selectedStatus === "all" || user.status === selectedStatus;
      const searchMatch =
        !searchLower ||
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower));
      return roleMatch && statusMatch && searchMatch;
    });
  }, [users, selectedRole, selectedStatus, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedStatus, searchQuery]);

  const handleStatusChange = async (
    userId: string,
    newStatus: "active" | "locked"
  ) => {
    try {
      await userService.toggleStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
      );
      msgApi.success(
        `Tài khoản đã được ${newStatus === "locked" ? "khóa" : "mở khóa"} thành công`
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      msgApi.error("Không thể cập nhật trạng thái tài khoản");
    }
  };

  const handleAddAccount = async (email: string, name: string) => {
    try {
      await userService.create({ name, email, role: selectedRole });
      await fetchUsers();
      setOpenAddModal(false);
      msgApi.success("Tạo tài khoản thành công");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tạo tài khoản";
      msgApi.error(errorMessage);
      throw error;
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: "Họ tên",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (name: string, record) => (
        <Space size={10}>
          <Avatar
            size={36}
            src={record.avatar || undefined}
            style={{
              background: brandColors.redSoft,
              color: brandColors.red,
              fontWeight: 600,
            }}
          >
            {(name || "U").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 160,
      render: (_, record) => (
        <StatusTag
          status={record.status === "active" ? "success" : "error"}
          text={record.status === "active" ? "Đang hoạt động" : "Đã khóa"}
        />
      ),
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      width: 140,
      render: (_, record) =>
        record.createdAt ? formatDate(record.createdAt) : "N/A",
    },
    {
      title: "",
      key: "actions",
      width: 140,
      align: "right",
      render: (_, record) => (
        <AccountLock user={record} onStatusChange={handleStatusChange} />
      ),
    },
  ];

  const statCards = [
    {
      role: "student" as const,
      label: "Học viên",
      icon: UsersIcon,
      accent: "info" as const,
    },
    {
      role: "teacher" as const,
      label: "Giáo viên",
      icon: UserCog,
      accent: "primary" as const,
    },
    {
      role: "admin" as const,
      label: "Quản trị viên",
      icon: UserCheck,
      accent: "success" as const,
    },
  ];

  const tabsItems = [
    { key: "student", label: `Học viên (${roleStats.student})` },
    { key: "teacher", label: `Giáo viên (${roleStats.teacher})` },
    { key: "admin", label: `Quản trị viên (${roleStats.admin})` },
  ];

  return (
    <div>
      <PageHeader
        icon={UsersIcon}
        title="Quản lý người dùng"
        subtitle="Quản lý tài khoản học viên, giáo viên và quản trị viên"
        extra={
          <Space>
            <Button
              icon={<RefreshCw size={16} />}
              onClick={fetchUsers}
              loading={loading}
            >
              Làm mới
            </Button>
            {selectedRole !== "student" && (
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => setOpenAddModal(true)}
              >
                Thêm {roleLabels[selectedRole]}
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }} className="mira-stagger">
        {statCards.map((s) => (
          <Col xs={24} sm={8} key={s.role}>
            <StatCard
              label={s.label}
              value={roleStats[s.role]}
              icon={s.icon}
              accent={s.accent}
              loading={loading && users.length === 0}
            />
          </Col>
        ))}
      </Row>

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
          marginBottom: 20,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={selectedRole}
          onChange={(k) => setSelectedRole(k as "student" | "teacher" | "admin")}
          items={tabsItems}
          size="large"
          tabBarStyle={{ padding: "0 20px", margin: 0, fontWeight: 500 }}
        />
        <div style={{ padding: 16, borderTop: `1px solid ${brandColors.borderLight}` }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={14} lg={12}>
              <Input
                allowClear
                size="large"
                prefix={
                  <Search size={16} color={brandColors.textTertiary} />
                }
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Col>
            <Col xs={24} md={10} lg={12}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <Segmented
                  value={selectedStatus}
                  onChange={(v) => setSelectedStatus(v as "all" | "active" | "locked")}
                  options={[
                    { label: "Tất cả", value: "all" },
                    { label: "Đang hoạt động", value: "active" },
                    { label: "Đã khóa", value: "locked" },
                  ]}
                />
              </div>
            </Col>
          </Row>
        </div>
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
          dataSource={filteredUsers}
          loading={loading}
          scroll={{ x: 700 }}
          pagination={{
            current: currentPage,
            pageSize: ITEMS_PER_PAGE,
            total: filteredUsers.length,
            onChange: setCurrentPage,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} ${roleLabels[selectedRole].toLowerCase()}`,
            size: "small",
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchQuery
                    ? `Không tìm thấy kết quả phù hợp với "${searchQuery}"`
                    : "Chưa có dữ liệu"
                }
              />
            ),
          }}
        />
      </Card>

      <AddAccountUsers
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddAccount}
        role={selectedRole === "student" ? "teacher" : selectedRole}
      />
    </div>
  );
}
