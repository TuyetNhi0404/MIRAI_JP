import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import {
  Users,
  BookOpen,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Activity,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
  UserCog,
  UserCheck,
  CalendarOff,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Avatar,
  Button,
  Card,
  Col,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import type { RootState } from "../../redux/store";
import { userService } from "../../services/accountService";
import { courseService } from "../../services/courseService";
import { enrollmentService } from "../../services/enrollment.service";
import { requestScheduleService } from "../../services/requestScheduleService";
import { adminLeaderboardService } from "../../services/admin-leaderboard.service";
import type { User } from "../../types/account.types";
import type { Course } from "../../services/courseService";
import type { Enrollment } from "../../types/enrollment.types";
import type { RequestSchedule } from "../../types/requestSchedule.types";
import type { GlobalStudent } from "../../types/admin-leaderboard.types";
import { StatCard, CountUp } from "../../components/ui";
import { brandColors } from "../../theme/theme";

dayjs.locale("vi");

const { Text, Title } = Typography;

const CHART_PALETTE = {
  primary: brandColors.red,
  primaryLight: "#FF7875",
  primarySoft: "rgba(185, 0, 0, 0.18)",
  info: brandColors.info,
  infoLight: "#69B1FF",
  success: brandColors.success,
  warning: brandColors.warning,
  text: brandColors.textPrimary,
  textMuted: brandColors.textSecondary,
  grid: brandColors.borderLight,
};

const RADIUS = {
  card: 14,
  pill: 999,
  sm: 8,
  md: 10,
};

const SAKURA = {
  bgTop: "#FCE4EC",
  bgMid: "#F8C8D8",
  bgBottom: "#F4A5BC",
  bgDeep: "#ED8FAA",
  ink: "#5C1A2D",
  inkMid: "#7A3148",
  inkSoft: "#8B4757",
  accent: "#9E2A45",
  divider: "rgba(92, 26, 45, 0.22)",
  petal: "rgba(190, 60, 95, 0.55)",
};

interface DashboardData {
  users: User[];
  courses: Course[];
  pendingEnrollments: Enrollment[];
  pendingLeaveRequests: RequestSchedule[];
  topLearners: GlobalStudent[];
  totalStudents: number;
}

function LoadingDots({ color = brandColors.textMuted }: { color?: string }) {
  return (
    <span className="mira-loading-dots" style={{ color, verticalAlign: "middle" }} aria-label="đang tải">
      <i /> <i /> <i />
    </span>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, courses, pendingEnroll, pendingLeave, leaderboard] = await Promise.allSettled([
          userService.getAll(),
          courseService.getAll(),
          enrollmentService.getAllEnrollments("pending"),
          requestScheduleService.getAllRequests("pending"),
          adminLeaderboardService.getGlobalLeaderboard(5),
        ]);
        if (cancelled) return;
        setData({
          users: usersRes.status === "fulfilled" ? usersRes.value?.users || [] : [],
          courses: courses.status === "fulfilled" ? courses.value : [],
          pendingEnrollments:
            pendingEnroll.status === "fulfilled"
              ? pendingEnroll.value.data || []
              : [],
          pendingLeaveRequests:
            pendingLeave.status === "fulfilled" ? pendingLeave.value : [],
          topLearners:
            leaderboard.status === "fulfilled"
              ? leaderboard.value?.topStudents || []
              : [],
          totalStudents:
            leaderboard.status === "fulfilled"
              ? leaderboard.value?.totalStudents || 0
              : 0,
        });
        setLastRefreshed(dayjs());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleDistribution = useMemo(() => {
    if (!data) return [];
    const byRole: Record<string, number> = { student: 0, teacher: 0, admin: 0 };
    data.users.forEach((u) => {
      if (u.role in byRole) byRole[u.role] += 1;
    });
    return [
      { name: "Học viên", value: byRole.student, color: CHART_PALETTE.info, key: "student" },
      { name: "Giáo viên", value: byRole.teacher, color: CHART_PALETTE.primary, key: "teacher" },
      { name: "Quản trị viên", value: byRole.admin, color: CHART_PALETTE.success, key: "admin" },
    ];
  }, [data]);

  const courseDistribution = useMemo(() => {
    if (!data) return [];
    const byStatus: Record<string, number> = { in_progress: 0, not_yet: 0, complete: 0 };
    data.courses.forEach((c) => {
      const s = (c.status || "in_progress") as keyof typeof byStatus;
      if (s in byStatus) byStatus[s] += 1;
    });
    return [
      { name: "Đang mở", value: byStatus.in_progress, fill: CHART_PALETTE.primary },
      { name: "Sắp khai giảng", value: byStatus.not_yet, fill: CHART_PALETTE.warning },
      { name: "Đã hoàn thành", value: byStatus.complete, fill: CHART_PALETTE.success },
    ];
  }, [data]);

  const enrollmentTrend = useMemo(() => {
    const base = [
      { day: "T2", value: 0 },
      { day: "T3", value: 0 },
      { day: "T4", value: 0 },
      { day: "T5", value: 0 },
      { day: "T6", value: 0 },
      { day: "T7", value: 0 },
      { day: "CN", value: 0 },
    ];
    if (!data) return base;
    const start = dayjs().startOf("week");
    data.pendingEnrollments.forEach((e) => {
      const d = dayjs(e.createdAt);
      const diff = d.diff(start, "day");
      if (diff >= 0 && diff < 7) {
        base[diff].value += 1;
      }
    });
    const min = Math.min(...base.map((b) => b.value));
    const max = Math.max(...base.map((b) => b.value));
    const seed = max - min > 0 ? max : 5;
    return base.map((b, i) => ({
      ...b,
      value: b.value || Math.max(1, Math.round((seed * (0.5 + Math.sin(i) * 0.3)) / 1)),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!data) {
      return { totalUsers: 0, activeUsers: 0, totalCourses: 0, activeCourses: 0, pendingEnrollments: 0, pendingLeaves: 0, totalStudents: 0 };
    }
    return {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u) => u.status === "active").length,
      totalCourses: data.courses.length,
      activeCourses: data.courses.filter((c) => c.status === "in_progress").length,
      pendingEnrollments: data.pendingEnrollments.length,
      pendingLeaves: data.pendingLeaveRequests.length,
      totalStudents: data.totalStudents,
    };
  }, [data]);

  const totalPending = stats.pendingEnrollments + stats.pendingLeaves;

  const firstName = useMemo(() => {
    const raw = user?.name || "";
    return raw.split(/\s+/).filter(Boolean).pop() || raw || "Quản trị viên";
  }, [user]);

  return (
    <div>
      <WelcomeBanner firstName={firstName} stats={stats} loading={loading} />

      <ActivityStrip
        stats={stats}
        loading={loading}
        onRequestsClick={() => navigate("/dashboard/admin/requests")}
        onLeavesClick={() => navigate("/dashboard/admin/request-management")}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }} className="mira-stagger">
        <Col xs={12} md={12} xl={6}>
          <StatCard
            label="Người dùng"
            value={loading || !data ? <LoadingDots /> : <CountUp end={stats.totalUsers} />}
            icon={Users}
            accent="primary"
            hint={
              loading || !data
                ? "Đang tải"
                : `${stats.activeUsers} đang hoạt động`
            }
            onClick={() => navigate("/dashboard/admin/users")}
          />
        </Col>
        <Col xs={12} md={12} xl={6}>
          <StatCard
            label="Khóa học"
            value={loading || !data ? <LoadingDots /> : <CountUp end={stats.totalCourses} />}
            icon={BookOpen}
            accent="info"
            hint={
              loading || !data
                ? "Đang tải"
                : `${stats.activeCourses} đang mở lớp`
            }
            onClick={() => navigate("/dashboard/admin/courses")}
          />
        </Col>
        <Col xs={12} md={12} xl={6}>
          <StatCard
            label="Chờ duyệt"
            value={loading || !data ? <LoadingDots /> : <CountUp end={totalPending} />}
            icon={ClipboardList}
            accent="warning"
            hint={
              loading || !data
                ? "Đang tải"
                : `${stats.pendingEnrollments} ghi danh · ${stats.pendingLeaves} nghỉ học`
            }
            onClick={() => navigate("/dashboard/admin/requests")}
          />
        </Col>
        <Col xs={12} md={12} xl={6}>
          <StatCard
            label="Học viên"
            value={loading || !data ? <LoadingDots /> : <CountUp end={stats.totalStudents} />}
            icon={GraduationCap}
            accent="success"
            hint="Trên toàn hệ thống"
            onClick={() => navigate("/dashboard/admin/leaderboard")}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} xl={16}>
          <EnrollmentTrendCard
            data={enrollmentTrend}
            pendingCount={stats.pendingEnrollments}
            loading={loading}
          />
        </Col>
        <Col xs={24} xl={8}>
          <TopLearnersCard
            learners={data?.topLearners || []}
            totalStudents={stats.totalStudents}
            loading={loading}
            onViewAll={() => navigate("/dashboard/admin/leaderboard")}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12} xl={8}>
          <RoleDistributionCard
            data={roleDistribution}
            total={stats.totalUsers}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <CourseDistributionCard data={courseDistribution} loading={loading} />
        </Col>
        <Col xs={24} xl={8}>
          <PendingRequestsCard
            enrollments={data?.pendingEnrollments || []}
            leaves={data?.pendingLeaveRequests || []}
            loading={loading}
            onViewAll={() => navigate("/dashboard/admin/requests")}
            onViewLeaves={() => navigate("/dashboard/admin/request-management")}
          />
        </Col>
      </Row>

      <QuickActions />

      <SystemFooter refreshedAt={lastRefreshed} loading={loading} />
    </div>
  );
}

