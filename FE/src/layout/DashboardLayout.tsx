import { useState, useEffect, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Spin, Layout } from "antd";
import Header from "./Header";
import Footer from "./Footer";
import type { RootState } from "../redux/store";
import StudentSidebar from "./sidebar/StudentSidebar";
import TeacherSidebar from "./sidebar/TeacherSidebar";
import AdminSidebar from "./sidebar/AdminSidebar";
import { brandColors } from "../theme/theme";

const { Content } = Layout;

interface DashboardLayoutProps {
  children?: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);

  useEffect(() => {
    if (!user && !loading) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 900;
    setSidebarOpen(isDesktop);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brandColors.bg,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

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
    <Layout style={{ minHeight: "100vh", background: brandColors.bg }}>
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div key={location.pathname}>
        {renderSidebar()}
      </div>

      <Content
        style={{
          marginTop: 64,
          padding: "20px 16px",
          transition: "all 0.3s ease",
          background: brandColors.bg,
        }}
      >
        {children || <Outlet />}
      </Content>

      <Footer />

      <style>{`
        @media (min-width: 900px) {
          .ant-layout-content {
            margin-left: ${sidebarOpen ? 248 : 16}px !important;
            padding: 24px !important;
          }
        }
        @media (max-width: 899px) {
          .ant-layout-content {
            padding: 16px !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default DashboardLayout;
