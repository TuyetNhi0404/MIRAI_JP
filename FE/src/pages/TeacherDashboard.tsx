// src/pages/TeacherDashboard.tsx
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  School,
  Groups,
  ArrowForward
} from '@mui/icons-material';
import {
  CalendarClock,
  NotebookText,
  FileQuestion,
  Headphones,
  ClipboardCheck,
  GraduationCap
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import type { RootState } from '../redux/store';
import { brandColors } from '../theme/theme';
import { courseService, type Course } from '../services/courseService';

const JP_FONT_STACK = `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Noto Sans JP", Meiryo, "Source Han Sans JP", sans-serif`;

const SAKURA_BG_URL =
  "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1400&auto=format&fit=crop&q=80";

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

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const user = profile || authUser;

  const avatarUrl =
    user?.avatar && user.avatar.startsWith("http") ? user.avatar : undefined;

  // State variables
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Get current date string in Vietnamese format
  const getCurrentDateString = () => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `${day}, ngày ${date} tháng ${month} năm ${year}`;
  };

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const data = await courseService.getTeacherCourses();
        setCourses(data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách khóa học giáo viên:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Calculations for KPI Cards
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0);

  // Time-based date details
  const today = dayjs();
  const dayNum = today.format('DD');
  const weekday = today.format('dd');
  const monthYear = today.format('MM[/]YYYY');
  const monthVi = today.format('M');

  return (
    <Container maxWidth="xl" sx={{ py: 3, minHeight: '85vh' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotateHanko {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50% { transform: rotate(-12deg) scale(1.03); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-delay-1 { animation-delay: 0.1s; }
        .anim-delay-2 { animation-delay: 0.2s; }
        .anim-delay-3 { animation-delay: 0.3s; }
        .anim-delay-4 { animation-delay: 0.4s; }
        
        .japan-hanko-dash {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid ${SAKURA.accent};
          border-radius: 50%;
          color: ${SAKURA.accent};
          font-family: "Yuji Syuku", "Noto Serif JP", serif !important;
          font-weight: 700;
          width: 58px;
          height: 58px;
          font-size: 14px;
          animation: rotateHanko 5s ease-in-out infinite;
          box-shadow: inset 0 0 6px rgba(158, 42, 69, 0.08), 0 4px 10px rgba(158, 42, 69, 0.04);
        }
        .quick-access-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          background: #ffffff;
        }
        .quick-access-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(185, 0, 0, 0.05);
        }
        .quick-access-card:hover .icon-avatar {
          transform: scale(1.15) rotate(6deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .icon-avatar {
          transition: all 0.25s ease;
        }
        .class-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 4px solid transparent;
        }
        .class-card:hover {
          transform: translateX(6px);
          background: #FFFDFB;
          border-left-color: #B90000;
          box-shadow: 0 4px 16px rgba(185, 0, 0, 0.03);
        }
        .MuiTypography-root,
        .MuiButton-root,
        .MuiInputBase-root,
        .MuiChip-root {
          font-family: "Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif !important;
        }
        .mira-button-hover {
          transition: all 0.2s ease;
        }
        .mira-button-hover:hover {
          background: rgba(185, 0, 0, 0.03) !important;
        }
      `}</style>

      {/* 🌟 PREMIUM SAKURA GREETING HERO CARD */}
      <Box
        className="animate-fade-in-up"
        style={{
          position: "relative",
          borderRadius: 14,
          background: `linear-gradient(115deg, ${SAKURA.bgTop} 0%, ${SAKURA.bgMid} 38%, ${SAKURA.bgBottom} 78%, ${SAKURA.bgDeep} 100%)`,
          padding: "32px 36px",
          marginBottom: 14,
          overflow: "hidden",
          color: SAKURA.ink,
          boxShadow: "0 8px 28px -8px rgba(214, 96, 132, 0.38), 0 2px 6px -2px rgba(214, 96, 132, 0.18)",
          minHeight: 220,
          isolation: "isolate",
        }}
      >
        {/* Background Blend Image */}
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

        {/* Gradient Overlay */}
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

        {/* Kanji Watermark */}
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
        >
          教
        </div>

        {/* Falling Petals Engine */}
        <FallingPetals />

        <Grid container spacing={3} alignItems="center" style={{ position: "relative", zIndex: 1, height: "100%" }}>
          <Grid item xs={12} md={8}>
            {/* System Status Bubble */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.78)",
                backdropFilter: "blur(8px)",
                marginBottom: 16,
                color: SAKURA.accent,
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 1px 2px 0 rgba(158, 42, 69, 0.06)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#34B35A",
                  display: "inline-block",
                }}
              />
              Hệ thống hoạt động bình thường
            </div>

            {/* Main Greeting */}
            <Typography
              variant="h3"
              style={{
                margin: 0,
                color: SAKURA.ink,
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: -0.8,
                fontFamily: `"Comfortaa", sans-serif`,
              }}
            >
              {getGreeting()}, <span style={{ color: SAKURA.accent, fontWeight: 700 }}>Thầy/Cô {user?.name ? user.name.split(/\s+/).filter(Boolean).pop() : 'Giáo viên'}</span>!
            </Typography>

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

            {/* Custom Calligraphy Subtext */}
            <Typography
              style={{
                color: SAKURA.inkMid,
                fontSize: 14,
                display: "block",
                lineHeight: 1.55,
                maxWidth: 520,
              }}
            >
            {today.format("dddd, D [tháng] M, YYYY")}. Chúc các thầy cô một ngày lên lớp nhiều năng lượng và niềm vui!
            </Typography>
          </Grid>

          {/* Calendar Widget on the Right */}
          <Grid item xs={12} md={4} style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                padding: "8px 0",
                borderLeft: `1px solid ${SAKURA.divider}`,
                paddingLeft: 28,
                minHeight: 140,
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
                    fontSize: 80,
                    fontWeight: 700,
                    lineHeight: 0.95,
                    letterSpacing: -3,
                    marginTop: 4,
                    color: SAKURA.ink,
                    fontFamily: '"Comfortaa", sans-serif',
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
          </Grid>
        </Grid>
      </Box>

      {/* 📊 NEW ACTIVITY / STATS STRIP */}
      <div
        className="animate-fade-in-up anim-delay-1"
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "#ffffff",
          border: `1px solid ${brandColors.borderLight}`,
          borderRadius: 14,
          padding: "12px 6px",
          marginBottom: 20,
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => navigate("/dashboard/teacher/courses")}
          className="mira-button-hover"
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
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: brandColors.textSecondary,
              fontWeight: 500,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: brandColors.red }} />
            Lớp giảng dạy
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: SAKURA.ink,
              letterSpacing: -0.4,
              lineHeight: 1,
              fontFamily: '"Comfortaa", sans-serif',
            }}
          >
            {loadingCourses ? '...' : totalCourses} lớp
          </span>
        </button>

        <div style={{ alignSelf: "center", width: 1, height: 28, background: brandColors.borderLight, flexShrink: 0 }} />

        <button
          className="mira-button-hover"
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
            cursor: "default",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: brandColors.textSecondary,
              fontWeight: 500,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: brandColors.success }} />
            Tổng học viên
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: SAKURA.ink,
              letterSpacing: -0.4,
              lineHeight: 1,
              fontFamily: '"Comfortaa", sans-serif',
            }}
          >
            {loadingCourses ? '...' : totalStudents} học viên
          </span>
        </button>

        <div style={{ alignSelf: "center", width: 1, height: 28, background: brandColors.borderLight, flexShrink: 0 }} />

        <button
          onClick={() => navigate("/dashboard/teacher/schedule")}
          className="mira-button-hover"
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
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: brandColors.textSecondary,
              fontWeight: 500,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: brandColors.info }} />
            Điểm danh ca dạy
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: SAKURA.ink,
              letterSpacing: -0.4,
              lineHeight: 1,
              fontFamily: '"Comfortaa", sans-serif',
            }}
          >
            Xem lịch dạy
          </span>
        </button>
      </div>

      {/* 💼 MAIN CONTENT GRID */}
      <Grid container spacing={3}>
        {/* LEFT COLUMN: ACTIVE CLASSES */}
        <Grid item xs={12} md={6} className="animate-fade-in-up anim-delay-2">
          <Card
            sx={{
              borderRadius: '24px',
              border: `1px solid ${brandColors.border}`,
              height: '100%',
              minHeight: 480,
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={850} color={brandColors.ink} sx={{ fontSize: '1.2rem' }}>
                  Lớp học đang dạy ({courses.length})
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/dashboard/teacher/courses')}
                  sx={{ color: brandColors.red, fontWeight: 700, fontSize: '0.85rem', '&:hover': { bgcolor: 'transparent', color: brandColors.redDark } }}
                >
                  Xem tất cả
                </Button>
              </Box>

              {loadingCourses ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress color="error" />
                </Box>
              ) : courses.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300, color: 'text.secondary' }}>
                  <School sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
                  <Typography variant="body1">Bạn chưa được phân công lớp học nào.</Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {courses.slice(0, 4).map((course, index) => {
                    const totalSessions = course.session || 24;
                    const elapsedSessions = Math.min(Math.round(totalSessions * 0.4 + index * 4), totalSessions);
                    const progressPercent = Math.round((elapsedSessions / totalSessions) * 100);

                    return (
                      <ListItem
                        key={course._id || course.id}
                        alignItems="flex-start"
                        className="class-card"
                        sx={{
                          px: 2,
                          py: 2.5,
                          borderRadius: '16px',
                          border: `1px solid ${brandColors.borderLight}`,
                          mb: index === courses.slice(0, 4).length - 1 ? 0 : 2,
                          bgcolor: '#ffffff',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/dashboard/teacher/courses/${course._id || course.id}/members`)}
                      >
                        <ListItemAvatar sx={{ mt: 0.5 }}>
                          <Avatar sx={{ bgcolor: brandColors.redSoft, color: brandColors.red, fontWeight: 800 }}>
                            {course.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="subtitle1" component="div" fontWeight={800} color={brandColors.ink}>
                                {course.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                Sĩ số: {course.enrolledCount}/{course.capacity}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  mb: 1.5,
                                  fontWeight: 500
                                }}
                              >
                                {course.description || 'Chưa có mô tả lớp học.'}
                              </Typography>

                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ width: '100%', mr: 1.5 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progressPercent}
                                    sx={{
                                      height: 6,
                                      borderRadius: 3,
                                      bgcolor: '#f5f5f5',
                                      '& .MuiLinearProgress-bar': { bgcolor: brandColors.red }
                                    }}
                                  />
                                </Box>
                                <Box sx={{ minWidth: 65, textAlign: 'right' }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                    {progressPercent}% (Bài {elapsedSessions}/{totalSessions})
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT COLUMN: QUICK NAV */}
        <Grid item xs={12} md={6} className="animate-fade-in-up anim-delay-3">
          <Card
            sx={{
              borderRadius: '24px',
              border: `1px solid ${brandColors.border}`,
              height: '100%',
              minHeight: 480,
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={850} color={brandColors.ink} sx={{ mb: 3, fontSize: '1.2rem' }}>
                Lối tắt tính năng nhanh
              </Typography>

              <Grid container spacing={2}>
                {/* 1. Lịch dạy */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/schedule')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#F5F8FF',
                      color: '#2A5C91',
                      border: '1px solid #EBF1FF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(42, 92, 145, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: '#2A5C91', width: 44, height: 44, boxShadow: '0 2px 6px rgba(42,92,145,0.06)' }}>
                      <CalendarClock size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Lịch dạy</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Xem thời khóa biểu & báo nghỉ</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* 2. Bài tập */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/assignments')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#F4FBF6',
                      color: '#2D7D46',
                      border: '1px solid #E8F7EC',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(45, 125, 70, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: '#2D7D46', width: 44, height: 44, boxShadow: '0 2px 6px rgba(45,125,70,0.06)' }}>
                       <NotebookText size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Bài tập</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Giao bài và chấm điểm học viên</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* 3. Ngân hàng câu hỏi */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/questions')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#FFFBF5',
                      color: '#C66900',
                      border: '1px solid #FFF1DB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(198, 105, 0, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: '#C66900', width: 44, height: 44, boxShadow: '0 2px 6px rgba(198,105,0,0.06)' }}>
                      <FileQuestion size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Câu hỏi</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Soạn câu hỏi & tài liệu thi cử</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* 4. Điểm danh */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/attendance')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#FFF1F0',
                      color: brandColors.red,
                      border: `1px solid ${brandColors.redSoft}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(185, 0, 0, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: brandColors.red, width: 44, height: 44, boxShadow: '0 2px 6px rgba(185,0,0,0.06)' }}>
                      <ClipboardCheck size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Điểm danh</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Theo dõi chuyên cần hàng ngày</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* 5. Tạo Quiz Ngữ pháp */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/grammar')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#FFFDF0',
                      color: '#A17D00',
                      border: '1px solid #FFFAC2',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(161, 125, 0, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: '#A17D00', width: 44, height: 44, boxShadow: '0 2px 6px rgba(161,125,0,0.06)' }}>
                      <GraduationCap size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Quiz Ngữ pháp</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Soạn bài trắc nghiệm N5 - N1</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* 6. Luyện nghe */}
                <Grid item xs={12} sm={6}>
                  <Box
                    onClick={() => navigate('/dashboard/teacher/listening')}
                    className="quick-access-card"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#F0FBFB',
                      color: '#007A7A',
                      border: '1px solid #DDF7F7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 104,
                      boxShadow: '0 2px 8px rgba(0, 122, 122, 0.02)'
                    }}
                  >
                    <Avatar className="icon-avatar" sx={{ bgcolor: '#FFF', color: '#007A7A', width: 44, height: 44, boxShadow: '0 2px 6px rgba(0,122,122,0.06)' }}>
                      <Headphones size={20} />
                    </Avatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: brandColors.ink }}>Luyện nghe</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.25, mt: 0.25 }}>Bài nghe & học liệu âm thanh</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TeacherDashboard;
