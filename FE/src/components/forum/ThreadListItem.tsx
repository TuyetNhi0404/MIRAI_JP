import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  Chip, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

import type { ForumThread } from "../../types/forum.type";

import * as forumService from "../../services/forum.service";
import { useToast } from "../../hooks/useToast";
import ReactionPopover from "./ReactionPopover";

const PRIMARY_BLUE = "#023665";
const PRIMARY_ORANGE = "#B90000";
const TEXT_GREY = "#6b7280";

interface ThreadListItemProps {
  thread: ForumThread;
  onDeleted?: (id: string | number) => void; // callback để parent reload list
  isPending?: boolean; // true nếu đây là pending post
  onThreadClick?: () => void; // callback khi click vào thread
  onEditClick?: () => void; // callback khi click vào nút chỉnh sửa
}

// 👇 Thread có thêm field myReaction từ backend/transformed data
type ThreadWithReaction = ForumThread & {
  myReaction?: "like" | "dislike" | null;
};

const ThreadListItem: React.FC<ThreadListItemProps> = ({
  thread,
  onDeleted,
  isPending = false,
  onThreadClick,
  onEditClick,
}) => {
  const totalReplies = thread.replies ? thread.replies.length : 0;
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const isAuthor = user?.name === thread.author || user?.email === thread.author;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isTouchDevice = isMobile || isTablet; // Include iPad/tablet for tap behavior

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const threadWithReaction = thread as ThreadWithReaction;
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(
    threadWithReaction.myReaction ?? null
  );

  const [reactionCounts, setReactionCounts] = useState({
    like: thread.reactions.like,
    dislike: thread.reactions.dislike,
  });

  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();
  
  // Update myReaction and reaction counts when thread prop changes
  useEffect(() => {
    const t = thread as ThreadWithReaction;
    setMyReaction(t.myReaction ?? null);
    setReactionCounts({
      like: thread.reactions.like,
      dislike: thread.reactions.dislike,
    });
  }, [
    (thread as ThreadWithReaction).myReaction,
    thread.reactions.like,
    thread.reactions.dislike,
    thread,
  ]);

  const handleDelete = async () => {
    try {
      await forumService.deleteThread(String(thread.threadId));
      showSuccess("Post deleted successfully!");
      if (onDeleted) onDeleted(thread.threadId); // callback cho component cha
    } catch (err: unknown) {
      let errorMessage = "An error occurred while deleting the post";

      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        errorMessage = (err as { message?: string }).message ?? errorMessage;
      }

      showError(errorMessage);
      console.error("Delete error:", err);
    }
  };

  const handlePinToggle = async () => {
    try {
      if (thread.pinned) {
        await forumService.unpinPost(String(thread.threadId));
        showSuccess("Post unpinned");
      } else {
        await forumService.pinPost(String(thread.threadId));
        showSuccess("Post pinned");
      }
      if (onDeleted) onDeleted(thread.threadId); // Reload list
    } catch (err) {
      console.error("Error pinning/unpinning:", err);
      showError("Operation failed");
    }
  };

  const handleApprove = async () => {
    try {
      await forumService.approvePost(String(thread.threadId));
      showSuccess("Post approved successfully");
      if (onDeleted) onDeleted(thread.threadId);
    } catch (err) {
      console.error("Error approving post:", err);
      showError("Unable to approve post");
    }
  };

  const handleReject = async () => {
    try {
      await forumService.rejectPost(
        String(thread.threadId),
        rejectReason || "Bài không phù hợp"
      );
      showSuccess("Post rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      if (onDeleted) onDeleted(thread.threadId);
    } catch (err) {
      console.error("Error rejecting post:", err);
      showError("Unable to reject post");
    }
  };

  const handleLike = async () => {
    try {
      const wasLiked = myReaction === "like";
      const wasDisliked = myReaction === "dislike";
      
      // If currently disliked, switch to like; if liked, remove; if none, add like
      if (wasDisliked) {
        // Switch from dislike to like
        await forumService.reactThread(String(thread.threadId), "like");
        setMyReaction("like");
        setReactionCounts((prev) => ({
          like: prev.like + 1,
          dislike: Math.max(0, prev.dislike - 1),
        }));
      } else if (wasLiked) {
        // Remove like
        await forumService.reactThread(String(thread.threadId), "like");
        setMyReaction(null);
        setReactionCounts((prev) => ({
          like: Math.max(0, prev.like - 1),
          dislike: prev.dislike,
        }));
      } else {
        // Add like
        await forumService.reactThread(String(thread.threadId), "like");
        setMyReaction("like");
        setReactionCounts((prev) => ({
          like: prev.like + 1,
          dislike: prev.dislike,
        }));
      }
      // Don't reload the entire list - just update local state
    } catch (err) {
      console.error("Error reacting:", err);
      showError("Không thể thực hiện thao tác. Vui lòng thử lại.");
    }
  };

  const handleEmojiReaction = async (type: "like" | "dislike") => {
    setEmojiAnchor(null);
    try {
      // Toggle: if already this reaction, remove; otherwise switch to it
      const isCurrentlyReacted = myReaction === type;
      const wasLiked = myReaction === "like";
      const wasDisliked = myReaction === "dislike";
      const newReaction = isCurrentlyReacted ? null : type;
      
      await forumService.reactThread(String(thread.threadId), newReaction || type);
      setMyReaction(newReaction);
      
      // Update reaction counts optimistically
      if (type === "like") {
        if (isCurrentlyReacted) {
          // Removing like
          setReactionCounts((prev) => ({
            like: Math.max(0, prev.like - 1),
            dislike: prev.dislike,
          }));
        } else {
          // Adding like (might be switching from dislike)
          setReactionCounts((prev) => ({
            like: prev.like + 1,
            dislike: wasDisliked ? Math.max(0, prev.dislike - 1) : prev.dislike,
          }));
        }
      } else {
        // type === "dislike"
        if (isCurrentlyReacted) {
          // Removing dislike
          setReactionCounts((prev) => ({
            like: prev.like,
            dislike: Math.max(0, prev.dislike - 1),
          }));
        } else {
          // Adding dislike (might be switching from like)
          setReactionCounts((prev) => ({
            like: wasLiked ? Math.max(0, prev.like - 1) : prev.like,
            dislike: prev.dislike + 1,
          }));
        }
      }
      // Don't reload the entire list - just update local state
    } catch (err) {
      console.error("Error reacting:", err);
      showError("Không thể thực hiện thao tác. Vui lòng thử lại.");
    }
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <Card
      onClick={(e) => {
        // Chỉ mở popup nếu không phải pending và có onThreadClick
        // Và không click vào các button/interactive elements
        const target = e.target as HTMLElement;
        const isInteractiveElement = 
          target.closest("button") || 
          target.closest('[role="button"]') || 
          target.closest("a") ||
          target.closest(".MuiMenu-root") ||
          target.closest(".MuiPopover-root") ||
          target.closest(".MuiDialog-root") ||
          target.closest(".MuiIconButton-root");
        
        if (!isPending && onThreadClick && !isInteractiveElement) {
          e.preventDefault();
          e.stopPropagation();
          onThreadClick();
        }
      }}
      sx={{
        mb: { xs: 1.5, sm: 2 },
        borderRadius: { xs: 2, sm: 3 },
        backgroundColor: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb",
        cursor: isPending || !onThreadClick ? "default" : "pointer",
        "&:hover": {
          boxShadow:
            isPending || !onThreadClick
              ? "0 1px 3px rgba(0, 0, 0, 0.1)"
              : "0 4px 12px rgba(236, 117, 16, 0.15)",
          borderColor: isPending || !onThreadClick ? "#e5e7eb" : "#B90000",
        },
        transition: "all 0.2s ease",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Header với avatar và tên */}
        <Box
          sx={{
            px: { xs: 1, sm: 1.5 },
            py: { xs: 1, sm: 1.5 },
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            gap={{ xs: 1, sm: 1.5 }}
            flex={1}
          >
            <Avatar
              src={thread.authorAvatar}
              sx={{
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                bgcolor: PRIMARY_ORANGE,
                fontSize: { xs: "16px", sm: "18px" },
                fontWeight: "bold",
              }}
            >
              {!thread.authorAvatar && getInitials(thread.author || "User")}
            </Avatar>
            <Box>
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flexWrap="wrap"
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: PRIMARY_BLUE,
                    fontSize: { xs: "14px", sm: "15px" },
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                      color: PRIMARY_ORANGE,
                    },
                  }}
                >
                  {thread.author || "Người dùng"}
                </Typography>
                {thread.pinned && !isPending && (
                  <PushPinIcon
                    sx={{ color: PRIMARY_ORANGE, fontSize: { xs: 14, sm: 16 } }}
                  />
                )}
                {isPending && (
                  <Chip
                    label="Pending"
                    size="small"
                    color="warning"
                    sx={{
                      height: { xs: 18, sm: 20 },
                      fontSize: { xs: "10px", sm: "11px" },
                      "& .MuiChip-label": { px: { xs: 0.5, sm: 1 } },
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: TEXT_GREY,
                  fontSize: { xs: "12px", sm: "13px" },
                }}
              >
                {formatTime(thread.createdAt)}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {isTeacherOrAdmin && !isPending && (
              <Tooltip title={thread.pinned ? "Unpin" : "Pin post"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePinToggle();
                  }}
                  sx={{ p: 0.5 }}
                >
                  {thread.pinned ? (
                    <PushPinIcon
                      sx={{ color: PRIMARY_ORANGE, fontSize: 20 }}
                    />
                  ) : (
                    <PushPinOutlinedIcon
                      sx={{ fontSize: 20, color: TEXT_GREY }}
                    />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {!isPending && (isAuthor || isTeacherOrAdmin) && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
                sx={{ p: 0.5 }}
              >
                <MoreVertIcon sx={{ fontSize: 20, color: TEXT_GREY }} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Menu dropdown */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          {(isAuthor || isTeacherOrAdmin) && !isPending && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                if (onEditClick) {
                  onEditClick();
                } else if (onThreadClick) {
                  onThreadClick();
                }
              }}
            >
              <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
            </MenuItem>
          )}
          {(isAuthor || isAdmin) && !isPending && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                handleDelete();
              }}
            >
              <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Delete post
            </MenuItem>
          )}
          {isAdmin &&
            isPending && [
              <MenuItem
                key="approve"
                onClick={() => {
                  setMenuAnchor(null);
                  handleApprove();
                }}
              >
                <CheckCircleIcon
                  sx={{ mr: 1, fontSize: 20, color: "green" }}
                />{" "}
                Approve post
              </MenuItem>,
              <MenuItem
                key="reject"
                onClick={() => {
                  setMenuAnchor(null);
                  setRejectDialogOpen(true);
                }}
              >
                <CancelIcon
                  sx={{ mr: 1, fontSize: 20, color: "red" }}
                />{" "}
                Reject post
              </MenuItem>,
            ]}
        </Menu>

        {/* Title */}
        {thread.title && (
          <Box sx={{ px: { xs: 1, sm: 1.5 }, pb: { xs: 1, sm: 1.5 } }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                color: PRIMARY_BLUE,
                fontSize: { xs: "16px", sm: "17px" },
                lineHeight: 1.3,
              }}
            >
              {thread.title}
            </Typography>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ px: { xs: 1, sm: 1.5 }, pb: { xs: 1, sm: 1.5 } }}>
          <Typography
            variant="body1"
            sx={{
              color: PRIMARY_BLUE,
              fontSize: { xs: "14px", sm: "15px" },
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              ...(isPending || isContentExpanded
                ? {}
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }),
            }}
          >
            {thread.content}
          </Typography>
          {!isPending && thread.content && thread.content.length > 150 && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsContentExpanded(!isContentExpanded);
              }}
              sx={{
                mt: 0.5,
                p: 0,
                minWidth: "auto",
                textTransform: "none",
                color: PRIMARY_ORANGE,
                fontSize: { xs: "14px", sm: "15px" },
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "transparent",
                  textDecoration: "underline",
                  color: PRIMARY_BLUE,
                },
              }}
            >
              {isContentExpanded ? "Thu gọn" : "Xem thêm"}
            </Button>
          )}
        </Box>

        {/* Images */}
        {thread.images && thread.images.length > 0 && (
          <Box sx={{ width: "100%", mb: { xs: 1, sm: 1.5 }, px: 0 }}>
            {thread.images.length === 1 ? (
              <Box
                component="img"
                src={thread.images[0]}
                alt="Post image"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPending && onThreadClick) {
                    onThreadClick();
                  }
                }}
                sx={{
                  width: "100%",
                  height: "auto",
                  maxHeight: { xs: 300, sm: 500 },
                  cursor:
                    isPending || !onThreadClick ? "default" : "pointer",
                  display: "block",
                }}
              />
            ) : (
              <Box
                sx={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns:
                    thread.images.length === 2 ? "1fr 1fr" : "1fr 1fr",
                  gap: 0.5,
                }}
              >
                {thread.images.slice(0, 4).map((img, idx) => (
                  <Box key={idx} sx={{ position: "relative" }}>
                    <Box
                      component="img"
                      src={img}
                      alt={`Image ${idx + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPending && onThreadClick) {
                          onThreadClick();
                        }
                      }}
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight:
                          thread.images!.length === 2
                            ? { xs: 200, sm: 300 }
                            : { xs: 150, sm: 200 },
                        cursor:
                          isPending || !onThreadClick
                            ? "default"
                            : "pointer",
                        display: "block",
                      }}
                    />
                    {idx === 3 &&
                      thread.images &&
                      thread.images.length > 4 && (
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isPending && onThreadClick) {
                              onThreadClick();
                            }
                          }}
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor:
                              isPending || !onThreadClick
                                ? "default"
                                : "pointer",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "#FFFFFF",
                              fontSize: { xs: "20px", sm: "24px" },
                              fontWeight: 700,
                            }}
                          >
                            +{thread.images.length - 4}
                          </Typography>
                        </Box>
                      )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Stats bar (Like count, Dislike count, Comment count) */}
        {(reactionCounts.like > 0 ||
          reactionCounts.dislike > 0 ||
          totalReplies > 0) && (
          <Box
            sx={{
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.75, sm: 1 },
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #e5e7eb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              gap={{ xs: 0.75, sm: 1 }}
            >
              {reactionCounts.like > 0 && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ThumbUpIcon
                    sx={{
                      fontSize: { xs: 16, sm: 18 },
                      color: PRIMARY_ORANGE,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: TEXT_GREY,
                      fontSize: { xs: "12px", sm: "13px" },
                    }}
                  >
                    {reactionCounts.like}
                  </Typography>
                </Box>
              )}
              {reactionCounts.dislike > 0 && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ThumbDownIcon
                    sx={{
                      fontSize: { xs: 16, sm: 18 },
                      color: "#dc2626",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: TEXT_GREY,
                      fontSize: { xs: "12px", sm: "13px" },
                    }}
                  >
                    {reactionCounts.dislike}
                  </Typography>
                </Box>
              )}
            </Box>
            {totalReplies > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: TEXT_GREY,
                  fontSize: "13px",
                }}
              >
                {totalReplies} comment{totalReplies !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        )}

        {/* Action buttons (Like, Comment) */}
        <Box
          sx={{
            px: { xs: 0.25, sm: 0.5 },
            py: { xs: 0.5, sm: 0.5 },
            display: "flex",
            borderTop: "1px solid #e5e7eb",
            gap: { xs: 0.5, sm: 0 },
          }}
        >
          {isPending && isAdmin ? (
            <>
              <Button
                fullWidth
                startIcon={
                  <CheckCircleIcon
                    sx={{ fontSize: { xs: 18, sm: 20 } }}
                  />
                }
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove();
                }}
                sx={{
                  color: PRIMARY_BLUE,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: "14px", sm: "15px" },
                  borderRadius: 2,
                  flex: 1,
                  "&:hover": {
                    backgroundColor: "#fff5e6",
                    color: PRIMARY_ORANGE,
                  },
                }}
              >
                Approve post
              </Button>
              <Button
                fullWidth
                startIcon={
                  <CancelIcon
                    sx={{ fontSize: { xs: 18, sm: 20 } }}
                  />
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectDialogOpen(true);
                }}
                sx={{
                  color: PRIMARY_BLUE,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: "14px", sm: "15px" },
                  borderRadius: 2,
                  flex: 1,
                  "&:hover": {
                    backgroundColor: "#fff5e6",
                    color: "#dc2626",
                  },
                }}
              >
                Reject post
              </Button>
            </>
          ) : (
            <>
              <Box
                sx={{ position: "relative", flex: 1 }}
                onMouseEnter={(e) => {
                  // Only show popover on desktop (non-touch devices)
                  if (!isTouchDevice) {
                    const dialog = document.querySelector(
                      '[role="dialog"]'
                    ) as HTMLElement | null;
                    if (
                      !dialog ||
                      (dialog &&
                        window.getComputedStyle(dialog).display === "none")
                    ) {
                      setEmojiAnchor(e.currentTarget);
                    }
                  }
                }}
                onMouseLeave={() => {
                  // Only hide on mouse leave for desktop
                  if (!isTouchDevice) {
                    setEmojiAnchor(null);
                  }
                }}
              >
                <Button
                  fullWidth
                  startIcon={
                    myReaction === "like" ? (
                      <ThumbUpIcon
                        sx={{ fontSize: { xs: 18, sm: 20 } }}
                      />
                    ) : myReaction === "dislike" ? (
                      <ThumbDownIcon
                        sx={{ fontSize: { xs: 18, sm: 20 } }}
                      />
                    ) : (
                      <ThumbUpOutlinedIcon
                        sx={{ fontSize: { xs: 18, sm: 20 } }}
                      />
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    // On mobile/tablet (touch devices), toggle popover; on desktop, just handle like
                    if (isTouchDevice) {
                      const dialog = document.querySelector(
                        '[role="dialog"]'
                      ) as HTMLElement | null;
                      if (
                        !dialog ||
                        (dialog &&
                          window.getComputedStyle(dialog).display ===
                            "none")
                      ) {
                        if (emojiAnchor === e.currentTarget) {
                          setEmojiAnchor(null);
                        } else {
                          setEmojiAnchor(e.currentTarget);
                        }
                      }
                    } else {
                      handleLike();
                    }
                  }}
                  sx={{
                    color:
                      myReaction === "like"
                        ? PRIMARY_ORANGE
                        : myReaction === "dislike"
                        ? "#dc2626"
                        : TEXT_GREY,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "14px", sm: "15px" },
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "#fff5e6",
                      color:
                        myReaction === "like"
                          ? PRIMARY_ORANGE
                          : myReaction === "dislike"
                          ? "#dc2626"
                          : PRIMARY_ORANGE,
                    },
                  }}
                >
                  {myReaction === "dislike" ? "Dislike" : "Like"}
                </Button>
                {!document.querySelector('[role="dialog"]') && (
                  <ReactionPopover
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    onLike={() => handleEmojiReaction("like")}
                    onDislike={() => handleEmojiReaction("dislike")}
                    zIndex={1200}
                    isMobile={isTouchDevice}
                  />
                )}
              </Box>
              <Button
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPending && onThreadClick) {
                    onThreadClick();
                  }
                }}
                disabled={isPending || !onThreadClick}
                startIcon={
                  <CommentOutlinedIcon
                    sx={{ fontSize: { xs: 18, sm: 20 } }}
                  />
                }
                sx={{
                  color: TEXT_GREY,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: "14px", sm: "15px" },
                  borderRadius: 2,
                  flex: 1,
                  "&:hover": {
                    backgroundColor: "#fff5e6",
                    color: PRIMARY_ORANGE,
                  },
                }}
              >
                Comment
              </Button>
            </>
          )}
        </Box>
      </CardContent>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
      <ToastComponent />
    </Card>
  );
};

export default ThreadListItem;
