import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import { useState, useEffect } from "react";

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (email: string, name: string) => Promise<void>;
  role: "teacher" | "admin"; 
}

export function AddAccountUsers({ open, onClose, onAdd, role }: AddAccountModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [toast, setToast] = useState({ 
    open: false, 
    message: "", 
    severity: "success" as "success" | "error" 
  });

  useEffect(() => {
    if (!open) {
      setEmail("");
      setName("");
      setNameError("");
      setEmailError("");
    }
  }, [open]);

  const validateInputs = (): boolean => {
    let isValid = true;
    let newNameError = "";
    let newEmailError = "";

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      newNameError = "Họ tên là bắt buộc";
      isValid = false;
    } else if (trimmedName.length < 2) {
      newNameError = "Họ tên phải có ít nhất 2 ký tự";
      isValid = false;
    } else if (trimmedName.length > 40) {
      newNameError = "Họ tên không được vượt quá 40 ký tự";
      isValid = false;
    } else {
      const nameRegex = /^[a-zA-ZÀ-ỿ\s]+$/;
      if (!nameRegex.test(trimmedName)) {
        newNameError = "Họ tên chỉ được chứa chữ cái và khoảng trắng";
        isValid = false;
      }
    }


    if (!trimmedEmail) {
      newEmailError = "Email là bắt buộc";
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newEmailError = "Vui lòng nhập địa chỉ email hợp lệ";
        isValid = false;
      }
    }

    setNameError(newNameError);
    setEmailError(newEmailError);
    return isValid;
  };

  const handleAdd = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setLoading(true);
      await onAdd(email.trim(), name.trim());
      
      setEmail("");
      setName("");
      setNameError("");
      setEmailError("");
      
      setToast({ 
        open: true, 
        message: "Tạo tài khoản thành công", 
        severity: "success" 
      });
      
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Không thể tạo tài khoản";
      
      setToast({ 
        open: true, 
        message: errorMessage, 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAdd();
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#023665" }}>
          Thêm {role === "teacher" ? "Giáo viên" : "Quản trị viên"} mới
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Họ tên"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập họ tên"
              helperText={nameError}
              error={!!nameError}
              disabled={loading}
              autoFocus
            />
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập email"
              helperText={emailError}
              error={!!emailError}
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={onClose} 
            variant="outlined"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            sx={{
              backgroundColor: "#B90000",
              "&:hover": { backgroundColor: "#d45f0a" },
            }}
            disabled={loading}
          >
            {loading ? "Đang thêm..." : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, open: false })} 
          severity={toast.severity} 
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default AddAccountUsers;
