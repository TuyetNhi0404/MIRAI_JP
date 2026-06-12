import React from "react";
import { ArrowForward, ArrowDownward, Business, Person, School, AssignmentTurnedIn, CardMembership } from "@mui/icons-material";

const EcosystemSection: React.FC = () => {
  const steps = [
    {
      title: "1. Trung tâm",
      desc: "Xây dựng khóa học, lập lịch học và phân công giảng dạy.",
      icon: <Business className="!text-white" />,
      color: "bg-[#B90000] shadow-md shadow-red-500/10",
    },
    {
      title: "2. Giảng viên",
      desc: "Soạn giáo án số, giao bài tập và chấm điểm bài nộp học viên.",
      icon: <Person className="!text-white" />,
      color: "bg-[#1F2238] shadow-md shadow-slate-950/10",
    },
    {
      title: "3. Học viên",
      desc: "Xem bài giảng, ôn từ vựng ngữ pháp và nộp bài tập số.",
      icon: <School className="!text-white" />,
      color: "bg-[#B90000] shadow-md shadow-red-500/10",
    },
    {
      title: "4. Kiểm tra",
      desc: "Làm bài thi thử trắc nghiệm JLPT và tự luyện chuyên đề.",
      icon: <AssignmentTurnedIn className="!text-white" />,
      color: "bg-[#1F2238] shadow-md shadow-slate-950/10",
    },
    {
      title: "5. Chứng chỉ",
      desc: "Trung tâm cấp chứng chỉ số hoàn thành khóa học tương ứng.",
      icon: <CardMembership className="!text-white" />,
      color: "bg-[#B90000] shadow-md shadow-red-500/10",
    },
  ];

  return (
    <section id="ecosystem" className="py-24 px-6 md:px-20 bg-[#FAF6F0] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第三章 // 運行
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Quy trình vận hành</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif text-[#1A1A1A]">
          Hành trình kết nối đào tạo
        </h2>
        <p className="text-sm md:text-base text-[#666] max-w-xl mx-auto mb-20">
          Quy trình quản lý khép kín giúp tự động hóa khâu vận hành đào tạo và kích thích học sinh nâng cao hiệu suất học tập.
        </p>

        {/* Ecosystem Timeline / Steps Row */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-3 max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              {/* Step Card */}
              <div className="w-full lg:w-[19%] bg-white border border-[#F0E8DD] rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative hover:-translate-y-1 hover:shadow-md hover:border-red-500/10 transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${step.color} mb-5`}>
                  {step.icon}
                </div>
                <h4 className="font-bold text-xs md:text-sm font-serif text-[#1A1A1A] mb-2">{step.title}</h4>
                <p className="text-[#666] text-[11px] leading-relaxed m-0 min-h-[44px]">
                  {step.desc}
                </p>
              </div>

              {/* Connecting Arrow */}
              {idx < steps.length - 1 && (
                <div className="flex items-center justify-center text-[#B90000]/30 py-2 lg:py-0 shrink-0">
                  <div className="hidden lg:block">
                    <ArrowForward fontSize="small" />
                  </div>
                  <div className="block lg:hidden">
                    <ArrowDownward fontSize="small" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(EcosystemSection);
