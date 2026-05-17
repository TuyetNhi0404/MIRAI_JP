import React, { useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Stack,
} from "@mui/material";
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
  d.toLocaleDateString("en-US", {
    weekday: "short",
  });

type SessionType = "morning" | "afternoon";

const EmptySlot: React.FC = () => (
  <Box
    sx={{
      height: "100%",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "transparent",
      minHeight: { xs: "60px", sm: "200px" },
      py: 0.7,
      px: 1.7,
    }}
  >
    <Typography
      variant="h4"
      sx={{
        color: "#FF5722",
        fontWeight: 600,
        fontSize: { xs: "1.5rem", sm: "1.8rem" },
      }}
    >
      -
    </Typography>
  </Box>
);

const normalizeDateYMD = (val: unknown): string => {
  if (!val) return "";
  
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  
  const d = new Date(String(val));
  if (isNaN(d.getTime())) {
    console.warn("[ScheduleGrid] Invalid date:", val);
    return "";
  }
  
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const days = useMemo(() => {
    const monday = parseYMD(weekStart);
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return dt;
    });
  }, [weekStart]);

  const sessions: { type: SessionType; label: string }[] = [
    { type: "morning", label: "Morning" },
    { type: "afternoon", label: "Afternoon" },
  ];

  const weekStartYMD = weekStart; 
  const sunday = new Date(parseYMD(weekStart));
  sunday.setDate(sunday.getDate() + 6); 
  const weekEndYMD = ymd(sunday);

  console.log(`\n[ScheduleGrid] 📅 Week range: ${weekStartYMD} to ${weekEndYMD}`);

  const validItems = useMemo(() => {
    console.log(`\n[ScheduleGrid] 🔍 Processing ${items.length} items for week ${weekStartYMD} to ${weekEndYMD}`);
    const out: SessionItem[] = [];
    
    items.forEach((it, index) => {
      const dateNorm = normalizeDateYMD(it.date);
      
      if (!dateNorm) {
        console.warn(`[ScheduleGrid]  Item ${index + 1} - invalid date:`, it.date);
        return;
      }

      let slot = typeof it.slotNumber === "number" ? it.slotNumber : NaN;
      if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
        const derivedSlot = deriveSlotFromStartTime(it.startTime);
        console.warn(
          `[ScheduleGrid]  Item ${index + 1} - invalid slot, deriving from startTime:`,
          { originalSlot: it.slotNumber, startTime: it.startTime, derivedSlot }
        );
        slot = derivedSlot;
      }
      slot = clampSlot(Math.round(slot));

      const isInRange = dateNorm >= weekStartYMD && dateNorm <= weekEndYMD;
      
      if (!isInRange) {
        console.log(`[ScheduleGrid]  Item ${index + 1} - outside week:`, {
          date: dateNorm,
          weekStart: weekStartYMD,
          weekEnd: weekEndYMD,
        });
        return;
      }

      console.log(`[ScheduleGrid]  Item ${index + 1} included:`, {
        date: dateNorm,
        course: it.courseName,
        slot,
        attendance: it.attendance?.status
      });

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

    console.log(`\n[ScheduleGrid]  Valid items: ${out.length}/${items.length}`);
    if (out.length > 0) {
      console.table(out.map(item => ({
        date: item.date,
        course: item.courseName,
        slot: item.slotNumber,
        time: `${item.startTime}-${item.endTime}`,
        attendance: item.attendance?.status || 'not_yet'
      })));
    }
    
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

  if (isMobile) {
    return (
      <Box sx={{ p: 2 }}>
        {days.map((d) => {
          const iso = ymd(d);
          return (
            <Box key={iso} mb={3}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: "#333",
                  fontSize: "1.1rem",
                  borderBottom: "2px solid #B90000",
                  pb: 0.5,
                  fontFamily: "Inter, Roboto, sans-serif",
                }}
              >
                {formatDayShort(d)}
              </Typography>
              <Stack spacing={1.5}>
                {sessions.map((session) => {
                  const item = findSession(iso, session.type);
                  return (
                    <Box key={`${iso}-${session.type}`}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#BF360C",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          mb: 0.5,
                          display: "block",
                          fontFamily: "Inter, Roboto, sans-serif",
                          bgcolor: "#F5F5F5",
                          p: 1,
                          borderRadius: 0,
                        }}
                      >
                        {session.label}
                      </Typography>
                      {item ? <SessionCard session={item} compact /> : <EmptySlot />}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto", mx: "auto" }}>
      <Box sx={{ border: "1px solid #BDBDBD" }}>
        {/* Header Row */}
        <Grid
          container
          spacing={0}
          alignItems="center"
          sx={{
            width: "100%",
            minWidth: "800px",
            borderBottom: "2px solid #B90000",
          }}
        >
          <Grid item sx={{ width: "100px", flexShrink: 0 }}>
            <Paper elevation={0} sx={{ py: 2, px: 0.5, bgcolor: "#FFFFFF", textAlign: "center", borderRight: "1px solid #BDBDBD" }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#666",
                  fontFamily: "Inter, Roboto, sans-serif",
                }}
              >
                Session
              </Typography>
            </Paper>
          </Grid>

          {days.map((d, idx) => (
            <Grid item key={d.toISOString()} sx={{ flex: 1, minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  textAlign: "center",
                  bgcolor: "#F5F5F5",
                  py: 2.5,
                  borderRight: idx < days.length - 1 ? "1px solid #BDBDBD" : "none",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "#333",
                    fontFamily: "Inter, Roboto, sans-serif",
                  }}
                >
                  {formatDayShort(d)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Session Rows */}
        {sessions.map((session, sessionIdx) => (
          <Grid
            container
            spacing={0}
            alignItems="stretch"
            key={session.type}
            sx={{
              width: "100%",
              minWidth: "800px",
              borderBottom: sessionIdx < sessions.length - 1 ? "1px solid #BDBDBD" : "none",
            }}
          >
            {/* Session Label */}
            <Grid item sx={{ width: "100px", flexShrink: 0 }}>
              <Paper
                sx={{
                  py: 2,
                  px: 0.5,
                  height: "100%",
                  minHeight: "200px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  bgcolor: "#F5F5F5",
                  borderLeft: "none",
                  borderRight: "1px solid #BDBDBD",
                  borderRadius: 0,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#E65100",
                    fontFamily: "Inter, Roboto, sans-serif",
                  }}
                >
                  {session.label}
                </Typography>
              </Paper>
            </Grid>

            {/* Session Cards */}
            {days.map((d, dayIdx) => {
              const iso = ymd(d);
              const item = findSession(iso, session.type);

              return (
                <Grid
                  item
                  key={`${iso}-${session.type}`}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "stretch",
                    borderRight: dayIdx < days.length - 1 ? "1px solid #BDBDBD" : "none",
                    p: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      minHeight: "200px",
                      display: "flex",
                      p: 0,
                      pt: "4px",
                      px: 1,
                    }}
                  >
                    {item ? (
                      <SessionCard session={item} style={{ width: "100%", border: "none" }} />
                    ) : (
                      <EmptySlot />
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ))}
      </Box>
    </Box>
  );
};

export default ScheduleGrid;
