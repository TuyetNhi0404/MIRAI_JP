import React from "react";
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
    userObj.firstName && userObj.lastName ? `${userObj.firstName} ${userObj.lastName}` : undefined,
    userObj.lastName && userObj.firstName ? `${userObj.lastName} ${userObj.firstName}` : undefined,
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

const getAttendanceStatusFromObj = (attendanceObj: unknown): AttendanceStatus => {
  if (!attendanceObj && attendanceObj !== false) return "not_yet";
  let raw: unknown = null;
  if (attendanceObj && typeof attendanceObj === "object" && !Array.isArray(attendanceObj)) {
    const obj = attendanceObj as AttendanceObject;
    raw = obj.status ?? obj.state ?? obj.s ?? obj.attended ?? obj.isPresent ?? null;
  }
  if (raw === null || raw === undefined) raw = attendanceObj;
  if (raw === null || raw === undefined) return "not_yet";

  const normalized = String(raw).toLowerCase().trim();
  const presentTerms = new Set(["present", "attended", "presented", "yes", "true", "1", "có mặt", "cómặt", "co mat", "đã điểm danh", "attend"]);
  const absentTerms = new Set(["absent", "missing", "missed", "no", "false", "0", "vắng", "vắng mặt", "vang", "abs", "cancelled"]);

  if (presentTerms.has(normalized)) return "present";
  if (absentTerms.has(normalized)) return "absent";
  if (typeof attendanceObj === "boolean") return attendanceObj ? "present" : "absent";

  if (!Number.isNaN(Number(normalized))) {
    const n = Number(normalized);
    if (n === 1) return "present";
    if (n === 0) return "absent";
  }
  return "not_yet";
};

const SessionCard: React.FC<Props> = ({ session, style, onClick }) => {
  const getTeacherName = (): string => {
    try {
      if (session.teacher && typeof session.teacher === "string") {
        const trimmed = session.teacher.trim();
        if (trimmed && !looksLikeEmail(trimmed) && !INVALID_NAMES.has(trimmed)) {
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
        typeof extSession.instructor === "object" ? (extSession.instructor as UserObject).name : undefined,
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
    return "Giáo viên chưa xác định";
  };

  const teacherName = getTeacherName();
  const extSession = session as ExtendedSessionItem;
  let attendanceObj: unknown = null;
  const candidates = [session.attendance, extSession.status, extSession.s, extSession.isPresent, extSession.attended];

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
        return { label: "CÓ MẶT", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
      case "absent":
        return { label: "VẮNG MẶT", bg: "bg-rose-50 text-rose-700 border border-rose-200" };
      case "not_yet":
      default:
        return { label: "CHƯA HỌC", bg: "bg-blue-50 text-blue-700 border border-blue-200" };
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case "present":
        return "border-l-emerald-500";
      case "absent":
        return "border-l-rose-500";
      case "not_yet":
      default:
        return "border-l-blue-500";
    }
  };

  const chipConfig = getChipConfig();
  const borderColor = getBorderColor();

  const safeTrim = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const startTime = safeTrim(session.startTime) || (session.slotNumber && session.slotNumber <= 2 ? "09:00" : "13:00");
  const endTime = safeTrim(session.endTime) || (session.slotNumber && session.slotNumber <= 2 ? "11:30" : "16:30");
  const timeLabel = `${startTime} - ${endTime}`;
  const dateDisplay = session.date ? formatDateDisplay(session.date) : "";
  const isEmpty = !session.courseName || session.courseName === "-";

  if (isEmpty) {
    return (
      <div className="w-full h-[120px] flex flex-col items-center justify-center bg-slate-50/10 rounded-2xl border border-dashed border-slate-200/60 transition-all duration-300 hover:bg-slate-50/30 hover:border-slate-300/80 select-none">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Trống</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={style}
      className={`w-full h-[120px] bg-white border border-slate-100 border-l-4 ${borderColor} rounded-r-2xl rounded-l-md p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-1.5 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="space-y-0.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#1F2238] leading-tight line-clamp-1 hover:text-blue-600 transition-colors break-words">
          {session.courseName ?? "Chưa xác định"}
        </h4>
        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
          <UserRound size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacherName}</span>
        </div>
      </div>

      <div className="mt-auto space-y-1 border-t border-slate-50 pt-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 text-[9px] text-slate-600 font-bold uppercase">
            <Clock size={11} className="text-emerald-500 shrink-0" />
            <span>{timeLabel}</span>
          </div>
          <div className={`text-[8px] font-black tracking-wider px-2 py-0.5 rounded-full ${chipConfig.bg}`}>
            {chipConfig.label}
          </div>
        </div>
        {dateDisplay && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
            <Calendar size={11} className="text-blue-400 shrink-0" />
            <span>{dateDisplay}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
