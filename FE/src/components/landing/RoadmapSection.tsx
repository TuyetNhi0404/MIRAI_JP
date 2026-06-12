import React from "react";

const RoadmapSection: React.FC = () => {
  const levels = [
    {
      level: "JLPT N5",
      title: "Nhập môn & Nền tảng",
      goal: "Làm quen với bảng chữ cái Hiragana, Katakana và Kanji cơ bản.",
      outcome: "Giao tiếp cơ bản trong cuộc sống hàng ngày, tự giới thiệu bản thân.",
      milestone: "150 từ vựng · 70 Kanji · 80 mẫu ngữ pháp",
      badgeClass: "bg-[#FFF1F0] text-[#B90000] border border-[#B90000]/20",
    },
    {
      level: "JLPT N4",
      title: "Sơ cấp Nâng cao",
      goal: "Nâng cao vốn từ vựng, ngữ pháp hội thoại và kỹ năng nghe hiểu cơ bản.",
      outcome: "Đọc hiểu các đoạn văn ngắn, giao tiếp trôi chảy các chủ đề thông dụng.",
      milestone: "300 từ vựng · 120 Kanji · 100 mẫu ngữ pháp",
      badgeClass: "bg-[#FFF1F0] text-[#B90000] border border-[#B90000]/20",
    },
    {
      level: "JLPT N3",
      title: "Trung cấp Bứt phá",
      goal: "Bắt đầu làm quen với văn bản học thuật và cấu trúc câu phức tạp.",
      outcome: "Đọc hiểu báo chí cơ bản, nghe hiểu các đoạn hội thoại thường nhật.",
      milestone: "800 từ vựng · 300 Kanji · 120 mẫu ngữ pháp",
      badgeClass: "bg-[#FFF1F0] text-[#B90000] border border-[#B90000]/20",
    },
    {
      level: "JLPT N2",
      title: "Cao cấp Học thuật",
      goal: "Làm chủ từ vựng chuyên ngành, cấu trúc ngữ pháp trang trọng.",
      outcome: "Tự tin thuyết trình, làm việc trực tiếp trong doanh nghiệp Nhật Bản.",
      milestone: "1,200 từ vựng · 600 Kanji · 150 mẫu ngữ pháp",
      badgeClass: "bg-[#FFFDF9] text-[#D4B26F] border border-[#D4B26F]/20",
    },
    {
      level: "JLPT N1",
      title: "Làm chủ ngôn ngữ",
      goal: "Đọc hiểu sâu sắc các bài xã luận chuyên sâu, bài nghiên cứu học thuật.",
      outcome: "Giao tiếp như người bản xứ, dịch thuật chuyên sâu.",
      milestone: "2,000 từ vựng · 1,200 Kanji · 180 mẫu ngữ pháp",
      badgeClass: "bg-[#FFFDF9] text-[#D4B26F] border border-[#D4B26F]/20",
    },
  ];

  return (
    <section id="roadmap" className="py-24 px-6 md:px-20 bg-[#FAF6F0] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第五章 // 課程
      </div>

      {/* Background Cherry Blossom Tree Branch (From Bottom-Right/N1 to Top-Left/N5) */}
      <svg viewBox="0 0 300 1000" className="absolute right-0 bottom-0 top-0 h-full w-[380px] pointer-events-none z-0 opacity-20 hidden xl:block animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main branch trunk */}
        <path d="M 280,1000 C 270,850 180,720 200,600 C 220,480 120,350 140,220 C 160,100 80,40 50,0" stroke="#1F2238" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        
        {/* Side branches */}
        <path d="M 200,600 C 160,570 120,550 80,530" stroke="#1F2238" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        <path d="M 140,220 C 180,180 230,170 270,150" stroke="#1F2238" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        <path d="M 80,110 C 60,90 30,80 10,70" stroke="#1F2238" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        
        {/* Cherry blossom flowers (Red Urushi & Tatami Gold) */}
        {/* Top flowers (N5) */}
        <circle cx="50" cy="10" r="7" fill="#B90000" />
        <circle cx="45" cy="5" r="5" fill="#D4B26F" />
        <circle cx="55" cy="0" r="4" fill="#B90000" />
        <circle cx="40" cy="15" r="4.5" fill="#B90000" />
        
        {/* High branch flowers */}
        <circle cx="10" cy="70" r="7" fill="#B90000" />
        <circle cx="5" cy="65" r="5" fill="#D4B26F" />
        <circle cx="15" cy="75" r="4" fill="#B90000" />
        
        {/* Mid-high flowers (N3) */}
        <circle cx="270" cy="150" r="8" fill="#B90000" />
        <circle cx="262" cy="144" r="6" fill="#D4B26F" />
        <circle cx="276" cy="156" r="5" fill="#B90000" />
        <circle cx="278" cy="142" r="4.5" fill="#B90000" />
        
        {/* Mid-low flowers */}
        <circle cx="80" cy="530" r="9" fill="#B90000" />
        <circle cx="70" cy="522" r="7" fill="#D4B26F" />
        <circle cx="88" cy="538" r="6" fill="#B90000" />
        <circle cx="90" cy="520" r="5" fill="#B90000" />
        
        {/* Bottom flowers (N1) */}
        <circle cx="280" cy="900" r="10" fill="#B90000" />
        <circle cx="270" cy="890" r="8" fill="#D4B26F" />
        <circle cx="290" cy="910" r="7" fill="#B90000" />
        <circle cx="295" cy="890" r="6" fill="#B90000" />
        
        {/* Drifting petals */}
        <circle cx="120" cy="80" r="4" fill="#B90000" opacity="0.4" />
        <circle cx="220" cy="280" r="4.5" fill="#B90000" opacity="0.5" />
        <circle cx="100" cy="400" r="5" fill="#B90000" opacity="0.4" />
        <circle cx="190" cy="680" r="4" fill="#B90000" opacity="0.5" />
        <circle cx="90" cy="850" r="4.5" fill="#B90000" opacity="0.4" />
      </svg>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Khung đào tạo</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif text-[#1A1A1A]">
          Khung đào tạo chuẩn hóa
        </h2>
        <p className="text-sm md:text-base text-[#666] max-w-xl mx-auto mb-16">
          Lộ trình học tập chuẩn hóa theo năng lực tiếng Nhật JLPT, cam kết chất lượng đầu ra.
        </p>

        {/* Timeline Container */}
        <div className="relative max-w-4xl mx-auto flex flex-col gap-8">
          {levels.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10 relative text-left"
            >
              {/* Level Badge Side */}
              <div className="md:w-1/4 shrink-0 flex items-center md:justify-end">
                <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${item.badgeClass}`}>
                  {item.level}
                </span>
              </div>

              {/* Connecting Line (Desktop only) */}
              <div className="hidden md:flex flex-col items-center justify-center w-8 relative shrink-0">
                <div className="w-3.5 h-3.5 rounded-full bg-[#B90000] border-2 border-white shadow-sm z-10" />
                {idx < levels.length - 1 && (
                  <div className="absolute top-1/2 bottom-0 w-0.5 bg-red-100 translate-y-2 h-[calc(100%+32px)] z-0" />
                )}
              </div>

              {/* Details Side Card */}
              <div className="flex-1 bg-white border border-[#F0E8DD] rounded-3xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-red-500/10 transition-all duration-300">
                <h4 className="font-bold text-sm md:text-base font-serif text-[#1A1A1A] mb-3">{item.title}</h4>
                <div className="space-y-2 text-xs md:text-sm text-[#555] leading-relaxed">
                  <div>
                    <strong className="text-[#1A1A1A]">Mục tiêu:</strong> {item.goal}
                  </div>
                  <div>
                    <strong className="text-[#1A1A1A]">Kỹ năng đạt được:</strong> {item.outcome}
                  </div>
                  <div className="pt-2.5 border-t border-slate-50 flex items-center gap-1.5 text-[#B90000] font-bold text-[11px] uppercase tracking-wide">
                    <span>Chuẩn đầu ra:</span> {item.milestone}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(RoadmapSection);
