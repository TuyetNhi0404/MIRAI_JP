import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Typography } from "antd";
import {
  BookOpen,
  Users,
  Trophy,
  ClipboardCheck,
  CalendarCog,
  ClipboardList,
  BookMarked,
  Headphones,
  CalendarOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { brandColors } from "../../theme/theme";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

const AdminSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy, path: "/dashboard/admin" },
    { id: "users", label: "Quản lý người dùng", icon: Users, path: "/dashboard/admin/users" },
    { id: "schedule-management", label: "Quản lý lịch học", icon: CalendarCog, path: "/dashboard/admin/schedule-management" },
    { id: "attendance-management", label: "Điểm danh", icon: ClipboardCheck, path: "/dashboard/admin/attendance-management" },
    { id: "courses-manage", label: "Quản lý khóa học", icon: BookOpen, path: "/dashboard/admin/courses" },
    { id: "request-management", label: "Yêu cầu xin nghỉ (slot)", icon: CalendarOff, path: "/dashboard/admin/request-management" },
    { id: "requests", label: "Yêu cầu ghi danh", icon: ClipboardList, path: "/dashboard/admin/requests" },
    { id: "vocabulary", label: "Từ vựng JLPT", icon: BookMarked, path: "/dashboard/admin/vocabulary" },
    { id: "grammar-manage", label: "Ngữ pháp JLPT", icon: BookOpen, path: "/dashboard/admin/grammar" },
    { id: "listening-manage", label: "Bài nghe", icon: Headphones, path: "/dashboard/admin/listening" },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

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
          Quản trị
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
          onClick: () => handleMenuClick(item.path),
        }))}
      />
    </aside>
  );
};

export default AdminSidebar;
