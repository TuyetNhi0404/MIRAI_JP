// src/components/GoogleLoginButton.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Box, Snackbar, useMediaQuery, useTheme } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import type { AlertProps } from "@mui/material/Alert";
import GoogleIcon from "@mui/icons-material/Google";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import type { User } from "../types/auth.types";


const Alert = (props: AlertProps) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GoogleLoginButton = ({ onSuccess, onError }: GoogleLoginButtonProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600px - 900px
  // Laptop/Desktop: >= 900px (default case)
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });



  // Get Google OAuth config from environment
  const googleConfig = {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
    onSuccess: (user: User) => {
      // Show success message
      setSnackbar({
        open: true,
        message: `Chào ${user.name || "bạn"}! Đăng nhập thành công 🎉`,
        severity: "success",
      });

      // Callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Navigate based on role after a short delay
      setTimeout(() => {
        switch (user.role) {
          case "admin":
            navigate("/dashboard/admin");
            break;
          case "teacher":
            navigate("/dashboard/teacher");
            break;
          default:
            navigate("/dashboard/student");
        }
      }, 1000);
    },
    onError: (errorMessage: string) => {
      console.error("Google login failed:", errorMessage);
      
      // Format error message for user display
      let displayMessage = errorMessage;
      
      // Map backend error messages to user-friendly Vietnamese
      if (errorMessage.includes("chưa được cấp quyền truy cập")) {
        displayMessage = "❌ Tài khoản chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.";
      } else if (errorMessage.includes("đã bị khóa")) {
        displayMessage = "🔒 Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
      } else if (errorMessage.includes("Google payload invalid")) {
        displayMessage = "❌ Thông tin từ Google không hợp lệ. Vui lòng thử lại.";
      } else if (errorMessage.includes("popup_closed_by_user") || errorMessage.includes("đóng cửa sổ")) {
        displayMessage = "ℹ️ Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.";
      } else if (errorMessage.includes("access_denied") || errorMessage.includes("từ chối")) {
        displayMessage = "❌ Bạn đã từ chối quyền truy cập Google. Vui lòng cho phép truy cập để đăng nhập.";
      } else if (errorMessage.includes("Token") || errorMessage.includes("token")) {
        displayMessage = "❌ Lỗi xác thực Google. Vui lòng thử lại.";
      } else if (!errorMessage || errorMessage === "Đăng nhập Google thất bại") {
        displayMessage = "❌ Đăng nhập Google thất bại. Vui lòng kiểm tra kết nối và thử lại.";
      }
      
      setSnackbar({
        open: true,
        message: displayMessage,
        severity: "error",
      });

      // Callback if provided
      if (onError) {
        onError(displayMessage);
      }
    }
  };

  const { login, loading } = useGoogleAuth(googleConfig);

  const handleClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Responsive button styles
  const getButtonStyles = () => {
    const baseStyles = {
      borderColor: "white",
      color: "#B90000",
      textTransform: "none" as const,
      fontWeight: 600,
      backgroundColor: "white",
      "&:hover": {
        backgroundColor: "#B90000",
        color: "white",
        borderColor: "white",
        boxShadow: "0 0 8px rgba(219,68,55,0.3)",
      },
      "&:disabled": {
        backgroundColor: "#f5f5f5",
        color: "#999",
      },
      borderRadius: "25px",
      transition: "all 0.3s ease",
    };

    if (isMobile) {
      return {
        ...baseStyles,
        px: 2,
        py: 1,
        fontSize: "13px",
        minWidth: "140px",
      };
    } else if (isTablet) {
      return {
        ...baseStyles,
        px: 2.5,
        py: 1.1,
        fontSize: "14px",
        minWidth: "160px",
      };
    } else {
      return {
        ...baseStyles,
        px: 3,
        py: 1.2,
        fontSize: "15px",
        minWidth: "180px",
      };
    }
  };

  // Responsive snackbar styles
  const getSnackbarStyles = () => {
    if (isMobile) {
      return {
        width: "100%",
        minWidth: "280px",
        maxWidth: "90vw",
        fontSize: "13px",
      };
    } else if (isTablet) {
      return {
        width: "100%",
        minWidth: "320px",
        fontSize: "13.5px",
      };
    } else {
      return {
        width: "100%",
        minWidth: "350px",
        fontSize: "14px",
      };
    }
  };



  return (
    <>
      <Box 
        display="flex" 
        justifyContent="flex-start"
        alignItems="center"
        gap={1}
        sx={{
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'column' : 'row'
        }}
      >
        <Button
          onClick={() => login()}
          disabled={loading}
          variant="outlined"
          startIcon={<GoogleIcon sx={{ fontSize: isMobile ? '18px' : '20px' }} />}
          fullWidth={isMobile}
          sx={getButtonStyles()}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>


      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ 
          vertical: "top", 
          horizontal: isMobile ? "center" : "right" 
        }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbar.severity}
          sx={{
            ...getSnackbarStyles(),
            backgroundColor:
              snackbar.severity === "success" ? "#B90000" : "#B71C1C",
            color: "white",
            fontWeight: 600,
            letterSpacing: "0.3px",
            "& .MuiAlert-icon": {
              fontSize: isMobile ? "20px" : "24px",
            },
            "& .MuiAlert-message": {
              fontSize: isMobile ? "13px" : "14px",
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GoogleLoginButton;
