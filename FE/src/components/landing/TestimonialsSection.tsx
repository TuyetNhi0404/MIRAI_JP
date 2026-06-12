import React from "react";

const TestimonialsSection: React.FC = () => {
  const commitments = [
    {
      kanji: "質",
      title: "Học liệu chuẩn hóa & Số hóa",
      desc: "Hệ thống giáo trình, bài tập và đề thi thử JLPT từ N5 đến N1 được số hóa đồng bộ. Hỗ trợ giảng viên biên soạn tài liệu tương tác giúp học viên tiếp thu kiến thức tốt hơn.",
      color: "border-[#B90000]/25 text-[#B90000] bg-[#FFF1F0]",
    },
    {
      kanji: "信",
      title: "Vận hành thực tế & Minh bạch",
      desc: "Cung cấp các công cụ quản lý thiết thực cho trung tâm: từ điểm danh chuyên cần trực tuyến, quản lý lịch giảng dạy của giáo viên đến theo dõi điểm số bài kiểm tra của học sinh.",
      color: "border-[#1F2238]/25 text-[#1F2238] bg-stone-100",
    },
    {
      kanji: "安",
      title: "Hạ tầng bảo mật & Tiện ích",
      desc: "Toàn bộ thông tin học viên, kết quả học tập và tài liệu đào tạo nội bộ được bảo mật an toàn trên nền tảng Cloud. Giao diện trực quan, tải nhanh và tối ưu hóa cho thiết bị di động.",
      color: "border-[#D4B26F]/25 text-[#D4B26F] bg-amber-50/50",
    },
  ];

  return (
    <section id="testimonials" className="py-24 px-6 md:px-20 bg-[#FFFDF9] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第八章 // 価値
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Cam kết chất lượng</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif text-[#1A1A1A]">
          Giá trị cốt lõi & Cam kết dịch vụ
        </h2>
        <p className="text-sm md:text-base text-[#666] max-w-xl mx-auto mb-16">
          MIRAI LMS đồng hành cùng sự phát triển bền vững của các trung tâm Nhật ngữ và thế hệ học viên tương lai.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {commitments.map((item, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden p-8 bg-white border border-[#F0E8DD] rounded-3xl shadow-[0_10px_30px_rgba(31,34,56,0.015)] flex flex-col justify-between hover:-translate-y-2.5 hover:shadow-xl hover:border-red-500/20 transition-all duration-500"
            >
              {/* Interactive Left accent line on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#B90000] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Stamp circular Hanko icon - rotates and scales on group hover */}
                  <div className={`w-12 h-12 rounded-full border-2 font-serif font-black text-xl flex items-center justify-center shadow-inner select-none rotate-[-6deg] group-hover:rotate-[15deg] group-hover:scale-110 transition-all duration-500 mb-5 ${item.color}`}>
                    {item.kanji}
                  </div>
                  <h4 className="font-bold text-sm md:text-base lg:text-[17px] text-[#1A1A1A] m-0 mb-3 tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-[#555] leading-relaxed text-xs md:text-sm m-0">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(TestimonialsSection);
