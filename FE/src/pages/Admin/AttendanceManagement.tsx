import React, { useState, useMemo, useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Grid,
  List,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Empty,
  DatePicker,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Menu as MenuIcon,
  RotateCcw,
  UserCheck,
  ClipboardCheck,
  TrendingUp,
  CheckCircle2,
  Hourglass,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns,
} from "lucide-react";
import { useScheduleData } from "../../hooks/useScheduleData";
import { AttendanceDialog } from "../../features/attendance-management/AttendanceDialog";
import type {
  Calendar,
  PopulatedCourse,
  PopulatedSession,
  PopulatedTeacher,
} from "../../types/schedule.types";
import { PageHeader, StatCard } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

type ViewMode = "day" | "week" | "month";

const COURSE_COLORS = [
  { accent: "#B90000", soft: "#FFF1F0" },
  { accent: "#1677FF", soft: "#E6F4FF" },
  { accent: "#52C41A", soft: "#F6FFED" },
  { accent: "#FAAD14", soft: "#FFFBE6" },
  { accent: "#722ED1", soft: "#F9F0FF" },
  { accent: "#EB2F96", soft: "#FFF0F6" },
  { accent: "#13C2C2", soft: "#E6FFFB" },
  { accent: "#FA541C", soft: "#FFF2E8" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  not_yet: { label: "Chưa bắt đầu", color: brandColors.textSecondary, bg: brandColors.borderLight, dot: "#BFBFBF" },
  in_progress: { label: "Đang học", color: brandColors.warning, bg: "#FFFBE6", dot: "#FAAD14" },
  completed: { label: "Đã xong", color: brandColors.success, bg: "#F6FFED", dot: "#52C41A" },
  cancelled: { label: "Đã hủy", color: brandColors.error, bg: "#FFF1F0", dot: "#FF4D4F" },
};

const getStatusMeta = (status?: string) => {
  if (!status) return { label: "—", color: brandColors.textSecondary, bg: brandColors.borderLight, dot: "#BFBFBF" };
  return STATUS_META[status] || { label: status.replace(/_/g, " "), color: brandColors.textSecondary, bg: brandColors.borderLight, dot: "#BFBFBF" };
};

export default function ManageScheduleWithAttendance() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;

  const { calendars, loading, error: fetchError } = useScheduleData();
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedCalendarForAttendance, setSelectedCalendarForAttendance] =
    useState<Calendar | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  useEffect(() => {
    if (isMobile) setViewMode("day");
    else if (isTablet) setViewMode("week");
  }, [isMobile, isTablet]);

  const extractId = (
    value: string | PopulatedCourse | PopulatedSession | PopulatedTeacher | undefined
  ): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && "_id" in value) return value._id;
    return "";
  };

  const getScheduleColor = (courseId: string) => {
    const uniqueCourses = [
      ...new Set(calendars.map((c: Calendar) => extractId(c.courseId))),
    ];
    const index = uniqueCourses.indexOf(courseId);
    return COURSE_COLORS[index % COURSE_COLORS.length];
  };

  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate((d) => d.subtract(1, "month"));
    else if (viewMode === "week") setCurrentDate((d) => d.subtract(1, "week"));
    else setCurrentDate((d) => d.subtract(1, "day"));
  };

  const handleNext = () => {
    if (viewMode === "month") setCurrentDate((d) => d.add(1, "month"));
    else if (viewMode === "week") setCurrentDate((d) => d.add(1, "week"));
    else setCurrentDate((d) => d.add(1, "day"));
  };

  const handleDateSelect = (d: Dayjs) => {
    setCurrentDate(d);
  };

  const handleOpenAttendance = (schedule: Calendar) => {
    setSelectedCalendarForAttendance(schedule);
    setAttendanceDialogOpen(true);
  };

  const uniqueCourses = useMemo(() => {
    const map = new Map<string, PopulatedCourse>();
    calendars.forEach((c) => {
      if (typeof c.courseId === "object" && c.courseId) {
        const id = extractId(c.courseId);
        if (!map.has(id)) map.set(id, c.courseId);
      }
    });
    return Array.from(map.values());
  }, [calendars, extractId]);

  const stats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const todaySessions = calendars.filter((c) => dayjs(c.date as any).format("YYYY-MM-DD") === today);
    const completed = todaySessions.filter((c) => c.status === "completed").length;
    const inProgress = todaySessions.filter((c) => c.status === "in_progress").length;
    const upcoming = todaySessions.filter((c) => c.status === "not_yet").length;
    const completionRate = todaySessions.length > 0
      ? Math.round((completed / todaySessions.length) * 100)
      : 0;
    return { total: todaySessions.length, completed, inProgress, upcoming, completionRate };
  }, [calendars]);

  const filteredCalendars = useMemo(() => {
    if (courseFilter === "all") return calendars;
    return calendars.filter((c) => extractId(c.courseId) === courseFilter);
  }, [calendars, courseFilter, extractId]);

  const getHeaderTitle = () => {
    if (viewMode === "month") return currentDate.format("Tháng M, YYYY");
    if (viewMode === "week") {
      const start = currentDate.startOf("week");
      const end = currentDate.endOf("week");
      if (start.month() === end.month()) {
        return `${start.format("D")} – ${end.format("D")} ${end.format("M, YYYY")}`;
      }
      return `${start.format("D/M")} – ${end.format("D/M/YYYY")}`;
    }
    return currentDate.format("dddd, D MMMM YYYY");
  };

  const renderScheduleCard = (schedule: Calendar, compact = false) => {
    const course =
      typeof schedule.courseId === "object"
        ? (schedule.courseId as PopulatedCourse)
        : null;
    const teacher =
      typeof schedule.teacherId === "object"
        ? (schedule.teacherId as PopulatedTeacher)
        : null;
    const session =
      typeof schedule.sessionId === "object"
        ? (schedule.sessionId as PopulatedSession)
        : null;
    const courseId = extractId(schedule.courseId);
    const palette = getScheduleColor(courseId);
    const status = getStatusMeta(schedule.status);
    const timeRange = session?.startTime && session?.endTime
      ? `${session.startTime} – ${session.endTime}`
      : session?.startTime || null;

    if (compact) {
      return (
        <div
          key={schedule._id}
          className="mira-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAttendance(schedule);
          }}
          style={{
            background: palette.soft,
            borderLeft: `2px solid ${palette.accent}`,
            borderRadius: 4,
            padding: "3px 6px",
            marginBottom: 2,
            cursor: "pointer",
            fontSize: 10.5,
            lineHeight: 1.3,
            transition: "transform 160ms ease, box-shadow 160ms ease",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(2px)";
            e.currentTarget.style.boxShadow = `0 2px 6px ${palette.accent}25`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          title={`${timeRange || ""} · ${course?.name || ""} · ${status.label}`}
        >
          {timeRange && (
            <span style={{ fontWeight: 600, color: palette.accent, marginRight: 4 }}>
              {timeRange}
            </span>
          )}
          <span style={{ color: brandColors.textPrimary }}>
            {course?.name || "Khóa học"}
          </span>
        </div>
      );
    }

    return (
      <div
        key={schedule._id}
        className="mira-fade-in mira-card-hover"
        style={{
          background: brandColors.paper,
          border: `1px solid ${brandColors.border}`,
          borderLeft: `3px solid ${palette.accent}`,
          marginBottom: 8,
          borderRadius: 8,
          padding: "10px 12px",
          cursor: "pointer",
        }}
        onClick={() => handleOpenAttendance(schedule)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.25,
              color: brandColors.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}>
              {course?.name || course?.courseName || "Khóa học"}
            </div>
          </div>
          <Tooltip title="Điểm danh">
            <Button
              size="small"
              type="primary"
              icon={<UserCheck size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAttendance(schedule);
              }}
              style={{
                height: 26,
                padding: "0 10px",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {!isMobile && "Điểm danh"}
            </Button>
          </Tooltip>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {timeRange && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: brandColors.textSecondary,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}>
              <Clock size={11} strokeWidth={2.2} />
              {timeRange}
            </span>
          )}
          {teacher?.name && (
            <span style={{
              fontSize: 11,
              color: brandColors.textTertiary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 120,
            }}>
              · {teacher.name}
            </span>
          )}
        </div>

        <div style={{ marginTop: 6 }}>
          <span style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 4,
            background: status.bg,
            color: status.color,
            letterSpacing: 0.2,
          }}>
            {status.label}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Quản lý điểm danh"
        subtitle="Theo dõi buổi học và điểm danh học viên theo lịch"
        extra={
          <Space wrap>
            <Button
              icon={<RotateCcw size={16} />}
              onClick={() => {
                setCurrentDate(dayjs());
              }}
            >
              Hôm nay
            </Button>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { label: "Ngày", value: "day" },
                { label: "Tuần", value: "week" },
                { label: "Tháng", value: "month" },
              ]}
            />
          </Space>
        }
      />

      {fetchError && (
        <Alert
          type="error"
          message={fetchError}
          showIcon
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} className="mira-stagger">
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Buổi học hôm nay"
            value={stats.total}
            icon={CalendarDays}
            accent="primary"
            hint="Tổng số ca hôm nay"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Đã hoàn thành"
            value={stats.completed}
            icon={CheckCircle2}
            accent="success"
            hint={`${stats.completed}/${stats.total} buổi`}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Đang diễn ra"
            value={stats.inProgress}
            icon={Hourglass}
            accent="warning"
            hint="Đang trong giờ học"
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard
            label="Tỷ lệ hoàn thành"
            value={`${stats.completionRate}%`}
            icon={TrendingUp}
            accent="info"
            hint="Trong ngày hôm nay"
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24}>
          <Card
            style={{
              borderRadius: 12,
              border: `1px solid ${brandColors.border}`,
              marginBottom: 12,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} md={14}>
                <Space size={6} wrap>
                  <Tooltip title="Trước">
                    <Button shape="circle" type="text" icon={<ChevronLeft size={18} />} onClick={handlePrev} />
                  </Tooltip>
                  <div style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: brandColors.bg,
                    border: `1px solid ${brandColors.borderLight}`,
                    textAlign: "center",
                    minWidth: 180,
                    textTransform: "capitalize",
                  }}>
                    <Text strong style={{ fontSize: 14, color: brandColors.textPrimary }}>
                      {getHeaderTitle()}
                    </Text>
                  </div>
                  <Tooltip title="Sau">
                    <Button shape="circle" type="text" icon={<ChevronRight size={18} />} onClick={handleNext} />
                  </Tooltip>
                  <DatePicker
                    value={currentDate}
                    onChange={(d) => d && handleDateSelect(d)}
                    allowClear={false}
                    format="DD/MM/YYYY"
                    size="middle"
                    style={{ minWidth: 130 }}
                    suffixIcon={<CalendarIcon size={14} />}
                  />
                </Space>
              </Col>
              <Col xs={24} md={10} style={{ textAlign: isMobile ? "left" : "right" }}>
                <Space size={6} wrap>
                  {uniqueCourses.length > 0 && (
                    <Segmented
                      value={courseFilter}
                      onChange={(v) => setCourseFilter(v as string)}
                      options={[
                        { label: `Tất cả (${calendars.length})`, value: "all" },
                        ...uniqueCourses.slice(0, 4).map((c) => ({
                          label: c.name,
                          value: c._id,
                        })),
                      ]}
                    />
                  )}
                  {isMobile && (
                    <Button icon={<MenuIcon size={16} />} onClick={() => setMobileMenuOpen(true)}>
                      Lọc
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>

          <Card
            style={{
              borderRadius: 12,
              border: `1px solid ${brandColors.border}`,
              overflow: "hidden",
            }}
            styles={{ body: { padding: 0 } }}
          >
            {filteredCalendars.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary">
                    {courseFilter !== "all"
                      ? "Không có buổi học nào cho khóa học này"
                      : "Chưa có buổi học nào được lên lịch"}
                  </Text>
                }
                style={{ padding: "60px 20px" }}
              />
            ) : viewMode === "day" ? (
              <DayTimeline
                currentDate={currentDate}
                calendars={filteredCalendars}
                isMobile={isMobile}
                renderScheduleCard={renderScheduleCard}
              />
            ) : viewMode === "week" ? (
              <WeekBoard
                currentDate={currentDate}
                calendars={filteredCalendars}
                isMobile={isMobile}
                isTablet={isTablet}
                renderScheduleCard={renderScheduleCard}
                onSelectDate={(d) => {
                  handleDateSelect(d);
                  setViewMode("day");
                }}
              />
            ) : (
              <MonthGrid
                currentDate={currentDate}
                calendars={filteredCalendars}
                onSelectDate={(d) => {
                  handleDateSelect(d);
                  setViewMode("day");
                }}
                getScheduleColor={getScheduleColor}
                extractId={extractId}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Drawer
        title="Chọn chế độ xem"
        placement="bottom"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <List
          dataSource={[
            { key: "day", label: "Xem theo ngày", icon: <Clock size={18} /> },
            { key: "week", label: "Xem theo tuần", icon: <Columns size={18} /> },
            { key: "month", label: "Xem theo tháng", icon: <LayoutGrid size={18} /> },
          ]}
          renderItem={(item) => (
            <List.Item
              onClick={() => {
                setViewMode(item.key as ViewMode);
                setMobileMenuOpen(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <Space>
                {item.icon}
                <Text>{item.label}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>

      <AttendanceDialog
        open={attendanceDialogOpen}
        onClose={() => {
          setAttendanceDialogOpen(false);
          setSelectedCalendarForAttendance(null);
        }}
        calendar={selectedCalendarForAttendance}
      />
    </div>
  );
}

interface DayTimelineProps {
  currentDate: Dayjs;
  calendars: Calendar[];
  isMobile: boolean;
  renderScheduleCard: (s: Calendar, compact?: boolean) => React.ReactNode;
}

function DayTimeline({ currentDate, calendars, isMobile, renderScheduleCard }: DayTimelineProps) {
  const dateKey = currentDate.format("YYYY-MM-DD");
  const isToday = currentDate.isSame(dayjs(), "day");

  const daySchedules = calendars
    .filter((c) => dayjs(c.date as any).format("YYYY-MM-DD") === dateKey)
    .sort((a, b) => {
      const sa = typeof a.sessionId === "object" ? a.sessionId.startTime || "" : "";
      const sb = typeof b.sessionId === "object" ? b.sessionId.startTime || "" : "";
      return sa.localeCompare(sb);
    });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const getSessionForHour = (hour: number) => {
    return daySchedules.filter((s) => {
      if (typeof s.sessionId !== "object") return false;
      const start = parseInt(s.sessionId.startTime?.split(":")[0] || "0");
      const end = parseInt(s.sessionId.endTime?.split(":")[0] || "0");
      return start <= hour && hour < end;
    });
  };

  return (
    <div className="mira-fade-in">
      <div
        style={{
          padding: "16px 20px",
          background: isToday
            ? `linear-gradient(135deg, ${brandColors.red}, ${brandColors.redDark})`
            : brandColors.bg,
          color: isToday ? "#fff" : brandColors.textPrimary,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 90% 20%, rgba(255,255,255,0.18), transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          {isToday && (
            <Tag color="white" style={{ color: brandColors.red, border: "none", fontWeight: 700, fontSize: 10, margin: 0 }}>
              HÔM NAY
            </Tag>
          )}
          <div>
            <Text strong style={{ color: "inherit", display: "block", fontSize: 16, textTransform: "capitalize" }}>
              {currentDate.format("dddd")}
            </Text>
            <Text style={{ color: "inherit", fontSize: 13, opacity: 0.9 }}>
              {daySchedules.length} buổi học
            </Text>
          </div>
        </div>
      </div>

      {daySchedules.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">Chưa có buổi học nào trong ngày này</Text>}
          />
        </div>
      ) : isMobile ? (
        <div style={{ padding: 12 }} className="mira-stagger">
          {daySchedules.map((s) => renderScheduleCard(s, false))}
        </div>
      ) : (
        <div style={{ padding: 20, position: "relative" }}>
          <div style={{ position: "absolute", left: 76, top: 20, bottom: 20, width: 1, background: brandColors.borderLight }} />
          <div className="mira-stagger">
            {hours.map((hour) => {
              const sessions = getSessionForHour(hour);
              return (
                <div
                  key={hour}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 16,
                    minHeight: sessions.length > 0 ? 60 : 36,
                    alignItems: "flex-start",
                    padding: "4px 0",
                  }}
                >
                  <div style={{
                    textAlign: "right",
                    fontSize: 11,
                    fontWeight: 600,
                    color: brandColors.textTertiary,
                    paddingTop: sessions.length > 0 ? 8 : 0,
                  }}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div style={{ position: "relative", paddingLeft: 12 }}>
                    {sessions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: -4,
                          top: 14,
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: brandColors.red,
                          border: `2px solid ${brandColors.paper}`,
                          boxShadow: `0 0 0 2px ${brandColors.redSoft}`,
                        }}
                      />
                    )}
                    {sessions.map((s) => renderScheduleCard(s, false))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface WeekBoardProps {
  currentDate: Dayjs;
  calendars: Calendar[];
  isMobile: boolean;
  isTablet: boolean;
  renderScheduleCard: (s: Calendar, compact?: boolean) => React.ReactNode;
  onSelectDate: (d: Dayjs) => void;
}

function WeekBoard({ currentDate, calendars, isMobile, isTablet, renderScheduleCard, onSelectDate }: WeekBoardProps) {
  const start = currentDate.startOf("week");
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));

  if (isMobile) {
    return (
      <div style={{ padding: 12 }} className="mira-stagger">
        {days.map((d) => {
          const isToday = d.isSame(dayjs(), "day");
          const daySchedules = calendars.filter((c) => dayjs(c.date as any).format("YYYY-MM-DD") === d.format("YYYY-MM-DD"));
          return (
            <div
              key={d.format("YYYY-MM-DD")}
              onClick={() => onSelectDate(d)}
              style={{
                marginBottom: 12,
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${isToday ? brandColors.red : brandColors.border}`,
                background: brandColors.paper,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
              className="mira-card-hover"
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: isToday
                    ? `linear-gradient(135deg, ${brandColors.red}, ${brandColors.redDark})`
                    : brandColors.bg,
                  color: isToday ? "white" : brandColors.textPrimary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(circle at 90% 50%, rgba(255,255,255,0.15), transparent 50%)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <Text strong style={{ color: "inherit", display: "block", fontSize: 14, textTransform: "capitalize" }}>
                    {d.format("dddd")}
                  </Text>
                  <Text style={{ color: "inherit", fontSize: 12, opacity: 0.9 }}>
                    {d.format("DD/MM")}
                  </Text>
                </div>
                <Tag
                  style={{
                    position: "relative",
                    background: isToday ? "rgba(255,255,255,0.25)" : brandColors.paper,
                    color: isToday ? "#fff" : brandColors.textSecondary,
                    border: isToday ? "none" : `1px solid ${brandColors.border}`,
                    fontWeight: 600,
                  }}
                >
                  {daySchedules.length} buổi
                </Tag>
              </div>
              <div style={{ padding: 10 }}>
                {daySchedules.length > 0 ? (
                  <div className="mira-stagger">
                    {daySchedules.map((s) => renderScheduleCard(s, false))}
                  </div>
                ) : (
                  <div style={{ padding: 8, textAlign: "center" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Chưa có buổi học</Text>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mira-fade-in">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(7, 1fr)`,
          minWidth: "fit-content",
          width: "100%",
          borderBottom: `1px solid ${brandColors.borderLight}`,
        }}
      >
        {days.map((d) => {
          const isToday = d.isSame(dayjs(), "day");
          return (
            <div
              key={d.format("YYYY-MM-DD")}
              style={{
                padding: isTablet ? 10 : 12,
                background: isToday ? brandColors.redSoft : brandColors.bg,
                textAlign: "center",
                borderRight: `1px solid ${brandColors.borderLight}`,
                position: "relative",
                minWidth: 130,
                textTransform: "capitalize",
              }}
            >
              {isToday && (
                <div style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: brandColors.red,
                }} />
              )}
              <Text strong style={{ display: "block", color: isToday ? brandColors.red : brandColors.textPrimary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {d.format("ddd")}
              </Text>
              <Text type="secondary" style={{ color: isToday ? brandColors.red : undefined, fontSize: 11, fontWeight: isToday ? 600 : undefined }}>
                {d.format("DD/MM")}
              </Text>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(7, 1fr)`,
          minWidth: "fit-content",
          width: "100%",
        }}
      >
        {days.map((d) => {
          const isToday = d.isSame(dayjs(), "day");
          const daySchedules = calendars
            .filter((c) => dayjs(c.date as any).format("YYYY-MM-DD") === d.format("YYYY-MM-DD"))
            .sort((a, b) => {
              const sa = typeof a.sessionId === "object" ? a.sessionId.startTime || "" : "";
              const sb = typeof b.sessionId === "object" ? b.sessionId.startTime || "" : "";
              return sa.localeCompare(sb);
            });
          return (
            <div
              key={d.format("YYYY-MM-DD")}
              onClick={() => onSelectDate(d)}
              style={{
                padding: 6,
                borderRight: `1px solid ${brandColors.borderLight}`,
                minHeight: 380,
                background: isToday ? "#FFF8F8" : brandColors.paper,
                minWidth: 130,
                cursor: "pointer",
                transition: "background 200ms ease",
              }}
            >
              {daySchedules.length > 0 ? (
                <div className="mira-stagger">
                  {daySchedules.map((s) => renderScheduleCard(s, true))}
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center", color: brandColors.textTertiary, fontSize: 11 }}>
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MonthGridProps {
  currentDate: Dayjs;
  calendars: Calendar[];
  onSelectDate: (d: Dayjs) => void;
  getScheduleColor: (id: string) => { accent: string; soft: string };
  extractId: (v: any) => string;
}

function MonthGrid({ currentDate, calendars, onSelectDate, getScheduleColor, extractId }: MonthGridProps) {
  const start = currentDate.startOf("month").startOf("week");
  const end = currentDate.endOf("month").endOf("week");
  const days: Dayjs[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    days.push(cur);
    cur = cur.add(1, "day");
  }

  const getSessions = (d: Dayjs) => calendars.filter((c) => dayjs(c.date as any).format("YYYY-MM-DD") === d.format("YYYY-MM-DD"));

  const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <div className="mira-fade-in">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          background: brandColors.bg,
          borderBottom: `1px solid ${brandColors.borderLight}`,
        }}
      >
        {weekdayLabels.map((label, i) => (
          <div
            key={label}
            style={{
              padding: "10px 8px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: i === 6 ? brandColors.error : brandColors.textSecondary,
              borderRight: i < 6 ? `1px solid ${brandColors.borderLight}` : "none",
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridAutoRows: "minmax(96px, auto)",
        }}
      >
        {days.map((d) => {
          const isToday = d.isSame(dayjs(), "day");
          const isCurrentMonth = d.month() === currentDate.month();
          const isWeekend = d.day() === 0 || d.day() === 6;
          const sessions = getSessions(d);
          return (
            <div
              key={d.format("YYYY-MM-DD")}
              onClick={() => onSelectDate(d)}
              className="mira-row-hover"
              style={{
                padding: 6,
                borderRight: `1px solid ${brandColors.borderLight}`,
                borderBottom: `1px solid ${brandColors.borderLight}`,
                background: isToday ? brandColors.redSoft : isCurrentMonth ? brandColors.paper : brandColors.bg,
                cursor: "pointer",
                position: "relative",
                minHeight: 96,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isToday ? brandColors.red : "transparent",
                  color: isToday ? "#fff" : isCurrentMonth ? (isWeekend ? brandColors.error : brandColors.textPrimary) : brandColors.textTertiary,
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 500,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {d.format("D")}
                </span>
                {sessions.length > 0 && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: brandColors.textSecondary,
                    background: isToday ? "rgba(255,255,255,0.6)" : brandColors.bg,
                    padding: "0 5px",
                    borderRadius: 8,
                    border: `1px solid ${brandColors.borderLight}`,
                  }}>
                    {sessions.length}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sessions.slice(0, 3).map((s) => {
                  const palette = getScheduleColor(extractId(s.courseId));
                  const time = typeof s.sessionId === "object" ? s.sessionId.startTime : "";
                  const status = getStatusMeta(s.status);
                  return (
                    <div
                      key={s._id}
                      style={{
                        fontSize: 10,
                        lineHeight: 1.3,
                        padding: "2px 5px",
                        borderRadius: 3,
                        background: palette.soft,
                        borderLeft: `2px solid ${palette.accent}`,
                        color: brandColors.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={`${time} · ${typeof s.courseId === "object" ? s.courseId.name : "Khóa học"} · ${status.label}`}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: status.dot, flexShrink: 0 }} />
                      {time && <span style={{ fontWeight: 600, color: palette.accent }}>{time}</span>}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {typeof s.courseId === "object" ? s.courseId.name : "Khóa học"}
                      </span>
                    </div>
                  );
                })}
                {sessions.length > 3 && (
                  <div style={{ fontSize: 10, color: brandColors.textTertiary, fontWeight: 600, padding: "1px 5px" }}>
                    +{sessions.length - 3} khác
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
