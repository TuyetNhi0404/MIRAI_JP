import React from "react";
import { CheckCircle2 } from "lucide-react";

const WhoUsesSection: React.FC = () => {
  const roles = [
    {
      title: "Dành cho Trung tâm",
      subtitle: "Phân hệ Quản trị & Vận hành",
      bgClass: "bg-white text-slate-800 border-[#F0E8DD] hover:border-[#B90000]/30",
      accentBorder: "border-t-[4px] border-t-[#B90000]",
      benefits: [
        "Quản lý và cập nhật danh mục khóa học chuẩn.",
        "Thiết lập lớp học, phân lịch dạy và xếp phòng học.",
        "Quản lý thông tin hồ sơ và doanh thu học viên.",
        "Báo cáo tiến trình học tập lớp học thời gian thực."
      ],
      badge: "LMS Admin",
      badgeClass: "bg-[#FFF1F0] text-[#B90000] border border-[#B90000]/20"
    },
    {
      title: "Dành cho Giảng viên",
      subtitle: "Không gian Giảng dạy Số",
      bgClass: "bg-[#1F2238] text-[#FFFDF9] border-[#2C2E3E] hover:border-red-500/20",
      accentBorder: "border-t-[4px] border-t-red-600",
      benefits: [
        "Soạn giáo trình số hóa và kho đề kiểm tra tự động.",
        "Giao bài tập về nhà theo sát nội dung từng buổi học.",
        "Hỗ trợ chấm điểm nhanh kèm nhận xét chi tiết.",
        "Theo dõi chuyên cần và biểu đồ năng lực của lớp."
      ],
      badge: "Teacher Portal",
      badgeClass: "bg-red-500/10 text-red-300 border border-red-500/20"
    },
    {
      title: "Dành cho Học viên",
      subtitle: "Cổng thông tin & Học tập",
      bgClass: "bg-white text-slate-800 border-[#F0E8DD] hover:border-[#D4B26F]/30",
      accentBorder: "border-t-[4px] border-t-[#D4B26F]",
      benefits: [
        "Học bài giảng lý thuyết, học bảng chữ cái & từ vựng.",
        "Thi thử đánh giá năng lực JLPT định kỳ tự động.",
        "Nộp bài tập về nhà trực tiếp và nhận điểm số.",
        "Theo dõi tiến độ học tập và nhận chứng chỉ số."
      ],
      badge: "Student Hub",
      badgeClass: "bg-amber-50 text-[#D4B26F] border border-[#D4B26F]/20"
    }
  ];

  return (
    <section id="who-uses" className="py-24 px-6 md:px-20 bg-[#FFFDF9] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第二章 // 役割
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Phân quyền thông minh</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif text-[#1A1A1A]">
          Đáp ứng nhu cầu mọi vai trò
        </h2>
        <p className="text-sm md:text-base text-[#666] max-w-xl mx-auto mb-16">
          Một hệ thống hợp nhất giúp kết nối toàn diện hoạt động của Ban quản trị, Giảng viên và Học viên trên cùng một hạ tầng dữ liệu.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {roles.map((role, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-3xl shadow-[0_10px_30px_rgba(31,34,56,0.01)] border flex flex-col justify-between hover:shadow-md transition-all duration-300 ${role.bgClass} ${role.accentBorder}`}
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${role.badgeClass}`}>
                    {role.badge}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-1">{role.title}</h3>
                <div className="text-xs mb-8 opacity-75 font-semibold">{role.subtitle}</div>
                
                <ul className="list-none p-0 space-y-4">
                  {role.benefits.map((benefit, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <CheckCircle2 size={15} className="text-[#B90000] shrink-0 mt-0.5" />
                      <span className="text-xs md:text-sm leading-relaxed opacity-90">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(WhoUsesSection);
