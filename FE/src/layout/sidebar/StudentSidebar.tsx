// src/layouts/StudentSidebar.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, BookOpen, ChartLine, ClipboardList, Trophy, FileQuestion, Home, PenLine, Headphones } from "lucide-react";

import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  useMediaQuery,
} from "@mui/material";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
  const isDesktop = useMediaQuery("(min-width:900px)");

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Tổng quan", icon: Home, path: "/dashboard/student" },
    { id: "quizzes", label: "Bài kiểm tra", icon: FileQuestion, path: "/dashboard/student/quizzes" },
    { id: "schedule", label: "Lịch học", icon: BookOpen, path: "/dashboard/student/schedule" },
    { id: "statistics", label: "Thống kê", icon: ChartLine, path: "/dashboard/student/statistics" },
    { id: "assignment", label: "Bài tập", icon: ClipboardList, path: "/dashboard/student/assignment" },
    { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy, path: "/dashboard/student/leaderboard" },
    { id: "Audit Practice", label: "Luyện nói với AI", icon: BarChart3, path: "/dashboard/student/audit-practice" },
    { id: "kana-practice", label: "Học bảng chữ cái", icon: PenLine, path: "/dashboard/student/kana-practice" },
    { id: "listening", label: "Luyện nghe", icon: Headphones, path: "/dashboard/student/listening" },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant={isDesktop ? "persistent" : "temporary"}
      anchor="left"
      open={isOpen}
      onClose={() => {}}
      sx={{
        "& .MuiDrawer-paper": {
          width: 200,
          top: isDesktop ? "70px" : "64px",
          bottom: isDesktop ? "60px" : 0,
          borderRight: "2px solid #B90000",
          transition: "all 0.3s ease",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 2px 8px",
        },
      }}
    >
      <Box sx={{ mt: 2 }}>
        <List>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.id}
                onClick={() => handleMenuClick(item.path)}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderLeft: isActive
                    ? "4px solid #B90000"
                    : "4px solid transparent",
                  backgroundColor: isActive ? "#FFF5E6" : "transparent",
                  "&:hover": {
                    backgroundColor: isActive ? "#FFF5E6" : "#f9f9f9",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 35,
                    color: isActive ? "#B90000" : "#666",
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        color: isActive ? "#B90000" : "#666",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "14px",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default StudentSidebar;
