import React from "react";
import {
  FolderOutlined,
  BookOutlined,
  QuizOutlined,
  AssignmentOutlined,
  BarChartOutlined,
  BadgeOutlined,
  NotificationsOutlined,
  InsightsOutlined
} from "@mui/icons-material";

const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: "Quản lý khóa học (Course)",
      desc: "Xây dựng khung đào tạo, danh mục chương trình học từ sơ cấp đến cao cấp đồng bộ.",
      icon: <FolderOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100"
    },
    {
      title: "Quản lý bài giảng (Lesson)",
      desc: "Lưu trữ tài liệu đa phương tiện, bài đọc và video hướng dẫn chi tiết theo từng chủ đề.",
      icon: <BookOutlined fontSize="small" />,
      color: "text-[#1F2238] bg-stone-100 border border-stone-200"
    },
    {
      title: "Hệ thống trắc nghiệm (Quiz)",
      desc: "Tạo bài thi thử JLPT, kiểm tra từ vựng, ngữ pháp ngẫu nhiên bằng ngân hàng câu hỏi.",
      icon: <QuizOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100"
    },
    {
      title: "Giao bài tập (Assignment)",
      desc: "Tính năng tự động giao bài và theo dõi nộp bài, chấm điểm trực tiếp từ giảng viên.",
      icon: <AssignmentOutlined fontSize="small" />,
      color: "text-[#1F2238] bg-stone-100 border border-stone-200"
    },
    {
      title: "Theo dõi tiến trình",
      desc: "Hệ thống ghi nhận thời gian học, bài làm giúp học viên biết chính xác mức độ chuyên cần.",
      icon: <BarChartOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100"
    },
    {
      title: "Phân tích học lực",
      desc: "Báo cáo phân tích tự động điểm mạnh/yếu của học viên trong từng kỹ năng nghe, đọc.",
      icon: <InsightsOutlined fontSize="small" />,
      color: "text-[#1F2238] bg-stone-100 border border-stone-200"
    },
    {
      title: "Hệ thống chứng chỉ",
      desc: "Cấp chứng nhận số hoàn thành khóa học tương ứng dựa trên kết quả thi cử thực tế.",
      icon: <BadgeOutlined fontSize="small" />,
      color: "text-[#B90000] bg-[#FFF1F0] border border-red-100"
    },
    {
      title: "Thông báo tự động",
      desc: "Nhắc lịch học, lịch kiểm tra, hạn chót nộp bài tập qua email và bảng tin thông báo.",
      icon: <NotificationsOutlined fontSize="small" />,
      color: "text-[#1F2238] bg-stone-100 border border-stone-200"
    }
  ];

  return (
    <section id="features" className="py-24 px-6 md:px-20 bg-[#FFFDF9] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第四章 // 機能
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Tính năng cốt lõi</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif text-[#1A1A1A]">
          Tính năng LMS vượt trội
        </h2>
        <p className="text-sm md:text-base text-[#666] max-w-xl mx-auto mb-16">
          Sở hữu hệ thống chức năng hoàn thiện và tối ưu nhất dành riêng cho đào tạo Nhật ngữ hiện nay.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-5 bg-white rounded-2xl border border-[#F0E8DD] shadow-[0_4px_20px_rgba(31,34,56,0.01)] hover:-translate-y-1 hover:shadow-md hover:border-red-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${feat.color} shadow-sm`}>
                  {feat.icon}
                </div>
                <div className="text-xs md:text-sm leading-relaxed text-[#555]">
                  <strong className="font-bold text-[#1A1A1A] font-serif mr-1.5">{feat.title}:</strong>
                  <span>{feat.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(FeaturesSection);
