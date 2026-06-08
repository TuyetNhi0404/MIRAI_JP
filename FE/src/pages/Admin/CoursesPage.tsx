import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  RefreshCw,
  CalendarDays,
  Edit,
  Trash2,
  MoreVertical,
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import {
  App,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Pagination,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import { courseService, type Course } from "../../services/courseService";
import { PageHeader, StatCard, EmptyState } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { Text, Title } = Typography;

type FilterStatus = "all" | "not_yet" | "in_progress" | "complete";

const STATUS_MAP: Record<
  Course["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  not_yet: {
    label: "Chưa bắt đầu",
    color: brandColors.warning,
    bg: "#FFFBE6",
    border: "#FFE58F",
  },
  in_progress: {
    label: "Đang học",
    color: brandColors.info,
    bg: "#E6F4FF",
    border: "#91CAFF",
  },
  complete: {
    label: "Hoàn thành",
    color: brandColors.success,
    bg: "#F6FFED",
    border: "#B7EB8F",
  },
};

const formatDateFixed = (input?: string) => {
  if (!input) return "-";
  try {
    const d = new Date(input);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { modal, message: msgApi } = App.useApp();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6); // 6 courses per page (2 rows of 3 on desktop)

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const allCourses = await courseService.getAll();
      setCourses(allCourses);
    } catch (err: unknown) {
      console.error("Error loading courses:", err);
      const message = err instanceof Error ? err.message : "Tải danh sách khóa học thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    const state = location.state as
      | { message?: string; type?: "create" | "update" }
      | null;
    if (state?.message) {
      msgApi.success(state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        const performSearch = async () => {
          setLoading(true);
          setError(null);
          try {
            const results = await courseService.search(searchQuery.trim());
            setCourses(results);
    } catch (err: unknown) {
      console.error("Error searching courses:", err);
      const message = err instanceof Error ? err.message : "Tìm kiếm khóa học thất bại";
      setError(message);
    } finally {
            setLoading(false);
          }
        };
        performSearch();
      } else {
        loadCourses();
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await modal.confirm({
      title: "Xác nhận xóa khóa học",
      content: `Bạn có chắc chắn muốn xóa khóa học "${name}"?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      await courseService.delete(id);
      msgApi.success(`Đã xóa khóa học "${name}"`);
      await loadCourses();
    } catch (err: unknown) {
      console.error("Error deleting course:", err);
      const message = err instanceof Error ? err.message : "Xóa khóa học thất bại";
      msgApi.error(message);
      setError(message);
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => navigate(`/dashboard/admin/courses/${id}/edit`);
  const handleCreate = () => navigate("/dashboard/admin/courses/new");
  const handleViewStudents = (course: Course) => {
    const courseId = course._id || course.id || "";
    navigate(`/dashboard/admin/courses/${courseId}/students`);
  };

  const filteredCourses = useMemo(
    () =>
      courses.filter((c) => {
        if (filterStatus === "all") return true;
        return c.status === filterStatus;
      }),
    [courses, filterStatus]
  );

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCourses.slice(startIndex, startIndex + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = courses.length;
    const active = courses.filter((c) => c.status === "in_progress").length;
    const upcoming = courses.filter((c) => c.status === "not_yet").length;
    const completed = courses.filter((c) => c.status === "complete").length;
    return { total, active, upcoming, completed };
  }, [courses]);

  const filterOptions: { label: string; value: FilterStatus }[] = [
    { label: `Tất cả (${stats.total})`, value: "all" },
    { label: `Đang học (${stats.active})`, value: "in_progress" },
    { label: `Sắp khai giảng (${stats.upcoming})`, value: "not_yet" },
    { label: `Hoàn thành (${stats.completed})`, value: "complete" },
  ];

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Quản lý khóa học"
        subtitle="Theo dõi, chỉnh sửa và quản lý toàn bộ khóa học trong hệ thống"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={handleCreate}
          >
            Thêm khóa học
          </Button>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }} className="mira-stagger">
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Tổng khóa học"
            value={stats.total}
            icon={BookOpen}
            accent="primary"
            loading={loading && courses.length === 0}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Đang học"
            value={stats.active}
            icon={BarChart3}
            accent="info"
            loading={loading && courses.length === 0}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Sắp khai giảng"
            value={stats.upcoming}
            icon={CalendarDays}
            accent="warning"
            loading={loading && courses.length === 0}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Hoàn thành"
            value={stats.completed}
            icon={GraduationCap}
            accent="success"
            loading={loading && courses.length === 0}
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
              placeholder="Tìm kiếm khóa học theo tên, giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12} lg={14}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Segmented
                value={filterStatus}
                onChange={(v) => setFilterStatus(v as FilterStatus)}
                options={filterOptions}
              />
              <Button
                icon={<RefreshCw size={16} />}
                onClick={loadCourses}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {loading && courses.length === 0 ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Không tìm thấy khóa học" : "Chưa có khóa học nào"}
          description={
            searchQuery
              ? "Thử từ khóa khác hoặc xóa bộ lọc để xem tất cả"
              : "Bắt đầu tạo khóa học đầu tiên cho trung tâm của bạn"
          }
          icon={BookOpen}
          action={!searchQuery ? { label: "Tạo khóa học", onClick: handleCreate } : undefined}
        />
      ) : (
        <>
          <Row gutter={[16, 16]} className="mira-stagger">
            {paginatedCourses.map((course) => {
            const status = STATUS_MAP[course.status];
            const id = course._id || course.id || "";
            const enrolledPct = Math.min(
              100,
              (course.enrolledCount / course.capacity) * 100
            );
            const isEditable = course.status === "not_yet";

            const actionItems: MenuProps["items"] = isEditable
              ? [
                  {
                    key: "edit",
                    label: "Chỉnh sửa",
                    icon: <Edit size={16} />,
                    onClick: () => handleEdit(id),
                  },
                  { type: "divider" },
                  {
                    key: "delete",
                    label: "Xóa",
                    icon: <Trash2 size={16} />,
                    danger: true,
                    onClick: () => handleDelete(id, course.name),
                  },
                ]
              : [];

            return (
              <Col xs={24} md={12} lg={8} key={id}>
                <Card
                  hoverable
                  className="mira-card-hover"
                  onClick={() => handleViewStudents(course)}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${brandColors.border}`,
                    height: "100%",
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <Space size={10} align="center">
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: brandColors.redSoft,
                          color: brandColors.red,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <BookOpen size={18} strokeWidth={2} />
                      </div>
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        Khóa học
                      </Text>
                    </Space>
                    {isEditable && actionItems.length > 0 && (
                      <Dropdown
                        menu={{
                          items: actionItems,
                          onClick: (info) => info.domEvent.stopPropagation(),
                        }}
                        trigger={["click"]}
                        placement="bottomRight"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreVertical size={16} />}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="More actions"
                        />
                      </Dropdown>
                    )}
                  </div>

                  <Title
                    level={5}
                    style={{
                      margin: 0,
                      marginBottom: 12,
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      minHeight: "2.7em",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {course.name}
                  </Title>

                  <div
                    style={{
                      borderTop: `1px solid ${brandColors.borderLight}`,
                      paddingTop: 12,
                    }}
                  >
                    <Row gutter={[8, 8]}>
                      <Col span={24}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                          }}
                        >
                          <Text type="secondary">Giáo viên chủ nhiệm</Text>
                          <Text strong style={{ textAlign: "right" }}>
                            {course.homeroomTeacher || "-"}
                          </Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Ca học
                        </Text>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {course.session ?? 0}
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Sức chứa
                        </Text>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {course.capacity}
                        </div>
                      </Col>
                    </Row>

                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: brandColors.redSoft,
                        border: `1px solid #FFD6D6`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Space size={6}>
                          <Users size={13} color={brandColors.textSecondary} />
                          <Text
                            type="secondary"
                            style={{ fontSize: 12, fontWeight: 500 }}
                          >
                            Đã ghi danh
                          </Text>
                        </Space>
                        <Text
                          strong
                          style={{
                            color: brandColors.red,
                            fontSize: 14,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {course.enrolledCount}
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                            / {course.capacity}
                          </Text>
                        </Text>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          borderRadius: 99,
                          background: "#FFD6D6",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${enrolledPct}%`,
                            height: "100%",
                            background: brandColors.red,
                            borderRadius: "inherit",
                            transition: "width 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 12,
                        fontSize: 12,
                        color: brandColors.textSecondary,
                      }}
                    >
                      <span>
                        <CalendarDays
                          size={12}
                          style={{ verticalAlign: "middle", marginRight: 4 }}
                        />
                        {formatDateFixed(course.startDate)}
                      </span>
                      <span>→ {formatDateFixed(course.endDate)}</span>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: `1px dashed ${brandColors.border}`,
                      }}
                    >
                      <Tag
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: status.bg,
                          color: status.color,
                          border: `1px solid ${status.border}`,
                          margin: 0,
                        }}
                      >
                        {status.label}
                      </Tag>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 32,
            marginBottom: 16,
          }}
        >
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredCourses.length}
            onChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            showSizeChanger={false}
          />
        </div>
        </>
      )}
    </div>
  );
};

export default CoursesPage;
