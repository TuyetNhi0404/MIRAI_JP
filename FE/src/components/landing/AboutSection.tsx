import React from "react";
import { FolderCopyOutlined, AutoGraphOutlined, AssignmentTurnedInOutlined, BadgeOutlined, SettingsOutlined } from "@mui/icons-material";

const AboutSection: React.FC = () => {
  const ecosystemPillars = [
    {
      title: "Quản lý khóa học & lớp học",
      desc: "Xây dựng khung giáo trình số hóa, phân bổ lớp học, sắp xếp thời khóa biểu giảng dạy thông minh và khoa học.",
      icon: <FolderCopyOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100",
    },
    {
      title: "Theo dõi & báo cáo tiến trình",
      desc: "Giám sát chi tiết thời lượng học tập, tỉ lệ hoàn thành bài tập của từng học sinh qua biểu đồ phân tích.",
      icon: <AutoGraphOutlined fontSize="small" />,
      color: "text-[#1F2238] bg-stone-100/80 border border-stone-200",
    },
    {
      title: "Hệ thống kiểm tra & chấm bài",
      desc: "Tổ chức làm bài thi thử JLPT, kiểm tra định kỳ với ngân hàng câu hỏi đa dạng và chấm điểm trực tuyến.",
      icon: <AssignmentTurnedInOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100",
    },
    {
      title: "Đánh giá & cấp chứng chỉ",
      desc: "Đo lường kết quả chuyên cần, điểm thi và cấp chứng nhận số hoàn thành khóa học từ trung tâm Nhật ngữ.",
      icon: <BadgeOutlined fontSize="small" />,
      color: "text-[#D4B26F] bg-amber-50/50 border border-amber-100",
    },
  ];

  return (
    <section id="about" className="py-24 px-6 md:px-20 bg-[#FAF6F0] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第一章 // 概要
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Left Side: Editorial Introduction */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
            <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Hệ sinh thái đồng nhất</span>
          </div>
          <h2 className="text-3xl md:text-5xl text-[#1A1A1A] mb-8 font-bold font-serif leading-tight">
            Một hệ sinh thái học tập <br />& quản lý khép kín
          </h2>
          <p className="text-sm md:text-[15px] leading-relaxed text-[#555] mb-10 max-w-lg">
            MIRAI LMS tối ưu hóa toàn bộ các điểm chạm vận hành đào tạo. Không còn những phần mềm riêng lẻ, chúng tôi đồng bộ hóa từ khâu quản lý điều hành trung tâm, không gian số hóa của giảng viên đến cổng tự luyện bài tập của học viên.
          </p>

          <div className="p-6 bg-white border border-[#F0E8DD] rounded-2xl shadow-sm flex gap-4 items-start max-w-lg transition-all hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-md">
              <SettingsOutlined />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-1">Kiến trúc thương hiệu riêng</h4>
              <p className="text-xs text-[#666] leading-relaxed m-0">
                Cho phép trung tâm tùy chỉnh logo, tên miền riêng và tích hợp mượt mà vào chương trình dạy offline sẵn có.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Infographic pillar grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ecosystemPillars.map((pillar, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-3xl border border-[#F0E8DD] shadow-[0_10px_30px_rgba(31,34,56,0.015)] hover:-translate-y-1 hover:shadow-md hover:border-red-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl ${pillar.color} flex items-center justify-center mb-6 shadow-sm`}>
                  {pillar.icon}
                </div>
                <h3 className="font-bold text-sm md:text-base text-[#1A1A1A] mb-3">{pillar.title}</h3>
                <p className="text-[#666] leading-relaxed text-xs m-0">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(AboutSection);
