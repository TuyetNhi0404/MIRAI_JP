// Header.tsx
import { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Paper,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  MoreVert,
  KeyboardArrowDown,
  Person,
  Logout,
} from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../redux/slices/authSlice";
import type { AppDispatch } from "../redux/store";
import { ProfileModal } from "../components/profile/ProfileModal";
import { useAppSelector } from "../hooks/hooks";
import NotificationDropdown from "../components/notification/NotificationDropdown";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width:900px)");
  const isSmallMobile = useMediaQuery("(max-width:430px)");
  const [openProfile, setOpenProfile] = useState(false);

  // ✅ Lấy user từ Redux - ưu tiên profile nếu đã load
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.profile.profile);

  // Sử dụng profile nếu có, fallback về authUser
  const user = profile || authUser;
  const userName = user?.name || "Người dùng";
  const avatarUrl = user?.avatar && user.avatar.startsWith("http") ? user.avatar : "";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await dispatch(logoutUser());
    navigate("/", { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={2}
      sx={{
        backgroundColor: "#fff",
        borderBottom: "2px solid #B90000",
        height: { xs: 60, sm: 68 },
        justifyContent: "center",
        zIndex: 1300,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          px: { xs: 1.2, sm: 2.5 },
          gap: { xs: 1, sm: 2 },
          minHeight: "unset",
          transition: "all 0.3s ease",
        }}
      >
        {/* Left Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
            flexShrink: 1,
          }}
        >
          <IconButton onClick={onToggleSidebar} sx={{ color: "#B90000", p: 1 }}>
            {sidebarOpen && isDesktop ? (
              <MenuIcon sx={{ fontSize: 22 }} />
            ) : (
              <MoreVert sx={{ fontSize: 22 }} />
            )}
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1.05rem" },
              fontWeight: 600,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Box component="span" sx={{ color: "#B90000" }}>
              {isSmallMobile ? "MIRAI" : "MIRAI JAPANESE "}
              <Box component="span" sx={{ color: "#333" }}>
                {isSmallMobile ? "LMS" : "LMS"}
              </Box>
            </Box>
          </Typography>
        </Box>

        {/* Right Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 2 },
            flexShrink: 0,
            ml: "auto",
            position: { sm: sidebarOpen && !isDesktop ? "absolute" : "static" },
            right: { sm: sidebarOpen && !isDesktop ? "12px" : "auto" },
            top: 0,
            height: "100%",
          }}
        >

          {/* Notifications */}
          <NotificationDropdown />
          {/* User Menu */}
          <Box>
            <Paper
              onClick={handleMenuOpen}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.8, sm: 1.2 },
                px: { xs: 0.8, sm: 1.2 },
                py: { xs: 0.4, sm: 0.6 },
                borderRadius: 2,
                cursor: "pointer",
                boxShadow: "none",
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              <Avatar
                src={avatarUrl}
                alt={userName}
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  bgcolor: "#B90000",
                  fontWeight: "bold",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 2px #B90000",
                }}
              >
                {!avatarUrl && userName.charAt(0).toUpperCase()}
              </Avatar>

              {isDesktop && (
                <Typography variant="body2" sx={{ color: "#333" }}>
                  {userName}
                </Typography>
              )}
              <KeyboardArrowDown sx={{ fontSize: 18, color: "#666" }} />
            </Paper>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  minWidth: 200,
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setTimeout(() => setOpenProfile(true), 200);
                }}
              >
                <Person sx={{ fontSize: 18, mr: 1.25 }} /> Hồ sơ
              </MenuItem>

              <MenuItem
                onClick={handleLogout}
                sx={{
                  color: "#d9534f",
                  "&:hover": { backgroundColor: "#fff5f5" },
                }}
              >
                <Logout sx={{ fontSize: 18, mr: 1.25 }} /> Đăng xuất
              </MenuItem>
            </Menu>

            {/* ✅ Profile Modal luôn đồng bộ avatar và user */}
            <ProfileModal
              open={openProfile}
              onClose={() => setOpenProfile(false)}
            />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
