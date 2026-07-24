import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CloudUpload,
  Trash2,
  FileText,
  Download,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
} from "lucide-react";
import { submissionService } from "../../services/submissionService";
import type { AssignmentWithSubmission } from "../../types/submission.types";
import { format } from "date-fns";

interface SubmissionUploadModalProps {
  open: boolean;
  onClose: () => void;
  assignment: AssignmentWithSubmission | null;
  onSuccess: () => void;
}

interface SubmissionFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

const SubmissionUploadModal: React.FC<SubmissionUploadModalProps> = ({
  open,
  onClose,
  assignment,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"view" | "submit" | "resubmit">("submit");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submission = assignment?.submission;
  const isSubmitted = submission !== null && submission !== undefined;
  const isGraded = submission?.status === "graded";
  const isAssignmentClosed = assignment?.status === "closed";
  const isOverdue = assignment
    ? isAssignmentClosed || (assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false)
    : false;

  useEffect(() => {
    if (assignment) {
      if (isSubmitted) {
        setMode("view");
      } else {
        setMode("submit");
      }
      setSelectedFiles([]);
      setNote("");
      setError(null);
      setSuccess(null);
    }
  }, [assignment, open, isSubmitted]);

  if (!open || !assignment) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!assignment) return;
    if (isOverdue) {
      setError("Bài tập đã quá hạn nộp. Hệ thống không cho phép gửi bài nộp nữa.");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("Vui lòng chọn ít nhất một tệp tin");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      if (note.trim()) formData.append("note", note.trim());

      if (mode === "resubmit" && submission?._id) {
        await submissionService.updateSubmission(submission._id, formData);
        setSuccess("Nộp lại bài tập thành công!");
      } else {
        await submissionService.submitAssignment(assignment._id, formData);
        setSuccess("Nộp bài tập thành công!");
      }
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const errRes = err as { response?: { data?: { message?: string } } };
      setError(errRes.response?.data?.message || "Có lỗi xảy ra trong quá trình nộp bài");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setNote("");
    setError(null);
    setSuccess(null);
    setMode("submit");
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'lúc' HH:mm");
    } catch {
      return dateString;
    }
  };

  const statusConfig = {
    graded: { label: "Đã chấm điểm", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    late: { label: "Nộp muộn", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    submitted: { label: "Đã nộp", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    not_submitted: { label: "Chưa nộp", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-400" },
  };

  const submissionStatus = (submission?.status as keyof typeof statusConfig) || "not_submitted";
  const statusInfo = statusConfig[submissionStatus] || statusConfig.not_submitted;

  const modalTitle =
    mode === "view" ? "Chi tiết bài nộp" : mode === "resubmit" ? "Nộp lại bài tập" : "Nộp bài tập";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && !uploading && handleClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.18)] animate-scaleUp overflow-hidden">

        {/* ── Gradient Header ── */}
        <div
          className="relative shrink-0 px-6 pt-5 pb-6 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #C0392B 0%, #E74C3C 50%, #FF6B6B 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <BookOpen size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest m-0">
                  {mode === "view" ? "Xem bài nộp" : mode === "resubmit" ? "Nộp lại" : "Nộp bài"}
                </p>
                <h2 className="text-white text-base font-black m-0 leading-tight">{modalTitle}</h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="shrink-0 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition active:scale-90 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Assignment info pill */}
          <div className="relative mt-4 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <p className="text-white font-extrabold text-sm m-0 truncate">{assignment.title}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              <span className="text-white/75 text-[11px] font-semibold flex items-center gap-1">
                <BookOpen size={11} /> {assignment.courseName}
              </span>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isOverdue ? "text-red-200" : "text-white/75"}`}>
                <Clock size={11} /> Hạn: {formatDate(assignment.dueDate)}
              </span>
            </div>
            {assignment.description && (
              <p className="text-white/60 text-[11px] font-medium mt-2 m-0 leading-relaxed border-t border-white/15 pt-2">
                {assignment.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3.5 animate-fadeIn">
                <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-800 m-0">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm font-black shrink-0">×</button>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-emerald-800 m-0">{success}</p>
              </div>
            )}

            {/* Teacher attached files */}
            {assignment.fileUrls && assignment.fileUrls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1 h-4 rounded-full bg-red-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Tệp đính kèm bài tập ({assignment.fileUrls.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {assignment.fileUrls.map((fileUrl: string, idx: number) => {
                    const fileName = fileUrl.split("/").pop() || `file-${idx + 1}`;
                    return (
                      <div key={idx} className="group flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/80 transition">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-red-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{fileName}</span>
                        <button
                          onClick={() => handleDownloadFile(fileUrl, fileName)}
                          className="w-7 h-7 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition shrink-0"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── VIEW MODE ── */}
            {mode === "view" && submission && (
              <div>
                {/* Section header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Bài nộp của bạn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{formatDate(submission.submittedAt)}</span>
                  </div>
                </div>

                {/* Grade card */}
                {submission.status === "graded" && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-blue-100">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 flex items-center gap-2">
                      <Award size={14} className="text-white/80" />
                      <span className="text-white text-[11px] font-black uppercase tracking-wider">Kết quả chấm điểm</span>
                    </div>
                    <div className="bg-blue-50/50 px-4 py-3 flex items-center justify-between">
                      <div>
                        {submission.feedback && (
                          <p className="text-xs text-slate-600 font-semibold m-0 leading-relaxed">{submission.feedback}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-2xl font-black text-blue-700">{submission.score}</span>
                        <span className="text-xs text-slate-400 font-bold">/{assignment.maxScore}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submitted files */}
                {submission.files && submission.files.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider m-0">
                      Các tệp đã nộp ({submission.files.length})
                    </p>
                    {submission.files.map((file: string | SubmissionFile, idx: number) => {
                      const fileUrl = typeof file === "string" ? file : file.fileUrl;
                      const fileName = typeof file === "string" ? file.split("/").pop() || "file" : file.fileName;
                      const fileSize = typeof file === "string" ? 0 : file.fileSize;
                      return (
                        <div key={idx} className="group flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 m-0 truncate">{fileName}</p>
                            {fileSize > 0 && <p className="text-[10px] text-slate-400 m-0">{formatFileSize(fileSize)}</p>}
                          </div>
                          <button
                            onClick={() => handleDownloadFile(fileUrl, fileName)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-700 transition shrink-0"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Note */}
                {submission.note && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider mb-1">Ghi chú</p>
                    <p className="text-xs text-slate-600 font-medium m-0 leading-relaxed">{submission.note}</p>
                  </div>
                )}

                {/* Locked states */}
                {isGraded && (
                  <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
                    <p className="text-xs font-semibold text-slate-500 m-0">Bài đã chấm điểm — không thể chỉnh sửa.</p>
                  </div>
                )}
                {!isGraded && isOverdue && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-700 m-0">Đã quá hạn nộp — không thể nộp lại.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SUBMIT / RESUBMIT MODE ── */}
            {(mode === "submit" || mode === "resubmit") && (
              <div className="space-y-4">
                {isOverdue ? (
                  <div className="rounded-2xl overflow-hidden border border-red-200">
                    <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-white" />
                      <span className="text-white text-xs font-black uppercase tracking-wider">Bài tập đã quá hạn</span>
                    </div>
                    <div className="bg-red-50 px-4 py-4 text-center">
                      <p className="text-xs text-red-600 font-semibold m-0 leading-relaxed">
                        Thời hạn nộp đã kết thúc vào <strong>{formatDate(assignment.dueDate)}</strong>.<br />
                        Hệ thống không tiếp nhận bài nộp quá hạn.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {mode === "resubmit" && (
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-800 m-0">
                          Nộp lại sẽ ghi đè toàn bộ tệp và ghi chú cũ.
                        </p>
                      </div>
                    )}

                    {/* Drop zone */}
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all group ${
                        uploading
                          ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                          : "border-red-300 bg-red-50/30 hover:bg-red-50/60 hover:border-red-400 cursor-pointer"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        hidden
                        onChange={handleFileSelect}
                        accept="*/*"
                        disabled={uploading}
                      />
                      <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-red-200 transition">
                        <CloudUpload size={22} className="text-red-500" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-700 m-0">Kéo thả tệp vào đây</p>
                      <p className="text-[11px] text-slate-400 font-medium m-0 mt-1">
                        hoặc <span className="text-red-500 font-bold underline underline-offset-2">nhấp để chọn tệp</span>
                      </p>
                    </div>

                    {/* Selected files */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider m-0">
                          Đã chọn ({selectedFiles.length})
                        </p>
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 m-0 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-400 m-0">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(idx)}
                              disabled={uploading}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition active:scale-90 disabled:opacity-40 shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    <div>
                      <label className="text-[11px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">
                        Ghi chú gửi giáo viên <span className="normal-case font-medium">(tùy chọn)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Nhập ghi chú cho giáo viên..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={uploading}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-50 transition resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition active:scale-95 disabled:opacity-50"
          >
            {mode === "view" ? "Đóng" : "Hủy"}
          </button>

          {mode === "view" && !isOverdue && !isGraded && (
            <button
              onClick={() => setMode("resubmit")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white transition active:scale-95 shadow-sm"
              style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}
            >
              <Edit3 size={13} />
              Nộp lại bài
            </button>
          )}

          {(mode === "submit" || mode === "resubmit") && !isOverdue && (
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black text-white transition active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={
                uploading || selectedFiles.length === 0
                  ? { background: "#cbd5e1" }
                  : { background: "linear-gradient(135deg, #C0392B, #E74C3C)" }
              }
            >
              {uploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <CloudUpload size={13} />
                  {mode === "resubmit" ? "Nộp lại" : "Nộp bài"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubmissionUploadModal;
