import React from "react";
import { Facebook, Instagram, Mail, Phone, MapPin, Globe } from "lucide-react";

interface LandingFooterProps {
  isMobile: boolean;
}

const LandingFooter: React.FC<LandingFooterProps> = () => {
  const [logoSrc, setLogoSrc] = React.useState("/img/logo.jpg");
  const [showFallback, setShowFallback] = React.useState(false);

  return (
    <footer id="contact" className="bg-[#131521] text-[#FFFDF9] py-16 px-6 md:px-20 text-[13px] border-t border-[#1F2238]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 max-w-7xl mx-auto mb-16">
        {/* Logo & Description */}
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            {/* Logo Image with Hanko Fallback */}
            {!showFallback ? (
              <img 
                src={logoSrc} 
                alt="MIRAI" 
                className="w-10 h-10 object-contain select-none bg-white rounded-full p-0.5" 
                onError={() => {
                  if (logoSrc === "/img/logo.jpg") {
                    setLogoSrc("/logo.png");
                  } else {
                    setShowFallback(true);
                  }
                }} 
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-[#B90000] flex items-center justify-center text-[#B90000] font-serif font-bold text-sm bg-white rotate-[-6deg]">
                未
              </div>
            )}
            <h2 className="text-white font-bold font-serif text-lg tracking-wider m-0">
              MIRAI <span className="text-[#B90000]">LMS</span>
            </h2>
          </div>
          <p className="text-[#888] leading-relaxed mb-6 font-medium">
            Giải pháp số hóa toàn diện quy trình đào tạo, giảng dạy và học tập Tiếng Nhật chuyên nghiệp cho các tổ chức giáo dục.
          </p>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=61560247499806" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#B90000] transition-colors">
              <Facebook size={18} />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61560247499806" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#B90000] transition-colors">
              <Instagram size={18} />
            </a>
            <a href="mailto:support@mirai.edu.vn" className="text-slate-400 hover:text-[#B90000] transition-colors">
              <Mail size={18} />
            </a>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-bold mb-5 text-xs text-white border-b border-[#1F2238] pb-2 uppercase tracking-widest font-serif">
            Thông tin liên hệ
          </h4>
          <ul className="list-none p-0 text-[#888] space-y-3 font-medium">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="text-[#B90000] shrink-0 mt-0.5" />
              <span className="leading-relaxed">Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="text-[#B90000] shrink-0" />
              <span>024 7300 1866</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Globe size={16} className="text-[#B90000] shrink-0" />
              <span>lms.mirai.edu.vn</span>
            </li>
          </ul>
        </div>

        {/* LMS Modules */}
        <div>
          <h4 className="font-bold mb-5 text-xs text-white border-b border-[#1F2238] pb-2 uppercase tracking-widest font-serif">
            Phân hệ LMS
          </h4>
          <ul className="list-none p-0 text-[#888] space-y-3 font-medium">
            <li>Quản lý Đào tạo (Centers)</li>
            <li>Không gian Giảng dạy (Teachers)</li>
            <li>Cổng thông tin Học viên (Students)</li>
            <li>Hệ thống Kiểm tra & Chứng chỉ</li>
          </ul>
        </div>

        {/* Newsletter / Policies */}
        <div>
          <h4 className="font-bold mb-5 text-xs text-white border-b border-[#1F2238] pb-2 uppercase tracking-widest font-serif">
            Bản tin giải pháp
          </h4>
          <p className="text-[#888] mb-4 font-medium">
            Nhận cập nhật về các tính năng LMS mới nhất.
          </p>
          <div className="relative w-full">
            <input
              type="email"
              placeholder="Email của bạn"
              className="w-full px-4 py-2.5 bg-slate-900 border border-[#1F2238] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#B90000] text-xs font-medium"
            />
            <button className="absolute right-1.5 top-1.5 bg-[#B90000] text-white border-none py-1.5 px-3 rounded-lg cursor-pointer hover:bg-[#900000] transition-colors text-xs font-bold">
              →
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[#1F2238] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 max-w-7xl mx-auto font-medium">
        <div>&copy; {new Date().getFullYear()} MIRAI LMS. Nền tảng quản lý Nhật ngữ toàn diện.</div>
        <div className="flex gap-6">
          <a href="#" className="hover:!underline !text-slate-500 !no-underline hover:!text-[#B90000] transition-colors">Điều khoản dịch vụ</a>
          <a href="#" className="hover:!underline !text-slate-500 !no-underline hover:!text-[#B90000] transition-colors">Chính sách bảo mật</a>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(LandingFooter);
