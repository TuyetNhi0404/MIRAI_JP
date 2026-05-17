// components/profile/ProfileModal.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Modal,
  Paper,
  Divider,
  CircularProgress,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useProfile } from "../../hooks/useProfile";
import { ProfileAvatar } from "./ProfileAvatar";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { profile, loading, loadProfile, updateProfileInfo, error, clearProfileError } =
    useProfile();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Load profile when modal opens
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open, loadProfile]);

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        description: profile.description || "",
      });
    }
  }, [profile]);

  // Display error if exists
  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: "error",
      });
      clearProfileError();
    }
  }, [error, clearProfileError]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileInfo({
        name: form.name,
        description: form.description,
      });
      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
      // Close modal after successful save
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const error = err as Error;
      setSnackbar({
        open: true,
        message: error.message || "Unable to save changes",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sidebarItems = [{ id: "profile", label: "Profile" }];

  return (
    <Modal open={open} onClose={onClose}>
      <Paper
        sx={{
          width: isMobile ? "95%" : isTablet ? "85%" : "80%",
          maxWidth: isMobile ? "100%" : "900px",
          height: isMobile ? "95%" : isTablet ? "85%" : "80%",
          maxHeight: isMobile ? "100%" : "700px",
          margin: "auto",
          mt: isMobile ? "2.5vh" : "5vh",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          borderRadius: isMobile ? 2 : 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Close Button - Mobile */}
        {isMobile && (
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              zIndex: 1,
              bgcolor: "rgba(255,255,255,0.9)",
              "&:hover": { bgcolor: "rgba(255,255,255,1)" },
            }}
          >
            <Close />
          </IconButton>
        )}

        {/* Sidebar */}
        <Box
          sx={{
            width: isMobile ? "100%" : isTablet ? "200px" : "240px",
            backgroundColor: "#f9f9f9",
            borderRight: isMobile ? "none" : "1px solid #e0e0e0",
            borderBottom: isMobile ? "1px solid #e0e0e0" : "none",
            p: isMobile ? 1.5 : 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: isMobile ? 1.5 : 2,
              fontWeight: 600,
              fontSize: isMobile ? "1rem" : "1.25rem"
            }}
          >
            Account
          </Typography>
          <List sx={{ display: isMobile ? "flex" : "block", gap: isMobile ? 1 : 0 }}>
            {sidebarItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                sx={{
                  borderRadius: 2,
                  mb: isMobile ? 0 : 0.5,
                  minWidth: isMobile ? "auto" : "100%",
                  px: isMobile ? 2 : 2,
                  py: isMobile ? 1 : 1.5,
                  "&.Mui-selected": {
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    color: activeTab === item.id ? "#B90000" : "#333",
                    fontSize: isMobile ? "0.85rem" : "0.95rem",
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            p: isMobile ? 2 : isTablet ? 3 : 4,
            overflowY: "auto"
          }}
        >
          {loading && !profile ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress sx={{ color: "#B90000" }} />
            </Box>
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: isMobile ? 2 : 3,
                  fontSize: isMobile ? "1.25rem" : "1.5rem"
                }}
              >
                Profile
              </Typography>

              {/* Avatar + Info */}
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                alignItems={isMobile ? "center" : "center"}
                gap={isMobile ? 2 : 3}
                mb={isMobile ? 2 : 3}
              >
                <ProfileAvatar
                  avatar={profile?.avatar}
                  name={profile?.name || "User"}
                  size={isMobile ? 80 : 90}
                  editable
                />

                <Box sx={{ textAlign: isMobile ? "center" : "left" }}>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: isMobile ? "1.1rem" : "1.25rem" }}
                  >
                    {profile?.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: isMobile ? "0.85rem" : "0.95rem" }}
                  >
                    {profile?.email}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      bgcolor: "#B90000",
                      color: "white",
                      borderRadius: 1,
                      display: "inline-block",
                      mt: 0.5,
                      textTransform: "capitalize",
                      fontSize: isMobile ? "0.7rem" : "0.75rem",
                    }}
                  >
                    {profile?.role}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: isMobile ? 2 : 3 }} />

              {/* Form */}
              <Box component="form" onSubmit={handleSave}>
                <TextField
                  label="Full Name"
                  fullWidth
                  sx={{
                    mb: isMobile ? 1.5 : 2,
                    "& .MuiInputBase-input": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    }
                  }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={loading}
                />

                <TextField
                  label="Email"
                  fullWidth
                  value={profile?.email || ""}
                  disabled
                  sx={{
                    mb: isMobile ? 1.5 : 2,
                    "& .MuiInputBase-input": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    }
                  }}
                />

                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={loading}
                  sx={{
                    mb: isMobile ? 2 : 3,
                    "& .MuiInputBase-input": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    }
                  }}
                  placeholder="Write a few lines about yourself..."
                />

                <Box
                  display="flex"
                  flexDirection={isMobile ? "column" : "row"}
                  gap={2}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth={isMobile}
                    sx={{
                      bgcolor: "#B90000",
                      "&:hover": { bgcolor: "#d8690d" },
                      textTransform: "none",
                      px: isMobile ? 2 : 3,
                      py: isMobile ? 1 : 1.2,
                      fontSize: isMobile ? "0.85rem" : "0.95rem",
                    }}
                    disabled={loading || isSaving}
                  >
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : "Save changes"}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth={isMobile}
                    sx={{
                      textTransform: "none",
                      px: isMobile ? 2 : 3,
                      py: isMobile ? 1 : 1.2,
                      fontSize: isMobile ? "0.85rem" : "0.95rem",
                      borderColor: "#B90000",
                      color: "#B90000",
                      "&:hover": {
                        borderColor: "#d8690d",
                        bgcolor: "rgba(236, 117, 16, 0.04)",
                      },
                    }}
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Snackbar */}
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
      </Paper>
    </Modal>
  );
};

export default ProfileModal;
