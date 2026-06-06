import React, { useState } from "react";
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
  Typography,
} from "antd";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Menu as MenuIcon,
  RotateCcw,
  UserCheck,
  ClipboardCheck,
} from "lucide-react";
import { useScheduleData } from "../../hooks/useScheduleData";
import { AttendanceDialog } from "../../features/attendance-management/AttendanceDialog";
import type {
  Calendar,
  PopulatedCourse,
  PopulatedSession,
  PopulatedTeacher,
} from "../../types/schedule.types";
import { PageHeader } from "../../components/ui";
import { brandColors } from "../../theme/theme";

const { useBreakpoint } = Grid;

type ViewMode = "day" | "week";

const COURSE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function ManageScheduleWithAttendance() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;

  const { calendars, loading, error: fetchError } = useScheduleData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "day" : "week");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedCalendarForAttendance, setSelectedCalendarForAttendance] =
    useState<Calendar | null>(null);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  };

  const formatDateDisplay = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const extractId = (
    value: string | PopulatedCourse | PopulatedSession | PopulatedTeacher | undefined
  ): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && "_id" in value) return value._id;
    return "";
  };

  const getWeekDates = () => {
    const week: Date[] = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const getScheduleColor = (courseId: string) => {
    const uniqueCourses = [
      ...new Set(calendars.map((c: Calendar) => extractId(c.courseId))),
    ];
    const index = uniqueCourses.indexOf(courseId);
    return COURSE_COLORS[index % COURSE_COLORS.length];
  };

  const getViewTitle = () => {
    if (viewMode === "week") {
      const weekDates = getWeekDates();
      const format = isMobile ? "numeric" : "long";
      return `${weekDates[0].getDate()} - ${weekDates[6].getDate()} ${weekDates[0].toLocaleDateString("vi-VN", { month: format, year: "numeric" })}`;
    }
    return formatDateDisplay(currentDate);
  };

  const handleOpenAttendance = (schedule: Calendar) => {
    setSelectedCalendarForAttendance(schedule);
    setAttendanceDialogOpen(true);
  };

  const renderScheduleCard = (schedule: Calendar) => {
    const course =
      typeof schedule.courseId === "object"
        ? (schedule.courseId as PopulatedCourse)
        : null;
    const teacher =
      typeof schedule.teacherId === "object"
        ? (schedule.teacherId as PopulatedTeacher)
        : null;
    const courseId = extractId(schedule.courseId);
    const color = getScheduleColor(courseId);

    return (
      <div
        key={schedule._id}
        className="mira-fade-in"
        style={{
          background: color,
          color: "white",
          marginBottom: 8,
          borderRadius: 8,
          padding: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 4px 8px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 1px 3px rgba(0,0,0,0.1)";
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, lineHeight: 1.2 }}>
          {course?.name || course?.courseName || "Khóa học chưa xác định"}
        </div>
        <div style={{ fontSize: 11, opacity: 0.95, marginBottom: 6 }}>
          GV: {teacher?.name || "Chưa xác định"}
        </div>
        <Space size={6} style={{ width: "100%", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontWeight: 600,
            }}
          >
            {schedule.status === "not_yet"
              ? "Chưa bắt đầu"
              : schedule.status === "completed"
              ? "Đã xong"
              : schedule.status === "in_progress"
              ? "Đang học"
              : schedule.status === "cancelled"
              ? "Đã hủy"
              : (schedule.status as string).replace(/_/g, " ")}
          </span>
          <Button
            size="small"
            type="primary"
            icon={<UserCheck size={12} />}
            onClick={() => handleOpenAttendance(schedule)}
            style={{
              background: "white",
              borderColor: "white",
              color,
              fontSize: 11,
              fontWeight: 700,
              height: 24,
              padding: "0 8px",
            }}
          >
            Điểm danh
          </Button>
        </Space>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
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
          <Space>
            <Button
              icon={<RotateCcw size={16} />}
              onClick={() => setCurrentDate(new Date())}
            >
              Hôm nay
            </Button>
            {!isMobile && (
              <Segmented
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
                options={[
                  { label: "Ngày", value: "day", icon: <Clock size={14} /> },
                  { label: "Tuần", value: "week", icon: <CalendarDays size={14} /> },
                ]}
              />
            )}
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

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
          marginBottom: 16,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={12} align="middle">
          <Col xs={12} md={12}>
            <Space>
              <Button
                type="text"
                icon={<ChevronLeft size={18} />}
                onClick={handlePrev}
              />
              <Typography.Text strong style={{ minWidth: 180, textAlign: "center", fontSize: 15 }}>
                {getViewTitle()}
              </Typography.Text>
              <Button
                type="text"
                icon={<ChevronRight size={18} />}
                onClick={handleNext}
              />
            </Space>
          </Col>
          {isMobile && (
            <Col xs={12} md={12} style={{ textAlign: "right" }}>
              <Button
                icon={<MenuIcon size={16} />}
                onClick={() => setMobileMenuOpen(true)}
              >
                Chế độ xem
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      <Drawer
        title="Chọn chế độ xem"
        placement="bottom"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <List
          dataSource={[
            { key: "day", label: "Xem theo ngày", icon: <Clock size={18} /> },
            { key: "week", label: "Xem theo tuần", icon: <CalendarDays size={18} /> },
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
                <Typography.Text>{item.label}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>

      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${brandColors.border}`,
        }}
        styles={{ body: { padding: 0, overflow: "hidden" } }}
      >
        {viewMode === "day" && (
          <div style={{ padding: isMobile ? 12 : 0 }} className="mira-fade-in">
            <DayView
              calendars={calendars}
              currentDate={currentDate}
              isMobile={isMobile}
              isTablet={isTablet}
              formatDate={formatDate}
              formatDateDisplay={formatDateDisplay}
              extractId={extractId}
              renderScheduleCard={renderScheduleCard}
            />
          </div>
        )}
        {viewMode === "week" && (
          <div className="mira-fade-in">
            <WeekView
              calendars={calendars}
              currentDate={currentDate}
              isMobile={isMobile}
              isTablet={isTablet}
              getWeekDates={getWeekDates}
              formatDate={formatDate}
              formatDateDisplay={formatDateDisplay}
              extractId={extractId}
              renderScheduleCard={renderScheduleCard}
            />
          </div>
        )}
      </Card>

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

interface DayViewProps {
  calendars: Calendar[];
  currentDate: Date;
  isMobile: boolean;
  isTablet: boolean;
  formatDate: (d: Date | string) => string;
  formatDateDisplay: (d: Date | string) => string;
  extractId: (v: any) => string;
  renderScheduleCard: (s: Calendar) => React.ReactNode;
}

function DayView({
  calendars,
  currentDate,
  isMobile,
  isTablet,
  formatDate,
  formatDateDisplay,
  extractId,
  renderScheduleCard,
}: DayViewProps) {
  const dateStr = formatDate(currentDate);
  const isToday = formatDate(currentDate) === formatDate(new Date());

  if (isMobile) {
    const morningSessions = calendars
      .filter((c) => {
        const session = typeof c.sessionId === "object" ? c.sessionId : null;
        if (!session) return false;
        const startHour = parseInt(session.startTime?.split(":")[0] || "0");
        return startHour < 12 && formatDate(c.date) === dateStr;
      })
      .sort((a, b) => {
        const sa = typeof a.sessionId === "object" ? a.sessionId.startTime || "" : "";
        const sb = typeof b.sessionId === "object" ? b.sessionId.startTime || "" : "";
        return sa.localeCompare(sb);
      });
    const afternoonSessions = calendars
      .filter((c) => {
        const session = typeof c.sessionId === "object" ? c.sessionId : null;
        if (!session) return false;
        const startHour = parseInt(session.startTime?.split(":")[0] || "0");
        return startHour >= 12 && formatDate(c.date) === dateStr;
      })
      .sort((a, b) => {
        const sa = typeof a.sessionId === "object" ? a.sessionId.startTime || "" : "";
        const sb = typeof b.sessionId === "object" ? b.sessionId.startTime || "" : "";
        return sa.localeCompare(sb);
      });

    return (
      <div>
        <div
          style={{
            padding: 16,
            background: isToday ? brandColors.red : brandColors.bg,
            color: isToday ? "white" : brandColors.textPrimary,
            textAlign: "center",
          }}
        >
          <Typography.Text
            strong
            style={{ color: "inherit", display: "block", fontSize: 15 }}
          >
            {currentDate.toLocaleDateString("vi-VN", { weekday: "long" })}
          </Typography.Text>
          <Typography.Text style={{ color: "inherit" }}>
            {formatDateDisplay(currentDate)}
          </Typography.Text>
        </div>
        <div style={{ padding: 16 }}>
          <Typography.Text
            strong
            style={{ color: brandColors.warning, display: "block", marginBottom: 12 }}
          >
            Buổi sáng
          </Typography.Text>
          {morningSessions.length > 0
            ? morningSessions.map((s) => renderScheduleCard(s))
            : (
                <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", padding: 16 }}>
                  -
                </Typography.Text>
              )}
        </div>
        <div style={{ borderTop: `1px solid ${brandColors.borderLight}` }} />
        <div style={{ padding: 16 }}>
          <Typography.Text
            strong
            style={{ color: brandColors.warning, display: "block", marginBottom: 12 }}
          >
            Buổi chiều
          </Typography.Text>
          {afternoonSessions.length > 0
            ? afternoonSessions.map((s) => renderScheduleCard(s))
            : (
                <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", padding: 16 }}>
                  -
                </Typography.Text>
              )}
        </div>
      </div>
    );
  }

  const allSessions = [
    ...new Set(calendars.map((c: Calendar) => extractId(c.sessionId))),
  ];
  const sessionMap = new Map<string, PopulatedSession>();
  calendars.forEach((cal: Calendar) => {
    const sessionId = extractId(cal.sessionId);
    if (!sessionMap.has(sessionId) && typeof cal.sessionId === "object") {
      sessionMap.set(sessionId, cal.sessionId);
    }
  });
  const sortedSessionIds = allSessions.sort((idA, idB) => {
    const sessionA = sessionMap.get(idA);
    const sessionB = sessionMap.get(idB);
    return (sessionA?.startTime || "").localeCompare(sessionB?.startTime || "");
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${isTablet ? "100px" : "120px"} 1fr`,
          minWidth: "fit-content",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${brandColors.borderLight}`,
            borderRight: `1px solid ${brandColors.borderLight}`,
            background: brandColors.bg,
            fontWeight: 600,
          }}
        >
          Thời gian
        </div>
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${brandColors.borderLight}`,
            borderRight: `1px solid ${brandColors.borderLight}`,
            background: isToday ? brandColors.redSoft : brandColors.bg,
            textAlign: "center",
            minWidth: 300,
          }}
        >
          <Typography.Text
            strong
            style={{
              display: "block",
              color: isToday ? brandColors.red : brandColors.textPrimary,
            }}
          >
            {currentDate.toLocaleDateString("vi-VN", { weekday: "long" })}
          </Typography.Text>
          <Typography.Text type="secondary">
            {formatDateDisplay(currentDate)}
          </Typography.Text>
        </div>

        {sortedSessionIds.map((sessionId) => {
          const session = sessionMap.get(sessionId);
          return (
            <React.Fragment key={sessionId}>
              <div
                style={{
                  padding: 16,
                  borderBottom: `1px solid ${brandColors.borderLight}`,
                  borderRight: `1px solid ${brandColors.borderLight}`,
                  background: brandColors.bg,
                }}
              >
                <Typography.Text strong style={{ display: "block" }}>
                  {session?.sessionName || "Ca học"}
                </Typography.Text>
                {session?.startTime && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {session.startTime} - {session.endTime}
                  </Typography.Text>
                )}
              </div>
              <div
                style={{
                  padding: 12,
                  borderBottom: `1px solid ${brandColors.borderLight}`,
                  borderRight: `1px solid ${brandColors.borderLight}`,
                  minHeight: 120,
                  background: brandColors.paper,
                  minWidth: 300,
                }}
              >
                {calendars
                  .filter(
                    (cal: Calendar) =>
                      formatDate(cal.date) === dateStr &&
                      extractId(cal.sessionId) === sessionId
                  )
                  .map((s) => renderScheduleCard(s))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface WeekViewProps {
  calendars: Calendar[];
  currentDate: Date;
  isMobile: boolean;
  isTablet: boolean;
  getWeekDates: () => Date[];
  formatDate: (d: Date | string) => string;
  formatDateDisplay: (d: Date | string) => string;
  extractId: (v: any) => string;
  renderScheduleCard: (s: Calendar) => React.ReactNode;
}

function WeekView({
  calendars,
  isMobile,
  isTablet,
  getWeekDates,
  formatDate,
  formatDateDisplay,
  extractId,
  renderScheduleCard,
}: WeekViewProps) {
  const weekDates = getWeekDates();
  const allSessions = [
    ...new Set(calendars.map((c: Calendar) => extractId(c.sessionId))),
  ];
  const sessionMap = new Map<string, PopulatedSession>();
  calendars.forEach((cal: Calendar) => {
    const sessionId = extractId(cal.sessionId);
    if (!sessionMap.has(sessionId) && typeof cal.sessionId === "object") {
      sessionMap.set(sessionId, cal.sessionId);
    }
  });
  const sortedSessionIds = allSessions.sort((idA, idB) => {
    const sessionA = sessionMap.get(idA);
    const sessionB = sessionMap.get(idB);
    return (sessionA?.startTime || "").localeCompare(sessionB?.startTime || "");
  });

  if (isMobile) {
    return (
      <div style={{ padding: 12 }}>
        {weekDates.map((date, idx) => {
          const dateStr = formatDate(date);
          const isToday = formatDate(date) === formatDate(new Date());
          const daySchedules = calendars.filter(
            (c) => formatDate(c.date) === dateStr
          );

          return (
            <div
              key={idx}
              style={{
                marginBottom: 12,
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${isToday ? brandColors.red : brandColors.borderLight}`,
                background: brandColors.paper,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: isToday ? brandColors.red : brandColors.bg,
                  color: isToday ? "white" : brandColors.textPrimary,
                }}
              >
                <Typography.Text
                  strong
                  style={{ color: "inherit", display: "block" }}
                >
                  {date.toLocaleDateString("vi-VN", { weekday: "long" })}
                </Typography.Text>
                <Typography.Text style={{ color: "inherit", fontSize: 12 }}>
                  {formatDateDisplay(date)}
                </Typography.Text>
              </div>
              <div style={{ padding: 12 }}>
                {daySchedules.length > 0 ? (
                  daySchedules.map((s) => renderScheduleCard(s))
                ) : (
                  <Typography.Text
                    type="secondary"
                    style={{ display: "block", textAlign: "center", padding: 12 }}
                  >
                    -
                  </Typography.Text>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${isTablet ? "100px" : "120px"} repeat(7, 1fr)`,
          minWidth: "fit-content",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${brandColors.borderLight}`,
            borderRight: `1px solid ${brandColors.borderLight}`,
            background: brandColors.bg,
            fontWeight: 600,
          }}
        >
          Thời gian
        </div>
        {weekDates.map((date, idx) => {
          const isToday = formatDate(date) === formatDate(new Date());
          return (
            <div
              key={idx}
              style={{
                padding: isTablet ? 12 : 16,
                borderBottom: `1px solid ${brandColors.borderLight}`,
                borderRight: `1px solid ${brandColors.borderLight}`,
                background: isToday ? brandColors.redSoft : brandColors.bg,
                textAlign: "center",
                minWidth: 140,
              }}
            >
              <Typography.Text
                strong
                style={{
                  display: "block",
                  color: isToday ? brandColors.red : brandColors.textPrimary,
                  fontSize: isTablet ? 13 : 14,
                }}
              >
                {date.toLocaleDateString("vi-VN", { weekday: "short" })}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{
                  color: isToday ? brandColors.red : undefined,
                  fontSize: 12,
                }}
              >
                {formatDateDisplay(date)}
              </Typography.Text>
            </div>
          );
        })}

        {sortedSessionIds.map((sessionId) => {
          const session = sessionMap.get(sessionId);
          return (
            <React.Fragment key={sessionId}>
              <div
                style={{
                  padding: 16,
                  borderBottom: `1px solid ${brandColors.borderLight}`,
                  borderRight: `1px solid ${brandColors.borderLight}`,
                  background: brandColors.bg,
                }}
              >
                <Typography.Text strong style={{ display: "block" }}>
                  {session?.sessionName || "Ca học"}
                </Typography.Text>
                {session?.startTime && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {session.startTime} - {session.endTime}
                  </Typography.Text>
                )}
              </div>
              {weekDates.map((date, idx) => {
                const dateStr = formatDate(date);
                const daySchedules = calendars.filter(
                  (cal: Calendar) =>
                    formatDate(cal.date) === dateStr &&
                    extractId(cal.sessionId) === sessionId
                );
                return (
                  <div
                    key={idx}
                    style={{
                      padding: 8,
                      borderBottom: `1px solid ${brandColors.borderLight}`,
                      borderRight: `1px solid ${brandColors.borderLight}`,
                      minHeight: 120,
                      background: brandColors.paper,
                      minWidth: 140,
                    }}
                  >
                    {daySchedules.map((s) => renderScheduleCard(s))}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