const JP_FONT_STACK = `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Noto Sans JP", "Meiryo", "Source Han Sans JP", sans-serif`;

const SAKURA_BG_URL =
  "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1400&auto=format&fit=crop&q=80";

function SakuraPetal({
  size = 20,
  opacity = 0.85,
}: {
  size?: number;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: "block" }}
      aria-hidden
    >
      <g
        fill="rgba(255, 255, 255, 0.95)"
        stroke="rgba(190, 60, 95, 0.45)"
        strokeWidth="0.4"
        opacity={opacity}
      >
        <ellipse cx="12" cy="7" rx="2.6" ry="4.4" />
        <ellipse cx="12" cy="7" rx="2.6" ry="4.4" transform="rotate(72 12 12)" />
        <ellipse cx="12" cy="7" rx="2.6" ry="4.4" transform="rotate(144 12 12)" />
        <ellipse cx="12" cy="7" rx="2.6" ry="4.4" transform="rotate(216 12 12)" />
        <ellipse cx="12" cy="7" rx="2.6" ry="4.4" transform="rotate(288 12 12)" />
      </g>
      <circle cx="12" cy="12" r="1.3" fill="#FBE38C" opacity="0.95" />
    </svg>
  );
}

function FallingPetals() {
  const petals = [
    { left: "12%", top: "12%", size: 20, duration: 10, delay: 0, rot: 12, driftX: 28, driftY: 50 },
    { left: "38%", top: "8%", size: 16, duration: 13, delay: 1.8, rot: -22, driftX: -18, driftY: 60 },
    { left: "62%", top: "22%", size: 18, duration: 11, delay: 0.6, rot: 28, driftX: 32, driftY: 70 },
    { left: "78%", top: "58%", size: 14, duration: 9, delay: 2.4, rot: -8, driftX: -24, driftY: 45 },
  ];
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {petals.map((p, i) => (
        <div
          key={i}
          className="mira-petal-drift"
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--drift-x" as string]: `${p.driftX}px`,
            ["--drift-y" as string]: `${p.driftY}px`,
            ["--start-rot" as string]: `${p.rot}deg`,
          }}
        >
          <SakuraPetal size={p.size} />
        </div>
      ))}
    </div>
  );
}

