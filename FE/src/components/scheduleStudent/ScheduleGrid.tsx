import React, { useMemo } from "react";
import type { SessionItem } from "../../types/schedule.types";
import SessionCard from "./SessionCard";

interface Props {
  items: SessionItem[];
  weekStart: string; // YYYY-MM-DD (Monday)
  slotColor?: string;
}

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

type SessionType = "morning" | "afternoon";

const EmptySlot: React.FC = () => (
  <div className="w-full h-full min-h-[60px] sm:min-h-[140px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
    <span className="text-xl font-light text-slate-300">-</span>
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

const ScheduleGrid: React.FC<Props> = ({ items, weekStart }) => {
  const days = useMemo(() => {
    const monday = parseYMD(weekStart);
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return dt;
    });
  }, [weekStart]);

  const sessions: { type: SessionType; label: string }[] = [
    { type: "morning", label: "Buổi sáng" },
    { type: "afternoon", label: "Buổi chiều" },
  ];

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

  const findSession = (dateIso: string, sessionType: SessionType): SessionItem | null => {
    const matched = validItems.filter((it) => it.date === dateIso);
    if (!matched.length) return null;
    if (sessionType === "morning") {
      return matched.find((it) => it.slotNumber === 1 || it.slotNumber === 2) ?? null;
    } else {
      return matched.find((it) => it.slotNumber >= 3 && it.slotNumber <= 5) ?? null;
    }
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
                {sessions.map((session) => {
                  const item = findSession(iso, session.type);
                  return (
                    <div key={`${iso}-${session.type}`} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {session.label}
                      </span>
                      {item ? <SessionCard session={item} compact /> : <EmptySlot />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop view - Beautiful grid schedule */}
      <div className="hidden lg:block overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase text-center w-28 border-r border-slate-100">
                Ca học
              </th>
              {days.map((d) => (
                <th key={d.toISOString()} className="py-4 px-4 text-xs font-bold text-slate-700 uppercase text-center border-r border-slate-100 last:border-r-0">
                  <span className="block font-black">{formatDayShort(d)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{ymd(d).split("-").reverse().slice(0, 2).join("/")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, sIdx) => (
              <tr key={session.type} className={sIdx < sessions.length - 1 ? "border-b border-slate-100" : ""}>
                <td className="py-6 px-4 bg-slate-50/50 text-center font-bold text-slate-500 text-xs uppercase border-r border-slate-100 align-middle">
                  {session.label}
                </td>
                {days.map((d) => {
                  const iso = ymd(d);
                  const item = findSession(iso, session.type);
                  return (
                    <td key={`${iso}-${session.type}`} className="p-3 border-r border-slate-100 last:border-r-0 w-40 align-top">
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
