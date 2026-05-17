import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { UserRound, Clock, Calendar } from "lucide-react";
import type { SessionItem, AttendanceStatus } from "../../types/schedule.types";

interface Props {
  session: SessionItem;
  compact?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

interface UserObject {
  fullName?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profile?: { name?: string };
  user?: { name?: string };
  teacherName?: string;
  instructorName?: string;
  studentName?: string;
  label?: string;
  email?: string;
  _id?: string;
}

interface ExtendedSessionItem extends SessionItem {
  teacherId?: string | UserObject;
  teacher_info?: UserObject;
  teacherInfo?: UserObject;
  teacherData?: UserObject;
  instructor?: UserObject;
  instructorInfo?: UserObject;
  tutor?: UserObject;
  tutorInfo?: UserObject;
  teacherName?: string;
  teacher_fullname?: string;
  tutorName?: string;
  status?: AttendanceStatus | string | boolean | number;
  s?: AttendanceStatus | string | boolean | number;
  isPresent?: boolean;
  attended?: boolean | string;
}

interface AttendanceObject {
  status?: AttendanceStatus | string | boolean | number;
  state?: AttendanceStatus | string | boolean | number;
  s?: AttendanceStatus | string | boolean | number;
  attended?: boolean | string;
  isPresent?: boolean;
}

// ============= CONSTANTS =============
const INVALID_NAMES = new Set([
  "",
  "-",
  "unknown",
  "Unknown",
  "Unknown Teacher",
  "No Teacher Info"
]);

const safeNameFromUserObj = (u: unknown): string | null => {
  if (!u || typeof u !== "object") return null;

  const userObj = u as UserObject;

  const candidates = [
    userObj.fullName,
    userObj.name,
    userObj.displayName,
    userObj.firstName && userObj.lastName
      ? `${userObj.firstName} ${userObj.lastName}`
      : undefined,
    userObj.lastName && userObj.firstName
      ? `${userObj.lastName} ${userObj.firstName}`
      : undefined,
    userObj.username,
    userObj.profile?.name,
    userObj.user?.name,
    userObj.teacherName,
    userObj.instructorName,
    userObj.studentName,
    userObj.label,
  ];

  for (const c of candidates) {
    if (typeof c === "string") {
      const t = c.trim();
      if (t && !INVALID_NAMES.has(t) && !t.includes("@")) {
        return t;
      }
    }
  }

  return null;
};

const looksLikeEmail = (s: string): boolean =>
  typeof s === "string" && /\S+@\S+\.\S+/.test(s);

const formatDateDisplay = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const getAttendanceStatusFromObj = (
  attendanceObj: unknown
): AttendanceStatus => {
  if (!attendanceObj && attendanceObj !== false) {
    return "not_yet";
  }

  let raw: unknown = null;

  if (
    attendanceObj &&
    typeof attendanceObj === "object" &&
    !Array.isArray(attendanceObj)
  ) {
    const obj = attendanceObj as AttendanceObject;
    raw =
      obj.status ??
      obj.state ??
      obj.s ??
      obj.attended ??
      obj.isPresent ??
      null;
  }

  if (raw === null || raw === undefined) {
    raw = attendanceObj;
  }

  if (raw === null || raw === undefined) {
    return "not_yet";
  }

  const normalized = String(raw).toLowerCase().trim();

  const presentTerms = new Set([
    "present",
    "attended",
    "presented",
    "yes",
    "true",
    "1",
    "có mặt",
    "cómặt",
    "co mat",
    "đã điểm danh",
    "attend",
  ]);

  const absentTerms = new Set([
    "absent",
    "missing",
    "missed",
    "no",
    "false",
    "0",
    "vắng",
    "vắng mặt",
    "vang",
    "abs",
    "cancelled",
  ]);

  if (presentTerms.has(normalized)) {
    return "present";
  }

  if (absentTerms.has(normalized)) {
    return "absent";
  }

  if (typeof attendanceObj === "boolean") {
    return attendanceObj ? "present" : "absent";
  }

  if (!Number.isNaN(Number(normalized))) {
    const n = Number(normalized);
    if (n === 1) return "present";
    if (n === 0) return "absent";
  }

  return "not_yet";
};

const SessionCard: React.FC<Props> = ({
  session,
  compact = false,
  style,
  onClick,
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const getTeacherName = (): string => {
    try {
      if (session.teacher && typeof session.teacher === "string") {
        const trimmed = session.teacher.trim();
        if (
          trimmed &&
          !looksLikeEmail(trimmed) &&
          !INVALID_NAMES.has(trimmed)
        ) {
          return trimmed;
        }
      }

      if (session.teacher && typeof session.teacher === "object") {
        const fromObj = safeNameFromUserObj(session.teacher);
        if (fromObj) return fromObj;
      }

      const extSession = session as ExtendedSessionItem;
      const possiblePopulatedFields = [
        extSession.teacherId,
        extSession.teacher_info,
        extSession.teacherInfo,
        extSession.teacherData,
        extSession.instructor,
        extSession.instructorInfo,
        extSession.tutor,
        extSession.tutorInfo,
      ];

      for (const p of possiblePopulatedFields) {
        if (p && typeof p === "object") {
          const n = safeNameFromUserObj(p);
          if (n) return n;
        } else if (p && typeof p === "string") {
          const t = p.trim();
          if (t && !looksLikeEmail(t) && !INVALID_NAMES.has(t)) {
            return t;
          }
        }
      }

      const otherCandidates = [
        extSession.teacherName,
        typeof extSession.instructor === "object"
          ? (extSession.instructor as UserObject).name
          : undefined,
        extSession.teacher_fullname,
        extSession.tutorName,
      ];

      for (const c of otherCandidates) {
        if (typeof c === "string") {
          const t = c.trim();
          if (t && !looksLikeEmail(t) && !INVALID_NAMES.has(t)) {
            return t;
          }
        }
      }
    } catch (e) {
      console.warn("getTeacherName error:", e);
    }
    return "No Teacher Info";
  };

  const teacherName = getTeacherName();

  const extSession = session as ExtendedSessionItem;
  let attendanceObj: unknown = null;

  const candidates: unknown[] = [
    session.attendance,
    extSession.status,
    extSession.s,
    extSession.isPresent,
    extSession.attended,
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      attendanceObj = c;
      break;
    }
  }

  const status = getAttendanceStatusFromObj(attendanceObj);

  const getChipConfig = () => {
    switch (status) {
      case "present":
        return { label: "PRESENT", bg: "#4caf50", text: "#ffffff" };
      case "absent":
        return { label: "ABSENT", bg: "#f44336", text: "#ffffff" };
      case "not_yet":
      default:
        return { label: "NOT YET", bg: "#757575", text: "#ffffff" };
    }
  };
  const chipConfig = getChipConfig();

  const safeTrim = (v: unknown): string =>
    typeof v === "string" ? v.trim() : "";
  const startTimeCandidate = safeTrim(session.startTime) || "";
  const endTimeCandidate = safeTrim(session.endTime) || "";
  const defaultStart =
    session.slotNumber && session.slotNumber <= 2 ? "09:00" : "13:00";
  const defaultEnd =
    session.slotNumber && session.slotNumber <= 2 ? "11:30" : "16:30";
  const startTime = startTimeCandidate || defaultStart;
  const endTime = endTimeCandidate || defaultEnd;
  const timeLabel = `${startTime} - ${endTime}`;

  const dateDisplay = session.date ? formatDateDisplay(session.date) : "";

  const statusLabel = chipConfig.label;
  const isEmpty = !session.courseName || session.courseName === "-";

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        borderRadius: 0,
        boxShadow: "none",
        border: "none",
        height: isEmpty ? { xs: "60px", sm: "100%" } : "100%",
        minHeight: isEmpty ? { xs: "60px", sm: "auto" } : "auto",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s ease",
        "&:hover": {
          borderColor: "#B90000",
          cursor: onClick ? "pointer" : "default",
        },
        ...style,
      }}
    >
      <CardContent
        sx={{
          p: { xs: 0.5, sm: 0.5 },
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          "&:last-child": { pb: { xs: 0.5, sm: 0.5 } },
        }}
      >
        {isEmpty ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
              minHeight: { xs: "40px", sm: "auto" },
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: "#E0E0E0",
                fontWeight: 300,
                fontSize: { xs: "1.5rem", sm: "2.5rem" },
              }}
            >
              -
            </Typography>
          </Box>
        ) : isXs || compact ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.8,
              width: "100%",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                color: "#1A1A1A",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {session.courseName ?? "Unknown course"}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "#666",
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
              }}
            >
              <UserRound size={13} />
              {teacherName}
            </Typography>

            {dateDisplay && (
              <Typography
                variant="caption"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "#0277bd",
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", sm: "0.8rem" },
                }}
              >
                <Calendar size={14} />
                {dateDisplay}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#4caf50",
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", sm: "0.8rem" },
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.3,
                }}
              >
                <Clock size={14} />
                {timeLabel}
              </Typography>

              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "0.6rem", sm: "0.65rem" },
                  height: { xs: 22, sm: 24 },
                  backgroundColor: chipConfig.bg,
                  color: chipConfig.text,
                  "& .MuiChip-label": {
                    px: { xs: 0.8, sm: 1 },
                    py: 0,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 0.4 }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.05rem" },
                color: "#1A1A1A",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {session.courseName ?? "Unknown course"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#666",
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                overflow: "hidden",
              }}
            >
              <UserRound size={15} style={{ flexShrink: 0 }} />
              <span
                style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {teacherName}
              </span>
            </Typography>

            {dateDisplay && (
              <Typography
                variant="body2"
                sx={{
                  color: "#0277bd",
                  fontWeight: 700,
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  whiteSpace: "nowrap",
                }}
              >
                <Calendar size={16} style={{ flexShrink: 0 }} />
                {dateDisplay}
              </Typography>
            )}

            <Typography
              variant="body2"
              sx={{
                color: "#4caf50",
                fontWeight: 700,
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                whiteSpace: "nowrap",
              }}
            >
              <Clock size={16} style={{ flexShrink: 0 }} />
              {timeLabel}
            </Typography>

            <Chip
              label={statusLabel}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.65rem", sm: "0.7rem" },
                height: { xs: 24, sm: 26 },
                width: "fit-content",
                backgroundColor: chipConfig.bg,
                color: chipConfig.text,
                "& .MuiChip-label": {
                  px: { xs: 1, sm: 1.2 },
                  py: 0,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionCard;
