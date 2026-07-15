import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, School, CalendarClock, CircleHelp, NotebookText, FileQuestion, Headphones, BookOpen, ClipboardCheck } from "lucide-react";
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
}

const TeacherSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Tổng quan", icon: Home, path: "/dashboard/teacher" },
    { id: "schedule", label: "Lịch dạy", icon: CalendarClock, path: "/dashboard/teacher/schedule" },
    { id: "attendance", label: "Điểm danh", icon: ClipboardCheck, path: "/dashboard/teacher/attendance" },
    { id: "my-classes", label: "Lớp học của tôi", icon: School, path: "/dashboard/teacher/courses" },
    { id: "assignments", label: "Bài tập", icon: NotebookText, path: "/dashboard/teacher/assignments" },
    { id: "questions", label: "Ngân hàng câu hỏi", icon: FileQuestion, path: "/dashboard/teacher/questions" },
    { id: "quizzes", label: "Bài kiểm tra", icon: CircleHelp, path: "/dashboard/teacher/quizzes" },
    { id: "grammar-mcq", label: "Tạo Quiz Ngữ pháp", icon: FileQuestion, path: "/dashboard/teacher/grammar" },
    { id: "listening", label: "Luyện nghe", icon: Headphones, path: "/dashboard/teacher/listening" },
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
          Giáo viên
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

export default TeacherSidebar;
