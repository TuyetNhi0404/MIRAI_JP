import { useEffect, useState } from "react";
import { userService } from "../../services/accountService";
import { courseService } from "../../services/courseService";
import { enrollmentService } from "../../services/enrollment.service";
import { requestScheduleService } from "../../services/requestScheduleService";
import { adminLeaderboardService } from "../../services/admin-leaderboard.service";
import { querySWR } from "../../utils/queryCache";
import type { User } from "../../types/account.types";
import type { Course } from "../../services/courseService";
import type { Enrollment } from "../../types/enrollment.types";
import type { RequestSchedule } from "../../types/requestSchedule.types";
import type { GlobalStudent } from "../../types/admin-leaderboard.types";

export interface DashboardData {
  users: User[];
  courses: Course[];
  pendingEnrollments: Enrollment[];
  pendingLeaveRequests: RequestSchedule[];
  topLearners: GlobalStudent[];
  totalStudents: number;
}

const EMPTY: DashboardData = {
  users: [],
  courses: [],
  pendingEnrollments: [],
  pendingLeaveRequests: [],
  topLearners: [],
  totalStudents: 0,
};

const KEYS = {
  users: "admin-home:users",
  courses: "admin-home:courses",
  pendingEnroll: "admin-home:pendingEnroll",
  pendingLeave: "admin-home:pendingLeave",
  leaderboard: "admin-home:leaderboard",
} as const;

interface UsersResponse {
  users?: User[];
}

interface LeaderboardResponse {
  topStudents?: GlobalStudent[];
  totalStudents?: number;
}

interface EnrollmentResponse {
  data?: Enrollment[];
}

const CACHE_OPTS = { staleAfter: 30_000, expireAfter: 5 * 60_000 };

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, courses, pendingEnroll, pendingLeave, leaderboard] = await Promise.all([
          querySWR<UsersResponse>(KEYS.users, () => userService.getAll(), CACHE_OPTS).catch(() => null),
          querySWR<Course[]>(KEYS.courses, () => courseService.getAll(), CACHE_OPTS).catch(() => null),
          querySWR<EnrollmentResponse>(KEYS.pendingEnroll, () => enrollmentService.getAllEnrollments("pending"), CACHE_OPTS).catch(() => null),
          querySWR<RequestSchedule[]>(KEYS.pendingLeave, () => requestScheduleService.getAllRequests("pending"), CACHE_OPTS).catch(() => null),
          querySWR<LeaderboardResponse>(KEYS.leaderboard, () => adminLeaderboardService.getGlobalLeaderboard(5), CACHE_OPTS).catch(() => null),
        ]);
        if (cancelled) return;
        setData({
          users: users?.users ?? [],
          courses: courses ?? [],
          pendingEnrollments: pendingEnroll?.data ?? [],
          pendingLeaveRequests: pendingLeave ?? [],
          topLearners: leaderboard?.topStudents ?? [],
          totalStudents: leaderboard?.totalStudents ?? 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
