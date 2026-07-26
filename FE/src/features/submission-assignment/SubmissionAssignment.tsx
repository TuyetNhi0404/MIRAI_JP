import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import SubmissionUploadModal from "./SubmissionUploadModal";
import { submissionService } from "../../services/submissionService";
import type { EnrolledCourse, AssignmentWithSubmission } from "../../types/submission.types";
import { format } from "date-fns";
import { PageLayout } from "../../components/ui/PageLayout";
import { BaseCard } from "../../components/ui/BaseCard";
import { Stagger, LiftCard } from "../../components/ui/MotionPatterns";
import { brandColors } from "../../theme/theme";

interface AssignmentCardProps {
  assignment: AssignmentWithSubmission;
  onClick: () => void;
}

const SubmissionAssignment: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmission | null>(null);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const response = await submissionService.getMyEnrolledCourses();
        if (response.courses.length === 0) {
          setError("Bạn chưa đăng ký tham gia khóa học nào. Vui lòng đăng ký khóa học trước.");
          setInitialLoading(false);
          return;
        }

        setEnrolledCourses(response.courses);
        const savedCourseId = localStorage.getItem("selectedCourseId");
        const courseToSelect =
          savedCourseId && response.courses.find((c) => c._id === savedCourseId)
            ? savedCourseId
            : response.courses[0]._id;
        setSelectedCourseId(courseToSelect);
      } catch (err) {
        const errorRes = err as { response?: { status?: number } };
        if (errorRes.response?.status === 404) {
          setError("Bạn chưa đăng ký tham gia khóa học nào. Vui lòng đăng ký khóa học trước.");
        } else {
          setError("Không thể tải danh sách khóa học. Vui lòng thử lại.");
        }
      } finally {
        setInitialLoading(false);
      }
    };

    void fetchEnrolledCourses();
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!selectedCourseId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await submissionService.getAllAssignments(selectedCourseId, {
        search: searchQuery || undefined,
        limit: 100,
        page: 1,
      });

      const assignmentsWithStatus = await Promise.all(
        (response.assignments || []).map(async (assignment) => {
          try {
            const submissionResponse = await submissionService.getMySubmission(assignment._id);
            return {
              ...assignment,
              submission: submissionResponse.submission,
            } as AssignmentWithSubmission;
          } catch {
            return {
              ...assignment,
              submission: null,
            } as AssignmentWithSubmission;
          }
        })
      );

      setAssignments(assignmentsWithStatus);
    } catch (err) {
      const errorRes = err as { response?: { status?: number; data?: { message?: string } } };
      const errorMsg = errorRes.response?.data?.message || "Không thể tải danh sách bài tập";
      if (errorRes.response?.status === 404) {
        setError(null);
        setAssignments([]);
      } else if (errorRes.response?.status === 401 || errorRes.response?.status === 403) {
        setError("Bạn không có quyền truy cập. Vui lòng đăng nhập lại.");
      } else {
        setError(errorMsg);
        setAssignments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, searchQuery]);

  const handleViewDetail = (assignment: AssignmentWithSubmission) => {
    setSelectedAssignment(assignment);
    setOpenUpload(true);
  };

  const handleUploadSuccess = async () => {
    await fetchAssignments();
    setOpenUpload(false);
    setSelectedAssignment(null);
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return assignment.status !== "closed";
    if (statusFilter === "closed") return assignment.status === "closed";
    return true;
  });

  const assignmentStats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter((a) => ["submitted", "graded", "late"].includes(a.submission?.status || "not_submitted")).length;
    const graded = assignments.filter((a) => a.submission?.status === "graded").length;
    const notSubmitted = total - submitted;
    return { total, submitted, graded, notSubmitted };
  }, [assignments]);

  useEffect(() => {
    if (selectedCourseId) {
      void fetchAssignments();
    }
  }, [selectedCourseId, fetchAssignments]);

  if (initialLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px] gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải danh sách khóa học...</p>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <PageLayout>
        <BaseCard className="text-center py-12">
          <h4 className="text-sm font-extrabold text-slate-800 m-0">Bạn chưa đăng ký khóa học nào</h4>
          <p className="text-xs text-slate-400 m-0">Vui lòng đăng ký khóa học để xem và nộp bài tập</p>
        </BaseCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Filters & Control bar */}
      <BaseCard className="!p-4 bg-slate-50/50 border-slate-150/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Course Selector Dropdown (Adds a premium global layout UX) */}
            <div className="flex flex-col gap-1 w-full sm:w-60">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Khóa học</span>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  localStorage.setItem("selectedCourseId", e.target.value);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                {enrolledCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search filter input */}
            <div className="flex flex-col gap-1 w-full sm:flex-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Tìm kiếm</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm bài tập..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!selectedCourseId || loading}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Filter drop-down action button */}
          <div className="flex items-end gap-2 shrink-0 self-end md:self-auto relative">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Lọc trạng thái</span>
              <button
                onClick={() => setShowFilterDropdown((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition active:scale-95 bg-white ${
                  statusFilter !== "all" ? "border-blue-300 text-blue-650 bg-blue-50/10" : "border-slate-200 text-slate-650"
                }`}
              >
                <Filter size={14} />
                <span>
                  {statusFilter === "all" ? "Tất cả" : statusFilter === "active" ? "Đang mở" : "Đã đóng"}
                </span>
              </button>
            </div>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-10 animate-fadeIn">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-slate-50 ${
                    statusFilter === "all" ? "text-blue-600 bg-blue-50/10" : "text-slate-600"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("active");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-slate-50 ${
                    statusFilter === "active" ? "text-blue-600 bg-blue-50/10" : "text-slate-600"
                  }`}
                >
                  Đang mở
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("closed");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-slate-50 ${
                    statusFilter === "closed" ? "text-blue-600 bg-blue-50/10" : "text-slate-600"
                  }`}
                >
                  Đã đóng
                </button>
              </div>
            )}
          </div>
        </div>
      </BaseCard>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-550 hover:text-red-750 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách bài tập...</p>
        </div>
      )}

      {/* Bento summary: 1 hero + 3 stat tiles */}
      {!loading && assignments.length > 0 && (
        <Stagger className="mb-5" delay={0.05}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mira-stagger">
            <LiftCard lift={3} className="mira-hover-halo rounded-xl col-span-2 md:col-span-1">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: brandColors.paper, border: `1px solid ${brandColors.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${brandColors.red}14`, color: brandColors.red }}>
                  <ClipboardList size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">Tổng bài tập</div>
                  <div className="text-sm font-bold leading-tight text-text-primary">{assignmentStats.total}</div>
                </div>
              </div>
            </LiftCard>
            <LiftCard lift={2} className="mira-hover-halo rounded-xl">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: brandColors.paper, border: `1px solid ${brandColors.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#3B82F614", color: "#3B82F6" }}>
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">Đã nộp</div>
                  <div className="text-sm font-bold leading-tight text-text-primary">{assignmentStats.submitted}</div>
                </div>
              </div>
            </LiftCard>
            <LiftCard lift={2} className="mira-hover-halo rounded-xl">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: brandColors.paper, border: `1px solid ${brandColors.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#10B98114", color: "#10B98114" }}>
                  <CheckCircle2 size={18} style={{ color: "#10B981" }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">Đã chấm</div>
                  <div className="text-sm font-bold leading-tight text-text-primary">{assignmentStats.graded}</div>
                </div>
              </div>
            </LiftCard>
            <LiftCard lift={2} className="mira-hover-halo rounded-xl">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: brandColors.paper, border: `1px solid ${brandColors.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F59E0B14", color: "#F59E0B" }}>
                  <AlertCircle size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">Chưa nộp</div>
                  <div className="text-sm font-bold leading-tight text-text-primary">{assignmentStats.notSubmitted}</div>
                </div>
              </div>
            </LiftCard>
          </div>
        </Stagger>
      )}

      {/* Assignments grid content */}
      {!loading && selectedCourseId && (
        <>
          {filteredAssignments.length === 0 ? (
            <BaseCard className="text-center py-16">
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-sm font-extrabold text-slate-700 m-0">Không tìm thấy bài tập nào</p>
                <p className="text-xs text-slate-400 m-0 leading-relaxed">
                  {searchQuery
                    ? "Không tìm thấy kết quả phù hợp với tìm kiếm của bạn."
                    : statusFilter === "closed"
                      ? "Chưa có bài tập nào đã đóng trong khóa học này."
                      : statusFilter === "active"
                        ? "Tất cả bài tập đã đóng hoặc chưa được giao."
                        : "Chưa có bài tập nào được giao trong khóa học này."}
                </p>
              </div>
            </BaseCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment._id}
                  assignment={assignment}
                  onClick={() => handleViewDetail(assignment)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SubmissionUploadModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        assignment={selectedAssignment}
        onSuccess={handleUploadSuccess}
      />
    </PageLayout>
  );
};

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onClick }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy, hh:mm a");
    } catch {
      return dateString;
    }
  };

  const submissionStatus = assignment.submission?.status || "not_submitted";
  const isOverdue =
    assignment.status === "closed" ||
    (assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false);

  const getSubmissionBadgeStyles = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "submitted":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "late":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const getSubmissionLabel = (status: string) => {
    switch (status) {
      case "graded":
        return "Đã chấm điểm";
      case "submitted":
        return "Đã nộp";
      case "late":
        return "Nộp trễ";
      default:
        return "Chưa nộp";
    }
  };

  return (
    <LiftCard
      lift={4}
      className="mira-hover-halo rounded-xl overflow-hidden"
      glow={false}
    >
      <BaseCard
        onClick={onClick}
        className="!border-0 !rounded-none flex flex-col justify-between cursor-pointer h-full"
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background:
              isOverdue
                ? "linear-gradient(90deg, #EF4444, #DC2626)"
                : "linear-gradient(90deg, #10B981, #059669)",
          }}
        />
        <div className="space-y-4 px-5 pt-4 pb-5">
          {/* Title & Type header */}
          <div className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                BÀI TẬP VỀ NHÀ
              </span>
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                  isOverdue
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}
              >
                {assignment.status === "closed"
                  ? "Đã đóng"
                  : isOverdue
                  ? "Đã quá hạn"
                  : "Đang mở"}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 leading-tight m-0 select-all hover:text-blue-650 transition">
              {assignment.title}
            </h3>
          </div>

        {/* Course Name & Creator Info */}
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Khóa học</span>
            <span className="font-extrabold text-slate-700">{assignment.courseName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Người giao</span>
            <span className="font-extrabold text-slate-700">{assignment.teacherName}</span>
          </div>
        </div>

        {/* Date / Due Date */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Thời gian bắt đầu</span>
            <span className="font-semibold text-slate-500">{formatDate(assignment.createdAt)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Hạn nộp</span>
            <span className="font-extrabold text-red-600">{formatDate(assignment.dueDate)}</span>
          </div>
        </div>
      </div>

      {/* Submission status & Score block */}
      <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold block">Bài nộp:</span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getSubmissionBadgeStyles(
              submissionStatus
            )}`}
          >
            {getSubmissionLabel(submissionStatus)}
          </span>
        </div>

        {assignment.submission?.status === "graded" && (
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold block">ĐIỂM SỐ</span>
            <span className="text-sm font-black text-blue-650">
              {assignment.submission.score} / {assignment.maxScore}
            </span>
          </div>
        )}
      </div>
      </BaseCard>
    </LiftCard>
  );
};

export default SubmissionAssignment;