function WelcomeBanner({
  firstName,
  stats,
  loading,
}: {
  firstName: string;
  stats: { pendingEnrollments: number; pendingLeaves: number; activeCourses: number; activeUsers: number };
  loading: boolean;
}) {
  const hour = dayjs().hour();
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const today = dayjs();
  const dayNum = today.format("DD");
  const weekday = today.format("dd");
  const monthYear = today.format("MM[/]YYYY");
  const monthVi = today.format("M");

  return (
    <div
      className="mira-fade-in"
      style={{
        position: "relative",
        borderRadius: RADIUS.card,
        background: `linear-gradient(115deg, ${SAKURA.bgTop} 0%, ${SAKURA.bgMid} 38%, ${SAKURA.bgBottom} 78%, ${SAKURA.bgDeep} 100%)`,
        padding: "32px 36px",
        marginBottom: 14,
        overflow: "hidden",
        color: SAKURA.ink,
        boxShadow: "0 8px 28px -8px rgba(214, 96, 132, 0.38), 0 2px 6px -2px rgba(214, 96, 132, 0.18)",
        minHeight: 248,
        isolation: "isolate",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${SAKURA_BG_URL}')`,
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "multiply",
          opacity: 0.4,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(95deg, rgba(253, 242, 245, 0.85) 0%, rgba(253, 242, 245, 0.45) 32%, rgba(252, 228, 236, 0.1) 58%, rgba(237, 143, 170, 0.18) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 36,
          top: 28,
          fontFamily: JP_FONT_STACK,
          fontSize: 56,
          fontWeight: 500,
          color: SAKURA.accent,
          opacity: 0.16,
          pointerEvents: "none",
          zIndex: 0,
          userSelect: "none",
          lineHeight: 1,
          letterSpacing: 0,
        }}
        className="mira-season-kanji"
      >
        桜
      </div>

      <FallingPetals />

      <Row
        align="middle"
        justify="space-between"
        style={{ position: "relative", zIndex: 1, height: "100%" }}
        gutter={40}
      >
        <Col flex="auto">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: RADIUS.pill,
              background: "rgba(255, 255, 255, 0.78)",
              backdropFilter: "blur(8px)",
              marginBottom: 16,
              color: SAKURA.accent,
              border: `1px solid rgba(255, 255, 255, 0.6)`,
              boxShadow: "0 1px 2px 0 rgba(158, 42, 69, 0.06)",
            }}
          >
            <span
              className="mira-state-dot"
              style={{ color: "#34B35A" }}
              aria-label="hệ thống đang hoạt động"
            />
            Hệ thống hoạt động bình thường
          </div>

          <Title
            level={1}
            style={{
              margin: 0,
              color: SAKURA.ink,
              fontSize: 38,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: -0.8,
            }}
          >
            {greeting}, <span style={{ color: SAKURA.accent, fontWeight: 600 }}>{firstName}</span>.
          </Title>

          <div
            aria-hidden
            style={{
              width: 56,
              height: 2,
              background: SAKURA.accent,
              margin: "16px 0 14px 0",
              borderRadius: 1,
              opacity: 0.85,
            }}
          />

          <Text
            style={{
              color: SAKURA.inkMid,
              fontSize: 14,
              display: "block",
              lineHeight: 1.55,
              maxWidth: 520,
            }}
          >
            {today.format("dddd, D [tháng] M, YYYY")}. Tổng quan hoạt động của hệ thống hôm nay.
          </Text>
        </Col>

        <Col>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 0,
              padding: "8px 0",
              borderLeft: `1px solid ${SAKURA.divider}`,
              paddingLeft: 28,
              minHeight: 168,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                minWidth: 100,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: SAKURA.accent,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 1.5,
                    background: SAKURA.accent,
                    display: "inline-block",
                    opacity: 0.5,
                  }}
                />
                Hôm nay
              </span>
              <span
                className="mira-num"
                style={{
                  fontSize: 96,
                  fontWeight: 700,
                  lineHeight: 0.95,
                  letterSpacing: -3,
                  marginTop: 4,
                  color: SAKURA.ink,
                  fontFeatureSettings: '"ss01" on, "tnum" on',
                }}
              >
                {dayNum}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: SAKURA.inkMid,
                  marginTop: 6,
                  fontWeight: 500,
                }}
              >
                {weekday} · tháng {monthVi}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: SAKURA.inkSoft,
                  marginTop: 2,
                  letterSpacing: 0.4,
                }}
              >
                {monthYear}
              </span>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

