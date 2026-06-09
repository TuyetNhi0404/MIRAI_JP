import React, { useState, useRef, useEffect } from "react";
import { X, CloudUpload, Trash2, FileText, Download, Edit } from "lucide-react";
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
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
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

    if (selectedFiles.length === 0) {
      setError("Vui lòng chọn ít nhất một tệp tin");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (note.trim()) {
        formData.append("note", note.trim());
      }

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
      const errorMsg = errRes.response?.data?.message || "Có lỗi xảy ra trong quá trình nộp bài";
      setError(errorMsg);
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
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'lúc' HH:mm");
    } catch {
      return dateString;
    }
  };

  const getSubmissionBadgeColor = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "late":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "submitted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-655 border-slate-200";
    }
  };

  const getSubmissionLabel = (status: string) => {
    switch (status) {
      case "graded":
        return "Đã chấm điểm";
      case "late":
        return "Nộp muộn";
      case "submitted":
        return "Đã nộp";
      default:
        return "Chưa nộp";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scaleUp">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800 m-0">
            {mode === "view" ? "Chi tiết bài nộp" : mode === "resubmit" ? "Nộp lại bài tập" : "Nộp bài tập"}
          </h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-semibold text-red-800 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-550 hover:text-red-750 font-black">
                ✕
              </button>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-semibold text-emerald-800">
              {success}
            </div>
          )}

          {/* Details header block */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-2">
            <h4 className="text-sm font-extrabold text-slate-800 m-0">{assignment.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
              <span>Khóa học: {assignment.courseName}</span>
              <span>Hạn nộp: {formatDate(assignment.dueDate)}</span>
            </div>
            {assignment.description && (
              <p className="text-xs text-slate-550 leading-relaxed border-t border-slate-150 pt-2 mt-2 m-0 select-all">
                {assignment.description}
              </p>
            )}
          </div>

          {/* Attached Files template by Teacher */}
          {assignment.fileUrls && assignment.fileUrls.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[10px] text-red-650 font-black uppercase tracking-wider">
                Tệp đính kèm bài tập ({assignment.fileUrls.length})
              </h5>
              <div className="space-y-2">
                {assignment.fileUrls.map((fileUrl: string, idx: number) => {
                  const fileName = fileUrl.split("/").pop() || `file-${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-orange-100 bg-amber-50/20 rounded-xl text-xs font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-red-550" />
                        <span className="text-slate-700 truncate max-w-sm">{fileName}</span>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(fileUrl, fileName)}
                        className="p-1 text-red-650 hover:bg-orange-50 rounded-lg transition"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode View: Student Submitted Homework details */}
          {mode === "view" && submission && (
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bài nộp của bạn</h4>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getSubmissionBadgeColor(
                      submission.status
                    )}`}
                  >
                    {getSubmissionLabel(submission.status)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Nộp ngày {formatDate(submission.submittedAt)}
                  </span>
                </div>
              </div>

              {/* Feedback and Graded Score Alert */}
              {submission.status === "graded" && (
                <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-4 text-xs">
                  <p className="font-extrabold text-blue-700 m-0">
                    Điểm số: {submission.score} / {assignment.maxScore}
                  </p>
                  {submission.feedback && (
                    <p className="text-slate-655 m-0 mt-1.5 leading-relaxed font-semibold">
                      Nhận xét: {submission.feedback}
                    </p>
                  )}
                </div>
              )}

              {/* Submitted files list */}
              {submission.files && submission.files.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Các tệp đã nộp ({submission.files.length})
                  </h5>
                  <div className="space-y-2">
                    {submission.files.map((file: string | SubmissionFile, idx: number) => {
                      const fileUrl = typeof file === "string" ? file : file.fileUrl;
                      const fileName = typeof file === "string" ? file.split("/").pop() || "file" : file.fileName;
                      const fileSize = typeof file === "string" ? 0 : file.fileSize;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                        >
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-red-550" />
                            <div className="flex flex-col">
                              <span className="text-slate-700 truncate max-w-sm">{fileName}</span>
                              {fileSize > 0 && <span className="text-[9px] text-slate-400">{formatFileSize(fileSize)}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadFile(fileUrl, fileName)}
                            className="p-1 text-red-655 hover:bg-slate-50 rounded-lg transition"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note comment */}
              {submission.note && (
                <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-4 text-xs">
                  <span className="text-[10px] text-slate-400 font-black block uppercase mb-1">Ghi chú của bạn</span>
                  <p className="text-slate-655 m-0 leading-relaxed font-semibold">{submission.note}</p>
                </div>
              )}

              {isGraded && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs font-semibold text-slate-500">
                  Bài tập này đã chấm điểm và đóng. Bạn không thể chỉnh sửa hoặc nộp lại.
                </div>
              )}

              {!isGraded && isAssignmentClosed && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs font-semibold text-slate-500">
                  Thời hạn nộp bài đã kết thúc. Không thể nộp lại.
                </div>
              )}
            </div>
          )}

          {/* Mode Submit or Resubmit Form */}
          {(mode === "submit" || mode === "resubmit") && (
            <div className="space-y-5 border-t border-slate-100 pt-5">
              {mode === "resubmit" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs font-semibold text-blue-800">
                  Bạn đang chuẩn bị nộp lại bài tập này. Tệp tin cũ và ghi chú cũ sẽ được ghi đè hoàn toàn.
                </div>
              )}

              {/* Drag and Drop Box */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-red-400 rounded-3xl p-6 text-center bg-orange-50/10 hover:bg-orange-50/20 transition-all cursor-pointer ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
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
                <CloudUpload size={40} className="mx-auto text-red-550 mb-2" />
                <p className="text-xs font-extrabold text-slate-800 m-0">Tải tài liệu lên</p>
                <p className="text-[10px] text-slate-400 font-semibold m-0 mt-0.5">
                  Nhấp chuột để chọn tệp hoặc kéo thả file vào vùng này
                </p>
              </div>

              {/* Selected Files Preview List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 animate-scaleUp">
                  <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Các tệp đã chọn ({selectedFiles.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-red-550" />
                          <div className="flex flex-col">
                            <span className="text-slate-700 truncate max-w-sm">{file.name}</span>
                            <span className="text-[9px] text-slate-400">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          disabled={uploading}
                          className="p-1 text-red-650 hover:bg-red-50 rounded-lg transition active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note textarea input */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  Ghi chú (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Thêm ghi chú/thông điệp gửi tới giáo viên..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={uploading}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-755 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer actions */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-655 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            {mode === "view" ? "Đóng" : "Hủy"}
          </button>

          {mode === "view" && !isAssignmentClosed && !isGraded && (
            <button
              onClick={() => setMode("resubmit")}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-sm"
            >
              <Edit size={14} />
              Nộp lại bài
            </button>
          )}

          {(mode === "submit" || mode === "resubmit") && (
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang tải lên...
                </span>
              ) : mode === "resubmit" ? (
                "Nộp lại"
              ) : (
                "Nộp bài"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionUploadModal;
