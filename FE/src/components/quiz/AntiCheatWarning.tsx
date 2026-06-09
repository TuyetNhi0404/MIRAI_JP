import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, Eye } from "lucide-react";

interface AntiCheatWarningProps {
  open: boolean;
  violationType: string;
  violationCount: number;
  maxViolations: number;
  onContinue: () => void;
  isAutoSubmit?: boolean;
}

const AntiCheatWarning: React.FC<AntiCheatWarningProps> = ({
  open,
  violationType,
  violationCount,
  maxViolations,
  onContinue,
  isAutoSubmit = false,
}) => {
  const [countdown, setCountdown] = useState(5);
  const remainingViolations = maxViolations - violationCount;
  const isNearLimit = remainingViolations <= 2;
  const isCritical = remainingViolations <= 1;

  useEffect(() => {
    if (open && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (open && countdown === 0) {
      onContinue();
    }
  }, [open, countdown, onContinue]);

  useEffect(() => {
    if (open) {
      setCountdown(5);
    }
  }, [open]);

  if (!open) return null;

  const getMessage = () => {
    const messages: Record<string, string> = {
      tab_switch: "🚨 Bạn đã chuyển sang tab khác",
      window_blur: "🚨 Cửa sổ làm bài mất tập trung (blur)",
      copy: "🚫 Hành vi sao chép văn bản bị cấm",
      paste: "🚫 Hành vi dán nội dung bị cấm",
      right_click: "🚫 Menu chuột phải đã bị vô hiệu hóa",
      fullscreen_exit: "🚨 Bạn đã thoát khỏi chế độ toàn màn hình",
      devtools_open: "⚠️ Phát hiện mở công cụ phát triển (DevTools)",
    };
    return messages[violationType] || "⚠️ Phát hiện hoạt động bất thường";
  };

  const getWarningLevel = () => {
    if (isCritical) {
      return {
        color: "text-red-700",
        border: "border-red-500",
        bg: "bg-red-50/95",
        btn: "bg-red-650 hover:bg-red-700",
        label: "CỰC KỲ NGUY HIỂM",
      };
    }
    if (isNearLimit) {
      return {
        color: "text-amber-700",
        border: "border-amber-500",
        bg: "bg-amber-50/95",
        btn: "bg-amber-600 hover:bg-amber-700",
        label: "CẢNH BÁO",
      };
    }
    return {
      color: "text-blue-700",
      border: "border-blue-500",
      bg: "bg-blue-50/95",
      btn: "bg-blue-600 hover:bg-blue-700",
      label: "CHÚ Ý",
    };
  };

  const warning = getWarningLevel();

  if (isAutoSubmit) {
    return (
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-red-50 border-4 border-red-600 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-bounce-short">
          <div className="bg-red-600 text-white text-center py-4 px-6 flex items-center justify-center gap-2">
            <ShieldAlert size={26} />
            <h2 className="text-base font-black uppercase tracking-wider m-0">Bài thi bị khóa</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-white border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold m-0">Vượt quá số lần vi phạm</h3>
                <p className="text-xs m-0 leading-relaxed">
                  Bạn đã vi phạm quy chế thi quá số lần cho phép ({maxViolations} lần). Bài làm của bạn sẽ được tự động nộp ngay lập tức.
                </p>
              </div>
            </div>

            <div className="text-center py-2">
              <p className="text-xs text-slate-500 font-semibold m-0">
                Tự động nộp bài sau: <strong className="text-red-600 text-sm font-black">{countdown} giây</strong>
              </p>
            </div>

            {/* Progress countdown */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-white border-2 ${warning.border} rounded-3xl max-w-md w-full shadow-2xl overflow-hidden`}>
        {/* Title */}
        <div className={`px-6 py-4 flex items-center justify-between text-white ${warning.btn}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={22} />
            <span className="text-sm font-extrabold m-0">Phát hiện hoạt động nghi vấn</span>
          </div>
          <span className="bg-white/20 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
            {warning.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className={`p-4 rounded-2xl border flex gap-3 ${warning.bg} ${warning.color}`}>
            <Eye size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black m-0 uppercase tracking-wide">Mọi hoạt động đều được giám sát</h4>
              <p className="text-xs m-0 leading-relaxed font-semibold">{getMessage()}</p>
            </div>
          </div>

          {/* Violation Counts block */}
          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Số lần vi phạm</span>
              <span className={`text-2xl font-black ${warning.color}`}>
                {violationCount} <span className="text-xs text-slate-400 font-bold">/ {maxViolations}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Còn lại</span>
              <span className={`text-2xl font-black ${isCritical ? "text-red-600" : "text-emerald-600"}`}>
                {remainingViolations}
              </span>
            </div>
          </div>

          {/* Progress bar threshold */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Ngưỡng giới hạn</span>
              <span>{Math.round((violationCount / maxViolations) * 100)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCritical ? "bg-red-600" : isNearLimit ? "bg-amber-500" : "bg-blue-600"
                }`}
                style={{ width: `${(violationCount / maxViolations) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Bottom Alerts */}
          {isCritical && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-bold leading-relaxed">
              ⚠️ CẢNH BÁO CUỐI CÙNG! Thêm 1 lần chuyển màn hình hoặc vi phạm nữa, bài thi sẽ được nộp ngay lập tức.
            </div>
          )}

          {isNearLimit && !isCritical && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-bold leading-relaxed">
              Bạn đang tiến gần đến giới hạn vi phạm. Hãy tập trung làm bài thi mà không chuyển đổi tab hoặc ứng dụng.
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-medium italic text-center m-0">
            Giáo viên của bạn sẽ nhận được báo cáo chi tiết khi nộp bài.
          </p>

          <p className="text-[9px] text-slate-400 font-medium text-center m-0">
            Thông báo này tự đóng sau {countdown} giây
          </p>
        </div>

        {/* Footer Action */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onContinue}
            className={`w-full py-3 text-white text-xs font-black rounded-xl active:scale-95 transition shadow-sm ${
              isCritical ? "bg-red-600 hover:bg-red-700" : isNearLimit ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Tôi đã hiểu, tiếp tục làm bài
          </button>
        </div>
      </div>
    </div>
  );
};

export default AntiCheatWarning;
