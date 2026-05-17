// DashboardLayout.tsx
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Outlet } from "react-router-dom";
import { Box, CircularProgress, useMediaQuery } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import type { RootState } from "../redux/store";
import StudentSidebar from "./sidebar/StudentSidebar";
import TeacherSidebar from "./sidebar/TeacherSidebar";
import AdminSidebar from "./sidebar/AdminSidebar";

interface DashboardLayoutProps {
  children?: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const isDesktop = useMediaQuery("(min-width:900px)");

  useEffect(() => {
    if (!user && !loading) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isDesktop) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isDesktop]);

  if (loading)
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        bgcolor="#FFF8F0"
      >
        <CircularProgress sx={{ color: "#B90000" }} />
      </Box>
    );

  if (!user) return null;

  const renderSidebar = () => {
    switch (user.role) {
      case "teacher":
        return <TeacherSidebar isOpen={sidebarOpen} />;
      case "admin":
        return (
          <AdminSidebar
            isOpen={sidebarOpen}
            activeMenu={activeMenu}
            onMenuClick={setActiveMenu}
          />
        );
      default:
        return (
          <StudentSidebar
            isOpen={sidebarOpen}
            activeMenu={activeMenu}
            onMenuClick={setActiveMenu}
          />
        );
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FDF9F5" }}>
      {/* Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      
      {/* Layout chính */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          mt: { xs: "64px", sm: "70px" },
          transition: "all 0.3s ease",
        }}
      >
        {/* Sidebar - chỉ render khi mở */}
        {renderSidebar()}

        {/* Nội dung chính */}
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, sm: 4 },
            py: { xs: 2, sm: 3 },
            minHeight: "calc(100vh - 130px)",
            bgcolor: "#FFF",
            borderRadius: "16px",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.08)",
            mt: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3 },
            transition: "margin 0.3s ease",
            // Margin tự động điều chỉnh dựa vào sidebar
            ml: isDesktop 
              ? (sidebarOpen ? "216px" : "16px")  // 200px (sidebar width) + 16px (spacing)
              : "8px",
            mr: { xs: "8px", sm: "16px" },
          }}
        >
          {children || <Outlet />}
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default DashboardLayout;
