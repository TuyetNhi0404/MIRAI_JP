import React, { useMemo } from "react";
import type { SessionItem } from "../../types/schedule.types";
import SessionCard from "./SessionCard";

interface Props {
  items: SessionItem[];
  weekStart: string; // YYYY-MM-DD (Monday)
  slotColor?: string;
  sessionsList?: { _id: string; sessionName: string; startTime: string; endTime: string }[];
}

const DEFAULT_SESSIONS = [
  { _id: "1", sessionName: "Slot 1", startTime: "07:30", endTime: "09:30" },
  { _id: "2", sessionName: "Slot 2", startTime: "09:45", endTime: "11:45" },
  { _id: "3", sessionName: "Slot 3", startTime: "12:30", endTime: "14:30" },
  { _id: "4", sessionName: "Slot 4", startTime: "14:45", endTime: "16:45" },
];

const parseYMD = (ymdStr: string): Date => {
  const [y, m, d] = ymdStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const ymd = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDayShort = (d: Date) =>
  d.toLocaleDateString("vi-VN", {
    weekday: "long",
  });

const EmptySlot: React.FC = () => (
  <div className="w-full h-[120px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-2xl border border-dashed border-slate-200/60 transition-all duration-300 hover:bg-white/60 hover:border-slate-300/80 select-none">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trống</span>
  </div>
);

const normalizeDateYMD = (val: unknown): string => {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return "";
  return ymd(d);
};

const deriveSlotFromStartTime = (startTime?: string | null | undefined) => {
  if (!startTime) return 1;
  const hour = Number(String(startTime).split(":")[0]);
  if (!Number.isFinite(hour) || Number.isNaN(hour)) return 1;
  return hour < 12 ? 1 : 4;
};

const clampSlot = (slot: number) => {
  if (slot < 1) return 1;
  if (slot > 5) return 5;
  return slot;
};

const ScheduleGrid: React.FC<Props> = ({ items, weekStart, sessionsList }) => {
  const days = useMemo(() => {
    const monday = parseYMD(weekStart);
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return dt;
    });
  }, [weekStart]);

  const activeSessions = useMemo(() => {
    const list = sessionsList && sessionsList.length > 0 ? sessionsList : DEFAULT_SESSIONS;
    return list.map((s, index) => {
      const label = s.sessionName.replace(/Slot\s*/i, "Ca ");
      return {
        id: s._id,
        sessionName: s.sessionName,
        label: `${label}`,
        time: `${s.startTime} - ${s.endTime}`,
        startTime: s.startTime,
        slotNumber: index + 1,
      };
    });
  }, [sessionsList]);

  const weekStartYMD = weekStart;
  const sunday = new Date(parseYMD(weekStart));
  sunday.setDate(sunday.getDate() + 6);
  const weekEndYMD = ymd(sunday);

  const validItems = useMemo(() => {
    const out: SessionItem[] = [];
    items.forEach((it) => {
      const dateNorm = normalizeDateYMD(it.date);
      if (!dateNorm) return;

      let slot = typeof it.slotNumber === "number" ? it.slotNumber : NaN;
      if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
        slot = deriveSlotFromStartTime(it.startTime);
      }
      slot = clampSlot(Math.round(slot));

      const isInRange = dateNorm >= weekStartYMD && dateNorm <= weekEndYMD;
      if (!isInRange) return;

      out.push({
        ...it,
        date: dateNorm,
        slotNumber: slot,
        startTime: it.startTime ?? (slot <= 2 ? "09:00" : "13:00"),
        endTime: it.endTime ?? (slot <= 2 ? "11:30" : "16:30"),
      });
    });

    out.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return (a.slotNumber ?? 0) - (b.slotNumber ?? 0);
    });

    return out;
  }, [items, weekStartYMD, weekEndYMD]);

  const findSession = (dateIso: string, sessionName: string, startTime: string): SessionItem | null => {
    const matched = validItems.filter((it) => it.date === dateIso);
    if (!matched.length) return null;
    return matched.find((it) => {
      const itName = it.sessionName || "";
      const isNameMatch = itName.trim().toLowerCase() === sessionName.trim().toLowerCase();
      const isTimeMatch = it.startTime && startTime && it.startTime.trim() === startTime.trim();
      return isNameMatch || isTimeMatch;
    }) ?? null;
  };

  return (
    <div className="w-full">
      {/* Mobile view - Stacks by day */}
      <div className="block lg:hidden space-y-6">
        {days.map((d) => {
          const iso = ymd(d);
          return (
            <div key={iso} className="border border-slate-150 rounded-2xl bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-blue-600 border-b border-blue-100 pb-2 capitalize">
                {formatDayShort(d)} ({iso.split("-").reverse().join("/")})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map((session) => {
                  const item = findSession(iso, session.sessionName, session.startTime);
                  return (
                    <div key={`${iso}-${session.id}`} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {session.label} ({session.time})
                      </span>
                      {item ? <SessionCard session={item} /> : <EmptySlot />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop view - Beautiful grid schedule */}
      <div className="hidden lg:block overflow-x-auto border border-slate-150 rounded-2xl seigaiha-pattern shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <table className="w-full border-collapse table-fixed min-w-[885px]">
          <colgroup>
            <col style={{ width: "80px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
            <col style={{ width: "115px" }} />
          </colgroup>
          <thead>
            <tr className="bg-primary-color text-white border-b border-primary-color-hover">
              <th className="py-4 px-2 text-[10px] font-extrabold text-white/80 uppercase text-center border-r border-white/10">
                Ca học
              </th>
              {days.map((d) => (
                <th key={d.toISOString()} className="py-4 px-2 text-xs font-bold text-white uppercase text-center border-r border-white/10 last:border-r-0">
                  <span className="block font-black text-white tracking-wide">{formatDayShort(d)}</span>
                  <span className="text-[9px] text-white font-extrabold bg-white/15 px-2 py-0.5 rounded-full w-max mx-auto mt-1 block">
                    {ymd(d).split("-").reverse().slice(0, 2).join("/")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSessions.map((session, sIdx) => (
              <tr key={session.id} className={sIdx < activeSessions.length - 1 ? "border-b border-slate-150" : ""}>
                <td className="py-6 px-2 bg-accent-color/30 text-center font-extrabold text-primary-color text-[10px] uppercase border-r border-slate-100/60 align-middle">
                  <div className="text-primary-color font-black tracking-wider line-clamp-1">
                    {session.label}
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                    {session.time}
                  </div>
                </td>
                {days.map((d) => {
                  const iso = ymd(d);
                  const item = findSession(iso, session.sessionName, session.startTime);
                  return (
                    <td key={`${iso}-${session.id}`} className="p-2 border-r border-slate-100/60 last:border-r-0 h-full">
                      {item ? <SessionCard session={item} /> : <EmptySlot />}
                    </td>
                  );
                })}
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleGrid;
