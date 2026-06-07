import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Dropdown, Layout, Space } from "antd";
import {
  MenuOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Menu as MenuIcon } from "lucide-react";
import { logoutUser } from "../redux/slices/authSlice";
import type { AppDispatch } from "../redux/store";
import { ProfileModal } from "../components/profile/ProfileModal";
import { useAppSelector } from "../hooks/hooks";
import NotificationDropdown from "../components/notification/NotificationDropdown";
import { brandColors } from "../theme/theme";

const { Header: AntHeader } = Layout;

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [openProfile, setOpenProfile] = useState(false);

  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.profile.profile);
  const user = profile || authUser;
  const userName = user?.name || "Người dùng";
  const avatarUrl =
    user?.avatar && user.avatar.startsWith("http") ? user.avatar : undefined;

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/", { replace: true });
  };

  const userMenuItems = [
    {
      key: "profile",
      label: (
        <Space>
          <UserOutlined />
          <span>Hồ sơ</span>
        </Space>
      ),
      onClick: () => {
        setTimeout(() => setOpenProfile(true), 150);
      },
    },
    { type: "divider" as const },
    {
      key: "logout",
      label: (
        <Space style={{ color: brandColors.error }}>
          <LogoutOutlined />
          <span>Đăng xuất</span>
        </Space>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: brandColors.paper,
        borderBottom: `1px solid ${brandColors.border}`,
        padding: "0 20px",
        height: 64,
        lineHeight: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
      }}
    >
      <Space size={14} align="center">
        <Button
          type="text"
          shape="circle"
          icon={sidebarOpen ? <MenuIcon size={20} /> : <MenuOutlined />}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{ color: brandColors.textPrimary }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ color: brandColors.red }}>MIRAI</span>
          <span style={{ color: brandColors.textPrimary }}>JAPANESE</span>
          <span
            style={{
              color: brandColors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              marginLeft: 2,
            }}
          >
            LMS
          </span>
        </div>
      </Space>

      <Space size={6} align="center">
        <NotificationDropdown />
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px 4px 4px",
              borderRadius: 999,
              cursor: "pointer",
              transition: "background 200ms ease",
            }}
            className="mira-button-hover"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = brandColors.bg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Avatar
              size={36}
              src={avatarUrl}
              style={{
                background: brandColors.red,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {!avatarUrl && userName.charAt(0).toUpperCase()}
            </Avatar>
            <span
              className="mira-user-name"
              style={{
                color: brandColors.textPrimary,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {userName}
            </span>
            <DownOutlined style={{ fontSize: 10, color: brandColors.textTertiary }} />
          </div>
        </Dropdown>
        <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
      </Space>

      <style>{`
        @media (max-width: 640px) {
          .mira-user-name { display: none; }
        }
      `}</style>
    </AntHeader>
  );
};

export default Header;
