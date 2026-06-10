import React from "react";
import { ArrowForwardIos, AssessmentOutlined, DashboardOutlined, SchoolOutlined } from "@mui/icons-material";

interface HeroSectionProps {
  onOpenForm: (course: any) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onOpenForm }) => {
  return (
    <section
      id="home"
      className="seigaiha-pattern mt-[60px] md:mt-[80px] flex flex-col lg:flex-row min-h-[88vh] relative overflow-hidden items-center px-6 md:px-20 py-16 lg:py-0 gap-16"
    >
      {/* Background Japanese pattern decoration & Sakura petals */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-red-50/20 via-red-50/5 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Falling Sakura Petals */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
        <div className="sakura-petal" style={{ left: "10%", width: "12px", height: "10px", animationDuration: "14s", animationDelay: "0s" }} />
        <div className="sakura-petal" style={{ left: "25%", width: "8px", height: "7px", animationDuration: "18s", animationDelay: "2s" }} />
        <div className="sakura-petal" style={{ left: "40%", width: "15px", height: "12px", animationDuration: "16s", animationDelay: "5s" }} />
        <div className="sakura-petal" style={{ left: "65%", width: "10px", height: "9px", animationDuration: "15s", animationDelay: "1s" }} />
        <div className="sakura-petal" style={{ left: "80%", width: "13px", height: "11px", animationDuration: "20s", animationDelay: "3s" }} />
        <div className="sakura-petal" style={{ left: "90%", width: "9px", height: "8px", animationDuration: "13s", animationDelay: "6s" }} />
      </div>

      {/* Decorative vertical Japanese watermark */}
      <div 
        className="absolute right-12 top-24 text-[110px] font-serif font-black text-red-500/[0.025] select-none pointer-events-none hidden xl:block leading-none"
        style={{ writingMode: "vertical-rl" }}
      >
        日本語教育
      </div>

      {/* Left content block */}
      <div className="flex-1 flex flex-col justify-center text-[#1A1A1A] z-10 text-left">
        <div className="flex items-center gap-2 border border-[#B90000]/15 bg-red-50/80 text-[#B90000] px-4 py-1 rounded-full text-xs font-bold w-fit mb-8 shadow-sm select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] animate-pulse" />
          MIRAI Learning Management System
        </div>
        <h1 className="text-4xl md:text-[52px] leading-[1.18] mb-6 font-serif font-bold tracking-tight text-[#1A1A1A]">
          Nền tảng đào tạo <br />
          & giảng dạy <span className="text-[#B90000]">tiếng Nhật</span> toàn diện <br />
          cho các trung tâm.
        </h1>
        <p className="text-sm md:text-[15px] mb-10 leading-relaxed text-[#555] max-w-[550px]">
          Giải pháp tối ưu hóa quy trình quản lý trung tâm Nhật ngữ, hỗ trợ đắc lực cho đội ngũ giảng viên biên soạn giáo trình số hóa và giúp học viên theo đuổi lộ trình học tập cá nhân hóa chất lượng cao.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => onOpenForm(null)}
            className="japan-btn-primary"
          >
            Đăng ký tư vấn giải pháp
          </button>
          <a
            href="#courses"
            className="text-[#1A1A1A] no-underline font-bold text-xs md:text-sm flex items-center gap-2 hover:text-[#B90000] transition-colors py-3 group"
          >
            Khám phá chương trình học 
            <ArrowForwardIos className="!text-[10px] md:!text-xs mt-0.5 transform group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* Right visualization block (Premium LMS Dashboards Mockup) */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-[420px] lg:min-h-[500px] z-10 mt-8 lg:mt-0 select-none">
        {/* Core LMS Main Panel Mockup - styled with japan-card */}
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-[#F0E8DD] shadow-[0_20px_50px_rgba(31,34,56,0.03)] p-4.5 z-10 transition-all duration-500 hover:shadow-[0_25px_60px_rgba(185,0,0,0.06)] hover:border-red-500/20">
          <svg viewBox="0 0 400 300" className="w-full h-auto rounded-2xl shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Soft Washi texture style background */}
            <rect width="400" height="300" rx="16" fill="#FAF6F0" />
            
            {/* Seigaiha wave pattern at the bottom */}
            <path d="M 0,270 Q 20,250 40,270 T 80,270 T 120,270 T 160,270 T 200,270 T 240,270 T 280,270 T 320,270 T 360,270 T 400,270" stroke="#F0E8DD" strokeWidth="2" fill="none" />
            <path d="M 0,280 Q 20,260 40,280 T 80,280 T 120,280 T 160,280 T 200,280 T 240,280 T 280,280 T 320,280 T 360,280 T 400,280" stroke="#F0E8DD" strokeWidth="2" fill="none" />
            
            {/* Red Sun (Hinomaru) */}
            <circle cx="200" cy="110" r="45" fill="#B90000" opacity="0.85" />
            
            {/* Mount Fuji silhouette */}
            <path d="M 70,270 L 170,140 Q 185,120 200,120 Q 215,120 230,140 L 330,270 Z" fill="#1F2238" />
            {/* Mount Fuji Snow Cap */}
            <path d="M 170,140 Q 185,120 200,120 Q 215,120 230,140 L 253,170 Q 230,165 215,175 Q 200,160 185,175 Q 170,165 147,170 Z" fill="#FFFDF9" />
            
            {/* Minimalist Cherry Blossom branch */}
            <path d="M 330,80 Q 300,90 270,85 T 230,100" stroke="#1F2238" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 290,87 Q 280,75 270,75" stroke="#1F2238" strokeWidth="1.5" strokeLinecap="round" />
            
            {/* Cherry Blossom petals */}
            <circle cx="230" cy="100" r="4" fill="#B90000" opacity="0.9" />
            <circle cx="270" cy="85" r="4.5" fill="#B90000" opacity="0.9" />
            <circle cx="280" cy="75" r="3.5" fill="#B90000" opacity="0.8" />
            <circle cx="305" cy="88" r="4" fill="#B90000" opacity="0.9" />
            
            {/* Japanese text decoration "未来" */}
            <text x="350" y="50" fontFamily="var(--font-serif), serif" fontSize="16" fontWeight="bold" fill="#B90000" letterSpacing="0.2em">
              <tspan x="350" dy="0">未</tspan>
              <tspan x="350" dy="24">来</tspan>
            </text>
            
            {/* Subtitle "MIRAI JP" */}
            <text x="350" y="110" fontFamily="var(--font-sans), sans-serif" fontSize="8" fontWeight="bold" fill="#666" letterSpacing="0.1em" transform="rotate(90, 350, 110)">
              MIRAI JP
            </text>
          </svg>
          
          <div className="mt-4 p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#F0E8DD] text-center">
            <div className="font-serif font-bold text-xs md:text-sm text-[#1A1A1A] mb-1">Nền tảng hỗ trợ giảng dạy tiếng Nhật</div>
            <div className="text-[10px] md:text-xs text-[#666] leading-relaxed">Kết nối tài nguyên đào tạo và chuẩn hóa lộ trình giảng dạy chuyên nghiệp.</div>
          </div>
        </div>



        <div className="absolute bottom-[-15px] right-[-10px] w-[190px] bg-white rounded-2xl shadow-xl p-4 z-20 transform rotate-3 border border-[#F0E8DD] hidden md:block">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block shadow-sm shadow-emerald-400/50" />
            <span className="font-bold text-xs text-[#1A1A1A]">Đồng bộ dữ liệu</span>
          </div>
          <div className="text-[10px] text-[#666] leading-relaxed">Đồng bộ tức thời trên trình duyệt, máy tính và điện thoại.</div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(HeroSection);
