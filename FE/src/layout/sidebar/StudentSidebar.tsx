import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  ChartLine,
  ClipboardList,
  Trophy,
  FileQuestion,
  Home,
  PenLine,
  BookMarked,
  Headphones,
  Mic,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

const StudentSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sections: MenuSection[] = [
    {
      title: "Trung tâm học tập",
      items: [
        { id: "dashboard", label: "Tổng quan", icon: Home, path: "/dashboard/student" },
        { id: "schedule", label: "Lịch học", icon: BookOpen, path: "/dashboard/student/schedule" },
        { id: "statistics", label: "Thống kê", icon: ChartLine, path: "/dashboard/student/statistics" },
      ],
    },
    {
      title: "Luyện tập & Kỹ năng",
      items: [
        { id: "speaking-practice", label: "Luyện nói với AI", icon: Mic, path: "/dashboard/student/speaking-practice" },
        { id: "kana-practice", label: "Học bảng chữ cái", icon: PenLine, path: "/dashboard/student/kana-practice" },
        { id: "vocabulary-practice", label: "Ôn từ vựng", icon: BookMarked, path: "/dashboard/student/vocabulary-practice" },
        { id: "grammar-practice", label: "Ôn ngữ pháp", icon: BookOpen, path: "/dashboard/student/grammar-practice" },
        { id: "listening", label: "Luyện nghe", icon: Headphones, path: "/dashboard/student/listening" },
      ],
    },
    {
      title: "Kiểm tra & Thành tích",
      items: [
        { id: "quizzes", label: "Bài kiểm tra", icon: FileQuestion, path: "/dashboard/student/quizzes" },
        { id: "assignment", label: "Bài tập", icon: ClipboardList, path: "/dashboard/student/assignment" },
        { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy, path: "/dashboard/student/leaderboard" },
      ],
    },
  ];

  // Helper to determine if menu item matches path
  const isSelected = (itemPath: string) => {
    if (itemPath === "/dashboard/student") {
      return location.pathname === "/dashboard/student";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 w-[232px] bg-white border-r border-[#E2E8F0] overflow-y-auto overflow-x-hidden z-[90] transition-transform duration-250 ease-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="flex flex-col gap-6 py-6 px-3">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            {/* Section Header */}
            <div className="px-3">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#94A3B8]">
                {section.title}
              </span>
            </div>

            {/* Section items */}
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isSelected(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 h-[38px] px-3.5 py-2 rounded-xl text-sm transition-all duration-150 w-full text-left font-medium group ${
                      active
                        ? "bg-[#EFF6FF] text-[#2563EB] font-bold"
                        : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <item.icon
                      size={18}
                      className={`transition-colors ${
                        active ? "text-[#2563EB]" : "text-[#64748B] group-hover:text-[#0F172A]"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default StudentSidebar;
