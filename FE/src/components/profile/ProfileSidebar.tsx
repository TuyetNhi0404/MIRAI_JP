//ProfileSidebar.tsx
import React from "react";
import { 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemText,
  useTheme,
  useMediaQuery,
} from "@mui/material";

interface SidebarItem {
  id: string;
  label: string;
}

interface ProfileSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  items?: SidebarItem[];
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  activeTab,
  onTabChange,
  items = [{ id: "profile", label: "Profile" }],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  return (
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
          fontSize: isMobile ? "1rem" : isTablet ? "1.1rem" : "1.25rem"
        }}
      >
        Account
      </Typography>
      <List sx={{ display: isMobile ? "flex" : "block", gap: isMobile ? 1 : 0 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
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
                fontSize: isMobile ? "0.85rem" : isTablet ? "0.9rem" : "0.95rem",
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
