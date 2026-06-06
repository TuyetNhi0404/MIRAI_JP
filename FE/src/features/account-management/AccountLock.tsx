import { useState } from "react";
import {
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { userService } from "../../services/accountService";
import type { User } from "../../types/account.types";

interface AccountLockProps {
  user: User;
  onStatusChange: (userId: string, newStatus: "active" | "locked") => Promise<void>;
}

export function AccountLock({ user, onStatusChange }: AccountLockProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleLock = async () => {
    try {
      setLoading(true);
      
      const newStatus: "active" | "locked" = user.status === "active" ? "locked" : "active";

      console.log("🔵 Toggling user:", user._id, "from", user.status, "to", newStatus);

      const result = await userService.toggleStatus(user._id, newStatus);
      
      console.log(" Toggle API success:", result);

      await onStatusChange(user._id, result.user.status);

    } catch (error) {
      console.error(" Failed to toggle user:", error);
      alert(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tài khoản");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <IconButton disabled size="small">
        <CircularProgress size={20} />
      </IconButton>
    );
  }

  return (
    <Tooltip title={user.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
      <IconButton
        onClick={handleToggleLock}
        size="small"
        sx={{
          color: user.status === "active" ? "#4caf50" : "#f44336",
          "&:hover": {
            bgcolor: user.status === "active" ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
          }
        }}
      >
        {user.status === "active" ? <LockOpenIcon /> : <LockIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default AccountLock;