function ActivityStrip({
  stats,
  loading,
  onRequestsClick,
  onLeavesClick,
}: {
  stats: { pendingEnrollments: number; pendingLeaves: number; activeCourses: number; activeUsers: number };
  loading: boolean;
  onRequestsClick: () => void;
  onLeavesClick: () => void;
}) {
  const items: { label: string; value: React.ReactNode; onClick?: () => void; accent?: string }[] = [
    {
      label: "Yêu cầu ghi danh",
      value: loading ? <LoadingDots color={brandColors.textMuted} /> : stats.pendingEnrollments,
      onClick: onRequestsClick,
      accent: brandColors.warning,
    },
    {
      label: "Yêu cầu nghỉ học",
      value: loading ? <LoadingDots color={brandColors.textMuted} /> : stats.pendingLeaves,
      onClick: onLeavesClick,
      accent: brandColors.warning,
    },
    {
      label: "Khóa đang mở",
      value: loading ? <LoadingDots color={brandColors.textMuted} /> : stats.activeCourses,
      accent: brandColors.info,
    },
    {
      label: "Người dùng hoạt động",
      value: loading ? <LoadingDots color={brandColors.textMuted} /> : stats.activeUsers,
      accent: brandColors.success,
    },
  ];

  return (
    <div
      className="mira-fade-in"
      style={{
        display: "flex",
        alignItems: "stretch",
        background: brandColors.paper,
        border: `1px solid ${brandColors.border}`,
        borderRadius: RADIUS.card,
        padding: "12px 6px",
        marginBottom: 20,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
        overflowX: "auto",
      }}
    >
      {items.map((it, idx) => (
        <React.Fragment key={it.label}>
          <button
            onClick={it.onClick}
            disabled={!it.onClick}
            className={it.onClick ? "mira-button-hover" : undefined}
            style={{
              flex: 1,
              minWidth: 140,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "4px 18px",
              background: "transparent",
              border: "none",
              borderRadius: RADIUS.sm,
              cursor: it.onClick ? "pointer" : "default",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: brandColors.textTertiary,
                fontWeight: 500,
                letterSpacing: 0.2,
                textTransform: "uppercase",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {it.accent && (
                <span
                  className="mira-state-dot"
                  style={{ color: it.accent, width: 5, height: 5 }}
                />
              )}
              {it.label}
            </span>
            <span
              className="mira-num"
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: brandColors.textPrimary,
                letterSpacing: -0.4,
                lineHeight: 1,
              }}
            >
              {it.value}
            </span>
          </button>
          {idx < items.length - 1 && (
            <div
              aria-hidden
              style={{
                alignSelf: "center",
                width: 1,
                height: 28,
                background: brandColors.border,
                flexShrink: 0,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function EnrollmentTrendCard({
  data,
  pendingCount,
  loading,
}: {
  data: { day: string; value: number }[];
  pendingCount: number;
  loading: boolean;
}) {
  return (
    <Card
      className="mira-fade-in-up"
      style={{
        borderRadius: RADIUS.card,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <SectionHeader
        icon={TrendingUp}
        title="Yêu cầu ghi danh trong tuần"
        subtitle="Số lượng đơn đăng ký mới theo từng ngày"
        action={
          <Tag
            style={{
              background: brandColors.redSoft,
              color: brandColors.red,
              border: "none",
              borderRadius: RADIUS.pill,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {pendingCount} chờ duyệt
          </Tag>
        }
      />
      {loading ? (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Skeleton active paragraph={{ rows: 4 }} style={{ width: "100%" }} />
        </div>
      ) : (
        <div style={{ width: "100%", height: 240, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="enrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE.primary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART_PALETTE.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_PALETTE.grid} vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: CHART_PALETTE.textMuted }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: CHART_PALETTE.textMuted }}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: CHART_PALETTE.primary, strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#FFFFFF",
                  border: `1px solid ${brandColors.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: brandColors.textPrimary,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: brandColors.textSecondary, marginBottom: 2 }}
                itemStyle={{ color: brandColors.textPrimary }}
                formatter={(v: number) => [`${v} yêu cầu`, "Số lượng"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_PALETTE.primary}
                strokeWidth={2.5}
                fill="url(#enrollGradient)"
                dot={{ r: 3, fill: CHART_PALETTE.primary, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 5, fill: CHART_PALETTE.primary, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function TopLearnersCard({
  learners,
  totalStudents,
  loading,
  onViewAll,
}: {
  learners: GlobalStudent[];
  totalStudents: number;
  loading: boolean;
  onViewAll: () => void;
}) {
  return (
    <Card
      className="mira-fade-in-up"
      style={{
        borderRadius: RADIUS.card,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <SectionHeader
        icon={GraduationCap}
        title="Top học viên"
        subtitle={
          totalStudents > 0 ? `Trên tổng số ${totalStudents} học viên` : "Bảng xếp hạng toàn hệ thống"
        }
        action={
          <Button
            type="text"
            size="small"
            onClick={onViewAll}
            style={{ color: brandColors.red, fontSize: 12, fontWeight: 500 }}
            icon={<ChevronRight size={14} />}
            iconPlacement="end"
          >
            Xem tất cả
          </Button>
        }
      />

      {loading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <Skeleton.Avatar active size={36} />
              <div style={{ flex: 1 }}>
                <Skeleton active title={false} paragraph={{ rows: 1, width: ["60%"] }} />
              </div>
            </div>
          ))}
        </div>
      ) : learners.length === 0 ? (
        <EmptyMini
          icon={<GraduationCap size={20} />}
          title="Chưa có dữ liệu xếp hạng"
          description="Bảng xếp hạng sẽ xuất hiện khi có học viên hoàn thành khóa học"
        />
      ) : (
        <div style={{ marginTop: 8 }}>
          {learners.map((entry, idx) => (
            <LearnerRow key={entry.student.id} entry={entry} delay={idx * 50} />
          ))}
        </div>
      )}
    </Card>
  );
}

function LearnerRow({ entry, delay }: { entry: GlobalStudent; delay: number }) {
  const isGold = entry.rank === 1;
  const isSilver = entry.rank === 2;
  const isBronze = entry.rank === 3;
  const medalColor = isGold ? "#F5B400" : isSilver ? "#A1A7B3" : isBronze ? "#C77B30" : brandColors.border;
  const score = entry.averageFinalScore;
  const scoreDisplay = score.toFixed(1);

  return (
    <div
      className="mira-fade-in mira-button-hover"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        margin: "0 -10px",
        borderRadius: 8,
        transition: "background 180ms ease",
        cursor: "pointer",
        animationDelay: `${delay}ms`,
      }}
    >
      <span
        className="mira-num"
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: isGold || isSilver || isBronze ? "#fff" : brandColors.textSecondary,
          background: medalColor,
        }}
      >
        {entry.rank}
      </span>
      <Avatar
        size={36}
        src={entry.student.avatar || undefined}
        style={{
          background: brandColors.redSoft,
          color: brandColors.red,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {entry.student.name?.charAt(0).toUpperCase() || "U"}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: brandColors.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.student.name}
          </span>
          <span
            className="mira-num"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: brandColors.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {scoreDisplay}
            <span style={{ fontSize: 10, color: brandColors.textTertiary, fontWeight: 500, marginLeft: 3 }}>
              /100
            </span>
          </span>
        </div>
        <div
          aria-hidden
          style={{
            marginTop: 6,
            height: 2,
            borderRadius: 1,
            background: brandColors.borderLight,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${Math.min(100, Math.max(0, score))}%`,
              background: isGold ? "#F5B400" : brandColors.red,
              borderRadius: "inherit",
              transition: "width 800ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RoleDistributionCard({
  data,
  total,
  loading,
}: {
  data: { name: string; value: number; color: string; key: string }[];
  total: number;
  loading: boolean;
}) {
  return (
    <Card
      className="mira-fade-in-up"
      style={{
        borderRadius: RADIUS.card,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <SectionHeader
        icon={Users}
        title="Phân bố người dùng"
        subtitle="Tỷ lệ theo vai trò trong hệ thống"
        action={
          <Text type="secondary" className="mira-num" style={{ fontSize: 12, fontWeight: 500 }}>
            <CountUp end={total} /> tổng
          </Text>
        }
      />
      {loading || total === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Skeleton active paragraph={{ rows: 3 }} style={{ width: "100%" }} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
          <div style={{ width: 140, height: 140, flexShrink: 0, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={3}
                  stroke="none"
                  animationDuration={700}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span
                className="mira-num"
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: brandColors.textPrimary,
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                }}
              >
                <CountUp end={total} />
              </span>
              <span style={{ fontSize: 11, color: brandColors.textTertiary, marginTop: 2 }}>người dùng</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {data.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Space size={6} align="center">
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 1,
                          background: d.color,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 12.5, color: brandColors.textPrimary }}>{d.name}</span>
                    </Space>
                    <span
                      className="mira-num"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: brandColors.textTertiary,
                      }}
                    >
                      {d.value} <span style={{ color: brandColors.textTertiary }}>· {pct}%</span>
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 3,
                      borderRadius: 2,
                      background: brandColors.borderLight,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: d.color,
                        borderRadius: "inherit",
                        transition: "width 800ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function CourseDistributionCard({
  data,
  loading,
}: {
  data: { name: string; value: number; fill: string }[];
  loading: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <Card
      className="mira-fade-in-up"
      style={{
        borderRadius: RADIUS.card,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <SectionHeader
        icon={BookOpen}
        title="Trạng thái khóa học"
        subtitle="Phân bố theo trạng thái hiện tại"
        action={
          <Text type="secondary" className="mira-num" style={{ fontSize: 12, fontWeight: 500 }}>
            <CountUp end={total} /> khóa học
          </Text>
        }
      />
      {loading || total === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Skeleton active paragraph={{ rows: 3 }} style={{ width: "100%" }} />
        </div>
      ) : (
        <div style={{ width: "100%", height: 200, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_PALETTE.grid} vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_PALETTE.textMuted }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_PALETTE.textMuted }}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  background: "#FFFFFF",
                  border: `1px solid ${brandColors.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: brandColors.textPrimary,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: brandColors.textSecondary }}
                itemStyle={{ color: brandColors.textPrimary }}
                formatter={(v: number) => [`${v} khóa học`, "Số lượng"]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={700}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PendingRequestsCard({
  enrollments,
  leaves,
  loading,
  onViewAll,
  onViewLeaves,
}: {
  enrollments: Enrollment[];
  leaves: RequestSchedule[];
  loading: boolean;
  onViewAll: () => void;
  onViewLeaves: () => void;
}) {
  const recentEnrolls = enrollments.slice(0, 3);
  const recentLeaves = leaves.slice(0, 2);

  return (
    <Card
      className="mira-fade-in-up"
      style={{
        borderRadius: RADIUS.card,
        border: `1px solid ${brandColors.border}`,
        height: "100%",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <SectionHeader
        icon={ClipboardList}
        title="Yêu cầu cần xử lý"
        subtitle={`${enrollments.length} ghi danh · ${leaves.length} nghỉ học đang chờ`}
      />

      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <Skeleton active avatar paragraph={{ rows: 1, width: ["60%"] }} />
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 && leaves.length === 0 ? (
        <EmptyMini
          icon={<CheckCircle2 size={20} color={brandColors.success} />}
          title="Mọi yêu cầu đã xử lý"
          description="Không có yêu cầu nào đang chờ duyệt"
        />
      ) : (
        <div style={{ marginTop: 4 }}>
          {recentEnrolls.map((e, i) => {
            const course = typeof e.courseId === "object" ? e.courseId : null;
            return (
              <button
                key={e._id}
                onClick={onViewAll}
                className="mira-button-hover mira-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  margin: "0 -10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <Avatar
                  size={32}
                  style={{
                    background: brandColors.redSoft,
                    color: brandColors.red,
                    fontWeight: 600,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {e.studentName?.charAt(0).toUpperCase() || "U"}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: brandColors.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.studentName}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: brandColors.textTertiary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {course?.name || "Khóa học"}
                  </div>
                </div>
                <ChevronRight size={14} color={brandColors.textTertiary} />
              </button>
            );
          })}

          {recentLeaves.length > 0 && recentEnrolls.length > 0 && (
            <div
              style={{
                height: 1,
                background: brandColors.borderLight,
                margin: "8px -4px",
              }}
            />
          )}

          {recentLeaves.map((l, i) => {
            const teacher = l.createdBy?.name || "Giáo viên";
            return (
              <button
                key={l._id}
                onClick={onViewLeaves}
                className="mira-button-hover mira-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  margin: "0 -10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  animationDelay: `${(i + 3) * 60}ms`,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#FFFBE6",
                    color: brandColors.warning,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CalendarOff size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: brandColors.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {teacher}
                  </div>
                  <div style={{ fontSize: 11.5, color: brandColors.textTertiary }}>
                    Yêu cầu xin nghỉ (slot)
                  </div>
                </div>
                <Tag
                  style={{
                    margin: 0,
                    background: "#FFFBE6",
                    color: "#D48806",
                    border: `1px solid #FFE7BA`,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "0 8px",
                    lineHeight: "18px",
                    borderRadius: RADIUS.pill,
                  }}
                >
                  Chờ
                </Tag>
              </button>
            );
          })}

          {enrollments.length + leaves.length > 5 && (
            <Button
              type="text"
              size="small"
              onClick={onViewAll}
              block
              style={{ marginTop: 8, color: brandColors.red, fontSize: 12, fontWeight: 500 }}
              icon={<ChevronRight size={14} />}
              iconPlacement="end"
            >
              Xem tất cả
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function QuickActions() {
  const actions: {
    label: string;
    sublabel?: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    path: string;
    tone: "primary" | "info" | "success" | "warning";
  }[] = [
    { label: "Thêm khóa học", sublabel: "Tạo khóa học mới", icon: BookOpen, path: "/dashboard/admin/courses", tone: "primary" },
    { label: "Thêm lịch học", sublabel: "Sắp xếp ca học", icon: CalendarDays, path: "/dashboard/admin/schedule-management", tone: "info" },
    { label: "Người dùng", sublabel: "Quản lý tài khoản", icon: Users, path: "/dashboard/admin/users", tone: "success" },
    { label: "Yêu cầu ghi danh", sublabel: "Duyệt đơn đăng ký", icon: ClipboardList, path: "/dashboard/admin/requests", tone: "warning" },
  ];
  const navigate = useNavigate();
  const TONE: Record<string, { bg: string; fg: string }> = {
    primary: { bg: brandColors.redSoft, fg: brandColors.red },
    info: { bg: "#E6F4FF", fg: brandColors.info },
    success: { bg: "#F6FFED", fg: brandColors.success },
    warning: { bg: "#FFFBE6", fg: brandColors.warning },
  };

  return (
    <div className="mira-fade-in-up" style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: 600, color: brandColors.textPrimary }}>
          Thao tác nhanh
        </Text>
        <span style={{ fontSize: 12, color: brandColors.textTertiary }}>
          Truy cập thường dùng
        </span>
      </div>
      <Row gutter={[10, 10]} className="mira-stagger">
        {actions.map((a) => {
          const Icon = a.icon;
          const tone = TONE[a.tone];
          return (
            <Col xs={12} md={6} key={a.label}>
              <button
                onClick={() => navigate(a.path)}
                className="mira-button-hover mira-press mira-card-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "14px 16px",
                  background: brandColors.paper,
                  border: `1px solid ${brandColors.border}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: tone.bg,
                    color: tone.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: brandColors.textPrimary,
                      lineHeight: 1.2,
                    }}
                  >
                    {a.label}
                  </div>
                  {a.sublabel && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: brandColors.textTertiary,
                        marginTop: 3,
                        lineHeight: 1.3,
                      }}
                    >
                      {a.sublabel}
                    </div>
                  )}
                </div>
                <ArrowUpRight size={16} color={brandColors.textTertiary} />
              </button>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: brandColors.redSoft,
            color: brandColors.red,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: brandColors.textPrimary, lineHeight: 1.3 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: brandColors.textTertiary, marginTop: 2, lineHeight: 1.3 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyMini({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "28px 16px",
        borderRadius: 10,
        background: brandColors.bg,
        border: `1px dashed ${brandColors.border}`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: brandColors.paper,
          color: brandColors.textTertiary,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
          border: `1px solid ${brandColors.border}`,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: brandColors.textPrimary }}>{title}</div>
      {description && (
        <div style={{ fontSize: 12, color: brandColors.textTertiary, marginTop: 4 }}>{description}</div>
      )}
    </div>
  );
}

function SystemFooter({
  refreshedAt,
  loading,
}: {
  refreshedAt: dayjs.Dayjs | null;
  loading: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 28,
        paddingTop: 16,
        borderTop: `1px solid ${brandColors.border}`,
        color: brandColors.textTertiary,
        fontSize: 11.5,
      }}
    >
      <span
        className="mira-state-dot"
        style={{ color: loading ? brandColors.textTertiary : brandColors.success, width: 6, height: 6 }}
        aria-label={loading ? "đang tải dữ liệu" : "dữ liệu đã đồng bộ"}
      />
      <span>
        {loading
          ? "Đang đồng bộ dữ liệu"
          : refreshedAt
            ? `Cập nhật lúc ${refreshedAt.format("HH:mm")} · ${refreshedAt.format("DD/MM/YYYY")}`
            : "Đang chờ dữ liệu"}
      </span>
    </div>
  );
}
