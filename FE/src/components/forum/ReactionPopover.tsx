import React, { useMemo, useEffect } from "react";
import { Popover, Box, Button } from "@mui/material";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";

const TEXT_GREY = "#6b7280";

interface ReactionPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  zIndex?: number;
  isMobile?: boolean;
}

const ReactionPopover: React.FC<ReactionPopoverProps> = ({
  anchorEl,
  onClose,
  onLike,
  onDislike,
  zIndex = 1300,
  isMobile = false,
}) => {
  const open = Boolean(anchorEl);
  
  // Memoize popover content to prevent re-renders
  const popoverContent = useMemo(() => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 0.5,
        width: "100%",
      }}
    >
      <Button
        fullWidth
        startIcon={<ThumbUpOutlinedIcon />}
        onClick={() => {
          onLike();
          onClose();
        }}
        sx={{
          color: TEXT_GREY,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "15px",
          borderRadius: 1,
          flex: 1,
          "&:hover": {
            backgroundColor: "#F2F3F5",
          },
        }}
      >
        Like
      </Button>
      <Button
        fullWidth
        startIcon={<ThumbDownIcon />}
        onClick={() => {
          onDislike();
          onClose();
        }}
        sx={{
          color: TEXT_GREY,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "15px",
          borderRadius: 1,
          flex: 1,
          "&:hover": {
            backgroundColor: "#F2F3F5",
          },
        }}
      >
        Dislike
      </Button>
    </Box>
  ), [onLike, onDislike, onClose]);

  // Close popover on outside click for mobile
  useEffect(() => {
    if (isMobile && open) {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        const target = event.target as HTMLElement;
        if (anchorEl && !anchorEl.contains(target)) {
          const popoverPaper = document.querySelector('.MuiPopover-paper');
          if (popoverPaper && !popoverPaper.contains(target)) {
            onClose();
          }
        }
      };

      // Add event listeners with a small delay to avoid immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isMobile, open, anchorEl, onClose]);

  if (!anchorEl) return null;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      disableRestoreFocus
      sx={{
        pointerEvents: "none",
        zIndex: zIndex,
        "& .MuiPopover-paper": {
          pointerEvents: "auto",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          borderRadius: 1,
          p: 0.5,
          width: anchorEl ? `${anchorEl.offsetWidth}px` : "auto",
          minWidth: "unset",
          maxWidth: "unset",
          zIndex: zIndex,
        },
      }}
      onMouseEnter={() => {
        // Keep popover open on hover for desktop
        if (!isMobile) {
          // Do nothing, keep it open
        }
      }}
      onMouseLeave={() => {
        // Close on mouse leave for desktop only
        if (!isMobile) {
          onClose();
        }
      }}
      container={() => document.body}
    >
      {popoverContent}
    </Popover>
  );
};

export default ReactionPopover;

