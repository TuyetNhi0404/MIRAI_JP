// ProfileForm.tsx
import React, { useState, useEffect } from "react";
import { 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import type { Profile, UpdateProfileRequest } from "../../types/profile.types";

interface ProfileFormProps {
  profile: Profile | null;
  loading: boolean;
  onSave: (data: UpdateProfileRequest) => Promise<void>;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, loading, onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [form, setForm] = useState<UpdateProfileRequest>({
    name: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        description: profile.description || "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateProfileRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
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
        onChange={(e) => handleChange("name", e.target.value)}
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
        rows={isMobile ? 2 : isTablet ? 3 : 3}
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
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
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth={isMobile}
        sx={{
          bgcolor: "#B90000",
          "&:hover": { bgcolor: "#d8690d" },
          fontSize: isMobile ? "0.85rem" : "0.95rem",
          py: isMobile ? 1 : 1.2,
          textTransform: "none",
        }}
        disabled={loading || isSaving}
      >
        {isSaving ? <CircularProgress size={24} color="inherit" /> : "Save changes"}
      </Button>
    </Box>
  );
};
