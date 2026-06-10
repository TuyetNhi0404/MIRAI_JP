import React from "react";
import { AutoGraphOutlined, AssignmentTurnedInOutlined, AssessmentOutlined, BarChart } from "@mui/icons-material";

const AnalyticsSection: React.FC = () => {
  return (
    <section id="analytics" className="py-24 px-6 md:px-20 bg-[#FAF6F0] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第七章 // 分析
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Left Side: Data & Reporting Mockups */}
        <div className="flex-1 w-full order-2 lg:order-1 relative select-none">
          <div className="w-full max-w-[480px] bg-[#1F2238] text-[#FFFDF9] rounded-3xl p-4.5 shadow-2xl relative z-10 border border-[#2C2E3E]">
            <svg viewBox="0 0 400 300" className="w-full h-auto rounded-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Dark elegant Sumi Ink style background */}
              <rect width="400" height="300" rx="16" fill="#1F2238" />
              
              {/* Abstract Golden Tatami Line Grid */}
              <path d="M 0,220 L 400,220" stroke="#D4B26F" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <path d="M 0,260 L 400,260" stroke="#D4B26F" strokeWidth="1" opacity="0.15" />
              
              {/* Soft golden glowing circle representing Zen enlightenment */}
              <circle cx="200" cy="130" r="50" stroke="#D4B26F" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <circle cx="200" cy="130" r="45" fill="#D4B26F" opacity="0.08" />
              
              {/* Minimalist Japanese Torii Gate silhouette */}
              <g opacity="0.9">
                {/* Top curved beams */}
                <path d="M 130,95 Q 200,90 270,95" stroke="#B90000" strokeWidth="5" strokeLinecap="round" />
                <path d="M 140,105 L 260,105" stroke="#B90000" strokeWidth="3.5" />
                {/* Pillars */}
                <line x1="165" y1="105" x2="160" y2="220" stroke="#B90000" strokeWidth="5" strokeLinecap="round" />
                <line x1="235" y1="105" x2="240" y2="220" stroke="#B90000" strokeWidth="5" strokeLinecap="round" />
                {/* Center tie beam */}
                <line x1="160" y1="125" x2="240" y2="125" stroke="#B90000" strokeWidth="4" />
                {/* Base stones */}
                <rect x="155" y="218" width="10" height="4" rx="1" fill="#131521" />
                <rect x="235" y="218" width="10" height="4" rx="1" fill="#131521" />
              </g>
              
              {/* Sakura petals floating in the wind */}
              <path d="M 100,120 C 110,125 115,120 120,130" stroke="#B90000" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              <circle cx="120" cy="130" r="2" fill="#B90000" opacity="0.6" />
              
              <path d="M 280,160 C 290,162 295,158 300,165" stroke="#B90000" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              <circle cx="300" cy="165" r="2" fill="#B90000" opacity="0.6" />
              
              {/* Japanese text decoration "道" (Road/Path to Mastery) */}
              <text x="50" y="70" fontFamily="var(--font-serif), serif" fontSize="20" fontWeight="black" fill="#D4B26F" opacity="0.6">
                道
              </text>
              
              {/* Title text */}
              <text x="200" y="252" fontFamily="var(--font-serif), serif" fontSize="12" fontWeight="bold" fill="#FFFDF9" textAnchor="middle" letterSpacing="0.1em">
                LỘ TRÌNH CHINH PHỤC TIẾNG NHẬT
              </text>
              <text x="200" y="272" fontFamily="var(--font-sans), sans-serif" fontSize="9" fill="#94A3B8" textAnchor="middle" opacity="0.8">
                Đồng hành từng bước từ sơ cấp đến cao cấp
              </text>
            </svg>
          </div>
          
          {/* Decorative floating stamp/card */}
          <div className="absolute top-[-25px] right-[-10px] bg-white text-slate-800 rounded-2xl shadow-xl p-4.5 border border-[#F0E8DD] w-[160px] z-20 hidden md:block transform rotate-6 text-center select-none">
            <div className="w-10 h-10 rounded-full border border-[#B90000]/25 text-[#B90000] bg-[#FFF1F0] font-serif font-black text-lg flex items-center justify-center mx-auto mb-2 rotate-[-6deg]">
              極
            </div>
            <div className="font-serif font-bold text-xs text-[#1A1A1A]">Tinh hoa tiếng Nhật</div>
            <div className="text-[9px] text-[#666] mt-0.5">Học tập toàn diện</div>
          </div>
        </div>

        {/* Right Side: Editorial Explanation */}
        <div className="flex-1 text-left order-1 lg:order-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
            <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Đo lường & Phân tích</span>
          </div>
          <h2 className="text-3xl md:text-5xl text-[#1A1A1A] mb-8 font-bold font-serif leading-tight">
            Quản lý học tập & Đánh giá năng lực
          </h2>
          <p className="text-sm md:text-[15px] leading-relaxed text-[#555] mb-8">
            Hệ thống LMS của MIRAI hỗ trợ tự động ghi nhận chuyên cần, thời lượng ôn luyện và theo dõi điểm số bài kiểm tra của học sinh. Giúp giảng viên và trung tâm dễ dàng nắm bắt tiến trình học tập của từng lớp học theo thời gian thực.
          </p>

          <div className="space-y-4">
            <div className="flex gap-3.5 items-start">
              <AssessmentOutlined className="text-[#B90000] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#1A1A1A] mb-1">Theo dõi chuyên cần & Lịch trình</h4>
                <p className="text-xs text-[#666] m-0 leading-relaxed">Ghi nhận thông tin tham gia lớp học, kiểm soát giờ giảng dạy của giáo viên và tiến độ học tập của học viên.</p>
              </div>
            </div>
            <div className="flex gap-3.5 items-start">
              <AssignmentTurnedInOutlined className="text-[#B90000] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#1A1A1A] mb-1">Đánh giá kết quả & Điểm số</h4>
                <p className="text-xs text-[#666] m-0 leading-relaxed">Hệ thống ghi nhận điểm số bài luyện tập trắc nghiệm và bài tập nộp tự luận để giảng viên chấm điểm chi tiết.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(AnalyticsSection);
