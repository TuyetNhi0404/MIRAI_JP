// components/profile/ProfileAvatar.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Upload } from "@mui/icons-material";
import { useProfile } from "../../hooks/useProfile";

interface ProfileAvatarProps {
  avatar?: string;
  name: string;
  size?: number;
  editable?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatar,
  name,
  size = 90,
  editable = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { avatarUploading, uploadAvatar, deleteAvatar } = useProfile();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatar || null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Adjust avatar size based on device
  const responsiveSize = isMobile ? size * 0.7 : isTablet ? size * 0.85 : size;

  // Sync avatar when prop changes
  useEffect(() => {
    setAvatarPreview(avatar || null);
  }, [avatar]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      const newAvatarUrl = await uploadAvatar(file);
      setAvatarPreview(newAvatarUrl);
      setSnackbar({
        open: true,
        message: "Avatar updated successfully!",
        severity: "success",
      });
    } catch (error) {
      const err = error as Error;
      // Rollback preview if upload fails
      setAvatarPreview(avatar || null);
      setSnackbar({
        open: true,
        message: err.message || "Unable to upload image",
        severity: "error",
      });
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleDeleteAvatar = async () => {
    setConfirmOpen(false);
    try {
      await deleteAvatar();
      setAvatarPreview(null);
      setSnackbar({
        open: true,
        message: "Avatar deleted successfully!",
        severity: "success",
      });
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Unable to delete avatar",
        severity: "error",
      });
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" position="relative">
      {/* Avatar Container */}
      <Box position="relative">
        <Avatar
          src={avatarPreview || ""}
          sx={{
            width: responsiveSize,
            height: responsiveSize,
            fontSize: responsiveSize / 2.8,
            bgcolor: "#B90000",
            transition: "opacity 0.3s ease",
            opacity: avatarUploading ? 0.6 : 1,
          }}
        >
          {!avatarPreview && name.charAt(0).toUpperCase()}
        </Avatar>

        {/* Upload Button */}
        {editable && (
          <Button
            component="label"
            variant="contained"
            sx={{
              position: "absolute",
              bottom: isMobile ? -8 : -10,
              right: isMobile ? -8 : -10,
              bgcolor: "#B90000",
              minWidth: isMobile ? 32 : 36,
              height: isMobile ? 32 : 36,
              borderRadius: "50%",
              padding: 0,
              "&:hover": { bgcolor: "#d8690d" },
            }}
            disabled={avatarUploading}
          >
            {avatarUploading ? (
              <CircularProgress size={isMobile ? 16 : 18} color="inherit" />
            ) : (
              <Upload fontSize={isMobile ? "small" : "medium"} />
            )}
            <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
          </Button>
        )}
      </Box>

      {/* Remove Button */}
      {editable && avatarPreview && (
        <Button
          size="small"
          color="error"
          variant="outlined"
          sx={{
            mt: isMobile ? 1.5 : 2.5,
            textTransform: "none",
            borderRadius: 3,
            fontSize: isMobile ? "0.7rem" : "0.8rem",
            px: isMobile ? 2 : 2.5,
            py: 0.4,
          }}
          onClick={() => setConfirmOpen(true)}
          disabled={avatarUploading}
        >
          Remove Avatar
        </Button>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            maxWidth: isMobile ? "90%" : "500px",
            m: isMobile ? 2 : "auto"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold", fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
          Confirm Delete Avatar
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
            Are you sure you want to delete this avatar?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              textTransform: "none",
              fontSize: isMobile ? "0.85rem" : "0.95rem"
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontSize: isMobile ? "0.85rem" : "0.95rem"
            }}
            onClick={handleDeleteAvatar}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: 2,
            fontSize: isMobile ? "0.85rem" : "0.95rem"
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileAvatar;
