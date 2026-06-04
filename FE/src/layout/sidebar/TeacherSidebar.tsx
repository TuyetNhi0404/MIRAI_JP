// src/layouts/TeacherSidebar.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {Home, School, CalendarClock, CircleHelp, NotebookText, FileQuestion, Headphones, BookOpen} from "lucide-react";
import { Drawer, List, ListItemButton, ListItemIcon,ListItemText, Typography, Box, useMediaQuery,} from "@mui/material";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
}

const TeacherSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width:900px)");

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Home, path: "/dashboard/teacher" },
    { id: "schedule", label: "Schedule", icon: CalendarClock, path: "/dashboard/teacher/schedule" },
    { id: "my-classes", label: "My Classes", icon: School, path: "/dashboard/teacher/courses" },
    { id: "assignments", label: "Assignments", icon: NotebookText, path: "/dashboard/teacher/assignments" },
    { id: "questions", label: "Questions", icon: FileQuestion, path: "/dashboard/teacher/questions" },
    { id: "quizzes", label: "Quizzes", icon: CircleHelp, path: "/dashboard/teacher/quizzes" },
    { id: "grammar-mcq", label: "Tạo Quiz Ngữ pháp", icon: FileQuestion, path: "/dashboard/teacher/grammar" },
    { id: "grammar-materials", label: "Tài liệu Ngữ pháp", icon: BookOpen, path: "/dashboard/teacher/grammar-materials" },
    { id: "listening", label: "Listening", icon: Headphones, path: "/dashboard/teacher/listening" },
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

export default TeacherSidebar;
