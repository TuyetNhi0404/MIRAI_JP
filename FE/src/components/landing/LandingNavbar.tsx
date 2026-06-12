import React from "react";
import { Menu, X } from "lucide-react";
import GoogleLogin from "../GoogleLogin";

interface LandingNavbarProps {
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onOpenForm: (course: any) => void;
}

const LandingNavbar: React.FC<LandingNavbarProps> = ({
  isMobile,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onOpenForm,
}) => {
  const [logoSrc, setLogoSrc] = React.useState("/img/logo.jpg");
  const [showFallback, setShowFallback] = React.useState(false);

  const navLinks = [
    { name: "Giới thiệu", href: "#about" },
    { name: "Vai trò", href: "#who-uses" },
    { name: "Hệ sinh thái", href: "#ecosystem" },
    { name: "Tính năng", href: "#features" },
    { name: "Khóa học", href: "#courses" },
    { name: "Liên hệ", href: "#contact-cta" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] flex justify-between items-center japan-glass-nav px-6 md:px-16 py-3 md:py-4 transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Logo Image with Hanko Fallback */}
        {!showFallback ? (
          <img 
            src={logoSrc} 
            alt="MIRAI" 
            className="w-10 h-10 object-contain select-none" 
            onError={() => {
              if (logoSrc === "/img/logo.jpg") {
                setLogoSrc("/logo.png");
              } else {
                setShowFallback(true);
              }
            }} 
          />
        ) : (
          <div className="w-9 h-9 rounded-full border-2 border-[#B90000] bg-transparent text-[#B90000] font-serif font-black text-lg flex items-center justify-center shadow-inner select-none rotate-[-6deg]">
            未
          </div>
        )}
        <h1 className="m-0 text-lg md:text-xl font-bold text-[#1A1A1A] font-serif tracking-wider">
          MIRAI <span className="text-[#B90000]">LMS</span>
        </h1>
      </div>

      {!isMobile && (
        <div className="flex gap-8 items-center">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="!text-black !no-underline text-[12px] uppercase tracking-widest font-bold hover:!text-[#B90000] transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 md:gap-4">
        {isMobile ? (
          <>
            <button
              onClick={() => onOpenForm(null)}
              className="japan-btn-primary !px-4 !py-2 !text-xs"
            >
              Tư vấn
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-none border-none cursor-pointer text-[#1A1A1A] flex items-center justify-center p-1.5 hover:bg-slate-50 rounded-lg transition-all"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        ) : (
          <>
            <GoogleLogin />
            <button
              onClick={() => onOpenForm(null)}
              className="japan-btn-primary"
            >
              Đăng ký tư vấn
            </button>
          </>
        )}
      </div>

      {/* Mobile Drawer/Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed top-[55px] left-0 right-0 bottom-0 bg-black/40 z-[999] transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white p-5 flex flex-col gap-3.5 shadow-xl rounded-b-2xl animate-[slideDown_0.25s_ease-out_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="!text-black !no-underline text-sm font-semibold py-2 border-b border-slate-100 hover:!text-[#B90000] transition-colors"
              >
                {link.name}
              </a>
            ))}
            
            <div 
              style={{ marginTop: "10px", width: "100%", display: "flex", justifyItems: "center", justifyContent: "center" }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <GoogleLogin />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default React.memo(LandingNavbar);
