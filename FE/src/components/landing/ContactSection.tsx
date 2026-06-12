import React from "react";
import { Mail, Phone } from "lucide-react";

interface ContactSectionProps {
  onOpenForm: (course: any) => void;
}

const ContactSection: React.FC<ContactSectionProps> = ({ onOpenForm }) => {
  return (
    <section id="contact-cta" className="py-24 px-6 md:px-20 bg-[#FAF6F0] border-t border-[#F0E8DD] relative overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第九章 // 連絡
      </div>

      <div className="max-w-5xl mx-auto bg-[#1F2238] text-[#FFFDF9] rounded-3xl p-8 md:p-16 text-center relative z-10 shadow-2xl flex flex-col items-center border border-[#2C2E3E]">
        <div className="border border-[#2C2E3E] text-slate-400 px-4 py-1 rounded-full text-[10px] md:text-[11px] font-bold w-fit mb-6 uppercase tracking-widest bg-slate-900/30">
          Tư vấn giải pháp & Hợp tác đối tác
        </div>
        <h2 className="text-2xl md:text-4xl font-bold mb-6 font-serif max-w-2xl leading-tight text-white">
          Triển khai hệ thống quản lý học tập MIRAI LMS cho trung tâm Nhật ngữ của bạn
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-xl mb-10 leading-relaxed font-medium">
          Hỗ trợ thiết lập toàn diện, tùy chỉnh thương hiệu riêng, cấu trúc giáo trình và tích hợp cơ sở dữ liệu học sinh hiện có của bạn một cách nhanh chóng.
        </p>

        <div className="flex flex-wrap gap-4 justify-center items-center">
          <button
            onClick={() => onOpenForm(null)}
            className="japan-btn-primary"
          >
            Đăng ký tư vấn miễn phí
          </button>
          
          <a
            href="mailto:support@mirai.edu.vn"
            className="flex items-center gap-2 bg-slate-900 text-white border border-[#2C2E3E] px-6 py-4 rounded-xl text-xs md:text-sm font-bold cursor-pointer hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 no-underline transition-all duration-200"
          >
            <Mail size={16} className="text-[#B90000]" />
            <span>Liên hệ qua Email</span>
          </a>
        </div>

        <div className="mt-12 flex flex-wrap gap-6 justify-center text-[10px] md:text-xs text-slate-400 border-t border-[#2C2E3E]/60 pt-8 w-full font-medium">
          <div className="flex items-center gap-1.5">
            <Phone size={14} className="text-[#B90000]" />
            <span>Hotline hỗ trợ kỹ thuật: 024 7300 1866</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail size={14} className="text-[#B90000]" />
            <span>Email hỗ trợ: support@mirai.edu.vn</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ContactSection);
