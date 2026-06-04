// src/layout/sidebar/AdminSidebar.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { BookOpen, Users, Trophy, ClipboardCheck, CalendarCog, ClipboardList, FileClock, Ban, BookMarked , Headphones} from "lucide-react";
import type { LucideIcon } from "lucide-react";


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
  const isDesktop = useMediaQuery("(min-width:900px)");

  const menuItems: MenuItem[] = [
    { id: "leaderboard", label: "Leaderboard", icon: Trophy, path: "/dashboard/admin" },
    { id: "users", label: "User Management", icon: Users, path: "/dashboard/admin/users" },
    { id: "schedule-management", label: "Schedule Management", icon: CalendarCog, path: "/dashboard/admin/schedule-management" },
    { id: "attendance-management", label: "Check Attendance", icon: ClipboardCheck, path: "/dashboard/admin/attendance-management" },
    { id: "courses-manage", label: "Course Management", icon: BookOpen, path: "/dashboard/admin/courses" },
    { id: "request-management", label: "Request Schedule", icon: ClipboardList, path: "/dashboard/admin/request-management" },
    { id: "requests", label: "Enrollment Requests", icon: FileClock, path: "/dashboard/admin/requests" },
    { id: "banned-users", label: "Banned Users", icon: Ban, path: "/dashboard/admin/banned-users" },
    { id: "vocabulary", label: "Từ vựng JLPT", icon: BookMarked, path: "/dashboard/admin/vocabulary" },
    { id: "grammar-manage", label: "Ngữ pháp JLPT", icon: BookOpen, path: "/dashboard/admin/grammar" },
    { id: "listening-manage", label: "Listening Manage", icon: Headphones, path: "/dashboard/admin/listening" },
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
                  <Icon size={20} />
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

export default AdminSidebar;
