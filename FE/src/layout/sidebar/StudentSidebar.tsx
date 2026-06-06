import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, ChartLine, ClipboardList, Trophy, FileQuestion, Home, PenLine, BookMarked, Headphones, Mic } from "lucide-react";
import { Menu, Typography } from "antd";
import { brandColors } from "../../theme/theme";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

const StudentSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Tổng quan", icon: Home, path: "/dashboard/student" },
    { id: "quizzes", label: "Bài kiểm tra", icon: FileQuestion, path: "/dashboard/student/quizzes" },
    { id: "schedule", label: "Lịch học", icon: BookOpen, path: "/dashboard/student/schedule" },
    { id: "statistics", label: "Thống kê", icon: ChartLine, path: "/dashboard/student/statistics" },
    { id: "assignment", label: "Bài tập", icon: ClipboardList, path: "/dashboard/student/assignment" },
    { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy, path: "/dashboard/student/leaderboard" },
    { id: "speaking-practice", label: "Luyện nói với AI", icon: Mic, path: "/dashboard/student/speaking-practice" },
    { id: "kana-practice", label: "Học bảng chữ cái", icon: PenLine, path: "/dashboard/student/kana-practice" },
    { id: "vocabulary-practice", label: "Ôn từ vựng", icon: BookMarked, path: "/dashboard/student/vocabulary-practice" },
    { id: "grammar-practice", label: "Ôn ngữ pháp", icon: BookOpen, path: "/dashboard/student/grammar-practice" },
    { id: "listening", label: "Luyện nghe", icon: Headphones, path: "/dashboard/student/listening" },
  ];

  const activePath = menuItems.find((m) => m.path === location.pathname)?.path;
  const selectedKey = activePath || location.pathname;

  return (
    <aside
      className="mira-fade-in"
      style={{
        position: "fixed",
        top: 64,
        bottom: 0,
        left: 0,
        width: 232,
        background: brandColors.paper,
        borderRight: `1px solid ${brandColors.border}`,
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 90,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ padding: "16px 12px 8px 16px" }}>
        <Typography.Text
          style={{
            color: brandColors.textTertiary,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Học viên
        </Typography.Text>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ border: "none", background: "transparent", padding: "0 8px" }}
        items={menuItems.map((item) => ({
          key: item.path,
          icon: <item.icon size={18} strokeWidth={1.8} />,
          label: item.label,
          onClick: () => navigate(item.path),
        }))}
      />
    </aside>
  );
};

export default StudentSidebar;
