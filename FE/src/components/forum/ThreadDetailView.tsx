import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ImageList,
  ImageListItem,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SendIcon from "@mui/icons-material/Send";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import {
  getThread,
  reactThread,
  updateThread,
  deleteThread,
  pinPost,
  unpinPost,
  createComment,
  getThreadComments,
} from "../../services/forum.service";
import type { ForumThread, ForumComment } from "../../types/forum.type";
import CommentItem from "./CommentItem";
import ReactionPopover from "./ReactionPopover";

// Type extension for window with callback
interface WindowWithCallback extends Window {
  onThreadDeleted?: () => void;
}


const PRIMARY_BLUE = "#023665";
const PRIMARY_ORANGE = "#B90000";
const TEXT_GREY = "#6b7280";
const BG_GREY = "#ECECEC";

interface ReplyFormProps {
  onSubmit: (content: string, images?: File[]) => Promise<void>;
  placeholder: string;
}

const ReplyForm: React.FC<ReplyFormProps> = ({
  onSubmit,
  placeholder,
}) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const { showError } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...images, ...files];
      setImages(newImages);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onSubmit(content.trim(), images.length > 0 ? images : undefined);
      setContent("");
      setImages([]);
      setImagePreviews([]);
    } catch (err) {
      console.error("Error submitting reply:", err);
      showError("Failed to send comment.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box display="flex" gap={{ xs: 1, sm: 1.5 }} alignItems="flex-start">
        <Avatar
          src={user?.avatar}
          sx={{
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            bgcolor: PRIMARY_ORANGE,
            fontSize: { xs: "14px", sm: "16px" },
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          {!user?.avatar && getInitials(user?.name || "U")}
        </Avatar>
        <Box flex={1} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              position: "relative",
              backgroundColor: "#ECECEC",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              transition: "all 0.2s ease",
              "&:focus-within": {
                backgroundColor: "#FFFFFF",
                border: "2px solid #B90000",
                boxShadow: "0 0 0 3px rgba(236, 117, 16, 0.1)",
              },
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder={placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              variant="standard"
              InputProps={{
                disableUnderline: true,
              }}
              sx={{
                "& .MuiInputBase-root": {
                  px: { xs: 1.25, sm: 1.5 },
                  py: { xs: 0.75, sm: 1 },
                  fontSize: { xs: "14px", sm: "15px" },
                  color: PRIMARY_BLUE,
                  "&::placeholder": {
                    color: TEXT_GREY,
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>
          
          {/* Image previews and action buttons */}
          {(imagePreviews.length > 0 || content.trim()) && (
            <Box sx={{ mt: 1.5 }}>
              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <ImageList 
                    sx={{ 
                      width: "100%", 
                      height: "auto",
                      margin: 0,
                    }} 
                    cols={imagePreviews.length === 1 ? 1 : imagePreviews.length === 2 ? 2 : 3} 
                    rowHeight={120}
                    gap={8}
                  >
                    {imagePreviews.map((preview, index) => (
                      <ImageListItem 
                        key={`comment-preview-${index}`}
                        sx={{
                          position: "relative",
                          borderRadius: 1,
                          overflow: "hidden",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          loading="lazy"
                          style={{ 
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <IconButton
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            color: "#FFFFFF",
                            bgcolor: "rgba(0, 0, 0, 0.6)",
                            width: 28,
                            height: 28,
                            "&:hover": {
                              bgcolor: "rgba(0, 0, 0, 0.8)",
                            },
                          }}
                          onClick={() => handleRemoveImage(index)}
                          size="small"
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
              
              {/* Action buttons */}
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="comment-image-upload"
                  type="file"
                  multiple
                  onChange={handleImageChange}
                  disabled={loading}
                />
                <label htmlFor="comment-image-upload">
                  <Button
                    component="span"
                    variant="text"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                    disabled={loading}
                    sx={{
                      textTransform: "none",
                      color: TEXT_GREY,
                      fontSize: "14px",
                      fontWeight: 600,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      "&:hover": {
                        backgroundColor: "#F2F3F5",
                      },
                    }}
                  >
                    Add image
                  </Button>
                </label>
                
                <IconButton
                  type="submit"
                  disabled={loading || !content.trim()}
                  sx={{
                    backgroundColor: PRIMARY_ORANGE,
                    color: "#FFFFFF",
                    width: 36,
                    height: 36,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#166FE5",
                      boxShadow: "0 2px 8px rgba(24, 119, 242, 0.3)",
                      transform: "scale(1.05)",
                    },
                    "&:disabled": {
                      backgroundColor: "#e5e7eb",
                      color: "#BCC0C4",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
                  ) : (
                    <SendIcon sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
              </Box>
            </Box>
          )}
          
          {/* Show image upload button when no content */}
          {!content.trim() && imagePreviews.length === 0 && (
            <Box sx={{ mt: 1 }}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="comment-image-upload-empty"
                type="file"
                multiple
                onChange={handleImageChange}
                disabled={loading}
              />
              <label htmlFor="comment-image-upload-empty">
                <Button
                  component="span"
                  variant="text"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  disabled={loading}
                  sx={{
                    textTransform: "none",
                    color: TEXT_GREY,
                    fontSize: "14px",
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    "&:hover": {
                      backgroundColor: "#F2F3F5",
                    },
                  }}
                >
                  Add image
                </Button>
              </label>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const ThreadDetailView: React.FC<{ threadId: string; initialEditMode?: boolean; onUpdate?: () => void; onEditModeChange?: (isEditMode: boolean) => void }> = ({ threadId, initialEditMode = false, onUpdate, onEditModeChange }) => {
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [existingThreadImages, setExistingThreadImages] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [processingReaction, setProcessingReaction] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isTouchDevice = isMobile || isTablet; // Include iPad/tablet for tap behavior
  const threads = useSelector((state: RootState) => state.forum.threads);
  const currentUser = user?.name || localStorage.getItem("username") || "";
  const currentUserRole = (user?.role || localStorage.getItem("role") || "USER") as
    | "USER"
    | "ADMIN"
    | "admin"
    | "teacher";
  const roleLower = (currentUserRole || "").toLowerCase();
  const isTeacherOrAdmin = roleLower === "teacher" || roleLower === "admin";
  const reactionKey = `thread_reaction_${threadId}_${currentUser}`;

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

  const load = async (forceReload: boolean = false) => {
    try {
      // Get current user ID
      const currentUserId = user?._id || undefined;
      
      let t: ForumThread;
      if (forceReload) {
        // Force reload from server (không dùng cache từ Redux)
        t = await getThread(threadId, undefined, currentUserId);
      } else {
        // Check if thread already exists in Redux store (from ForumListPage)
        const existingThread = threads.find((t) => String(t.threadId) === threadId);
        
        if (existingThread) {
          // Thread exists in store, only fetch comments to get latest
          t = await getThread(threadId, existingThread, currentUserId);
        } else {
          // Thread not in store, fetch everything
          t = await getThread(threadId, undefined, currentUserId);
        }
      }
      
      setThread(t);
      setNewTitle(t.title);
      setNewContent(t.content);
      setExistingThreadImages(t.images || []);


      // Use myReaction from transformed thread
      if (t.myReaction) {
        setMyReaction(t.myReaction);
        localStorage.setItem(reactionKey, t.myReaction);
      } else {
        const stored = localStorage.getItem(reactionKey);
        setMyReaction(stored);
      }
    } catch (error) {
      console.error("Failed to load thread details:", error);
      setThread(null);
    }
  };

  useEffect(() => {
    load();
    setCurrentImageIndex(0); // Reset image index when thread changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Auto enter edit mode if initialEditMode is true and thread is loaded
  useEffect(() => {
    if (initialEditMode && thread && !editMode) {
      setEditMode(true);
      setNewTitle(thread.title);
      setNewContent(thread.content);
      setExistingThreadImages(thread.images || []);
    }
  }, [initialEditMode, thread, editMode]);

  // Notify parent when edit mode changes
  useEffect(() => {
    if (onEditModeChange) {
      onEditModeChange(editMode);
    }
  }, [editMode, onEditModeChange]);

  const handleReactThread = async (newReaction: "like" | "dislike") => {
    if (!thread) return;
    if (processingReaction) return;
    
    setProcessingReaction(true);

    try {
      const threadIdStr = String(thread.threadId);
      const isCurrentlyLiked = thread.reactions.like > 0 && myReaction === "like";
      const isCurrentlyDisliked = thread.reactions.dislike > 0 && myReaction === "dislike";
      
      if ((newReaction === "like" && isCurrentlyLiked) || (newReaction === "dislike" && isCurrentlyDisliked)) {
        // Remove reaction - backend handles toggle
        await reactThread(threadIdStr, newReaction);
        setMyReaction(null);
        localStorage.removeItem(reactionKey);
      } else {
        // Add reaction
        await reactThread(threadIdStr, newReaction);
        setMyReaction(newReaction);
        localStorage.setItem(reactionKey, newReaction);
      }

      // Small delay to ensure backend has updated
      await new Promise(resolve => setTimeout(resolve, 100));
      await load();
    } catch (error) {
      console.error("Failed to react to thread:", error);
      showError("Failed to reply.");
      await load();
    } finally {
      setProcessingReaction(false);
    }
  };




  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...editImages, ...files];
      setEditImages(newImages);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingThreadImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateThread = async () => {
    if (!thread) return;
    setUpdating(true);
    try {
      // Tính toán ảnh cần xóa: ảnh ban đầu - ảnh còn lại
      const originalImages = thread.images || [];
      const remainingImages = existingThreadImages;
      const deletedImages = originalImages.filter(
        (img) => !remainingImages.includes(img)
      );

      await updateThread(String(thread.threadId), {
        content: newContent,
        images: editImages.length > 0 ? editImages : undefined,
        deleteImages: deletedImages.length > 0 ? deletedImages : undefined,
      });
      
      showSuccess("Post updated successfully!");
      setEditMode(false);
      setEditImages([]);
      setEditImagePreviews([]);
      
      // Force reload từ server để lấy data mới nhất (bao gồm URLs ảnh mới)
      await load(true);
      
      // Notify parent to reload list
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: unknown) {
      console.error("Update failed:", error);
      showError("Unable to update post. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Xóa bài — tác giả hoặc admin/teacher được xóa
  const handleDeleteThread = async () => {
    if (!thread) return;
    const isAuthor = thread.author === currentUser || thread.author === user?.email || user?.email === thread.author || user?._id === thread.createdBy;
    if (!isAuthor && !isTeacherOrAdmin) {
      showError("You don't have permission to delete this post.");
      return;
    }
    try {
      await deleteThread(String(thread.threadId));
      showSuccess("Post deleted successfully.");
      const windowWithCallback = window as WindowWithCallback;
      if (windowWithCallback.onThreadDeleted) {
        windowWithCallback.onThreadDeleted();
      } else if (typeof navigate === 'function') {
        // Don't navigate, just close modal via callback
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (err: unknown) {
      console.error("Failed to delete thread:", err);
      const error = err as { message?: string };
      const errorMessage = error?.message || "Failed to delete post. This feature is not yet supported.";
      showError(errorMessage);
    }
  };

  if (!thread)
    return <Box sx={{ p: 4, textAlign: "center" }}>Loading post details...</Box>;

  const isAuthor = thread ? (thread.author === currentUser || thread.author === user?.email || user?.email === thread.author || user?._id === thread.createdBy) : false;
  
  return (
    <Box sx={{ 
      backgroundColor: BG_GREY, 
      width: "100%",
      mb: 0,
      pb: 0,
      marginBottom: 0,
      paddingBottom: 0,
      minHeight: "auto",
    }}>
      <Card
        sx={{
          mb: 0,
          mt: 0,
          borderRadius: 0,
          backgroundColor: "#FFFFFF",
          boxShadow: "none",
          marginBottom: 0,
          marginTop: 0,
          "& .MuiCardContent-root": {
            pb: 0,
            paddingBottom: 0,
            "&:last-child": {
              pb: 0,
              paddingBottom: 0,
            },
          },
        }}
      >
        <CardContent sx={{ p: 0, pb: 0, paddingBottom: 0, "&:last-child": { pb: 0, paddingBottom: 0 } }}>
          {editMode ? (
            <Box sx={{ p: 2.5 }}>
              <TextField
                fullWidth
                variant="outlined"
                label="Title"
                value={newTitle}
                disabled
                helperText="Title cannot be edited"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={4}
                variant="outlined"
                label="Content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              {/* Image upload button */}
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="edit-thread-image-upload"
                  type="file"
                  multiple
                  onChange={handleImageChange}
                  disabled={updating}
                />
                <label htmlFor="edit-thread-image-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    disabled={updating}
                    sx={{ mb: 1, textTransform: "none" }}
                  >
                    Add image
                  </Button>
                </label>
                
                {/* Combined images: existing + new previews */}
                {(existingThreadImages.length > 0 || editImagePreviews.length > 0) && (
                  <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                    {/* Existing images */}
                    {existingThreadImages.map((imageUrl, index) => (
                      <ImageListItem key={`existing-thread-${index}`}>
                        <img
                          src={imageUrl}
                          alt={`Existing ${index + 1}`}
                          loading="lazy"
                          style={{ objectFit: "cover" }}
                        />
                        <IconButton
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            color: "white",
                            bgcolor: "rgba(0,0,0,0.5)",
                          }}
                          onClick={() => handleRemoveExistingImage(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ImageListItem>
                    ))}
                    {/* New image previews */}
                    {editImagePreviews.map((preview, index) => (
                      <ImageListItem key={`new-thread-${index}`}>
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          loading="lazy"
                          style={{ objectFit: "cover" }}
                        />
                        <IconButton
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            color: "white",
                            bgcolor: "rgba(0,0,0,0.5)",
                          }}
                          onClick={() => handleRemoveImage(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ImageListItem>
                    ))}
                  </ImageList>
                )}
              </Box>
              
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: PRIMARY_ORANGE,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    transition: "all 0.2s ease",
                    "&:hover": { 
                      backgroundColor: "#166FE5",
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 8px rgba(24, 119, 242, 0.3)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                  onClick={handleUpdateThread}
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save changes"}
                </Button>
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  onClick={() => {
                    setEditMode(false);
                    setEditImages([]);
                    setEditImagePreviews([]);
                    setExistingThreadImages(thread?.images || []);
                  }}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#F2F3F5",
                    },
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              {/* Header với avatar */}
              <Box sx={{ p: 2.5, pb: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                  <Avatar
                    src={thread.authorAvatar}
                    sx={{
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      bgcolor: PRIMARY_ORANGE,
                      fontSize: { xs: "16px", sm: "18px" },
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "transform 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    {!thread.authorAvatar && getInitials(thread.author || "User")}
                  </Avatar>
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color: PRIMARY_BLUE,
                          fontSize: { xs: "14px", sm: "15px" },
                          cursor: "pointer",
                          transition: "color 0.2s ease",
                          "&:hover": {
                            color: PRIMARY_ORANGE,
                            textDecoration: "underline",
                          },
                        }}
                      >
                        {thread.author || "Người dùng"}
                      </Typography>
                      {thread.pinned && (
                        <Tooltip title="Post is pinned">
                          <PushPinIcon sx={{ color: PRIMARY_ORANGE, fontSize: { xs: 14, sm: 16 }, ml: 0.5 }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: TEXT_GREY,
                        fontSize: { xs: "12px", sm: "13px" },
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      {formatTime(thread.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {isTeacherOrAdmin && (
                    <Tooltip title={thread.pinned ? "Unpin" : "Pin post"}>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            if (thread.pinned) {
                              await unpinPost(String(thread.threadId));
                            } else {
                              await pinPost(String(thread.threadId));
                            }
                            await load();
                          } catch (err) {
                            console.error("Error pinning/unpinning:", err);
                            showError("Operation failed");
                          }
                        }}
                        sx={{ 
                          p: { xs: 0.5, sm: 0.75 },
                          transition: "background-color 0.2s ease",
                          "&:hover": {
                            backgroundColor: "#fff5e6",
                          },
                        }}
                      >
                        {thread.pinned ? (
                          <PushPinIcon sx={{ color: PRIMARY_ORANGE, fontSize: { xs: 18, sm: 20 } }} />
                        ) : (
                          <PushPinOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: TEXT_GREY }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                  {(isAuthor || isTeacherOrAdmin) && (
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchor(e.currentTarget)}
                      sx={{ 
                        p: { xs: 0.5, sm: 0.75 },
                        transition: "background-color 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#F2F3F5",
                        },
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: TEXT_GREY }} />
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
                {(isAuthor || isTeacherOrAdmin) && (
                  <MenuItem onClick={() => { 
                    setMenuAnchor(null); 
                    setNewTitle(thread.title); 
                    setNewContent(thread.content);
                    setEditImages([]);
                    setEditImagePreviews([]);
                    setExistingThreadImages(thread.images || []);
                    setEditMode(true); 
                  }}>
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                  </MenuItem>
                )}
                {(isAuthor || isTeacherOrAdmin) && (
                  <MenuItem onClick={() => { setMenuAnchor(null); handleDeleteThread(); }}>
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Delete post
                  </MenuItem>
                )}
              </Menu>

              {/* Title */}
              {thread.title && (
                <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 1, sm: 1.5 } }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: PRIMARY_BLUE,
                      fontSize: { xs: "16px", sm: "17px" },
                      lineHeight: 1.4,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {thread.title}
                  </Typography>
                </Box>
              )}

              {/* Content */}
              <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 1.5, sm: 2 } }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: PRIMARY_BLUE,
                    fontSize: { xs: "14px", sm: "15px" },
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    letterSpacing: "0.01em",
                    ...(!isContentExpanded && {
                      display: "-webkit-box",
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }),
                  }}
                >
                  {thread.content}
                </Typography>
                {thread.content && thread.content.length > 200 && (
                  <Button
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    sx={{
                      mt: 1,
                      p: 0,
                      minWidth: "auto",
                      textTransform: "none",
                      color: TEXT_GREY,
                      fontSize: { xs: "14px", sm: "15px" },
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "transparent",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {isContentExpanded ? "Thu gọn" : "Xem thêm"}
                  </Button>
                )}
              </Box>

              {/* Display images with carousel */}
              {thread.images && thread.images.length > 0 && (
                <Box sx={{ width: "100%", mb: 2, px: 0.5, position: "relative" }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      maxHeight: 500,
                      overflow: "hidden",
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={thread.images[currentImageIndex]}
                      alt={`Image ${currentImageIndex + 1}`}
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: 500,
                        display: "block",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(thread.images![currentImageIndex], "_blank")}
                    />
                    
                    {thread.images.length > 1 && (
                      <>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === 0 ? (thread.images?.length || 1) - 1 : prev - 1
                            );
                          }}
                          sx={{
                            position: "absolute",
                            left: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            "&:hover": {
                              backgroundColor: "rgba(255, 255, 255, 1)",
                            },
                            zIndex: 1,
                          }}
                        >
                          <ChevronLeftIcon />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === (thread.images?.length || 1) - 1 ? 0 : prev + 1
                            );
                          }}
                          sx={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            "&:hover": {
                              backgroundColor: "rgba(255, 255, 255, 1)",
                            },
                            zIndex: 1,
                          }}
                        >
                          <ChevronRightIcon />
                        </IconButton>
                        
                        {/* Image indicators */}
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 8,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: 0.5,
                            zIndex: 1,
                          }}
                        >
                          {thread.images.map((_, idx) => (
                            <Box
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(idx);
                              }}
                              sx={{
                                width: currentImageIndex === idx ? 24 : 8,
                                height: 8,
                                borderRadius: 1,
                                backgroundColor: currentImageIndex === idx 
                                  ? "#FFFFFF" 
                                  : "rgba(255, 255, 255, 0.5)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              )}

              {/* Stats bar */}
              {(thread.reactions.like > 0 || thread.reactions.dislike > 0 || thread.replies.length > 0) && (
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #E4E6EB",
                    borderBottom: "1px solid #E4E6EB",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    {thread.reactions.like > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: "pointer" }}>
                        <ThumbUpIcon sx={{ fontSize: 18, color: PRIMARY_ORANGE }} />
                        <Typography variant="caption" sx={{ color: TEXT_GREY, fontSize: "13px", fontWeight: 500 }}>
                          {thread.reactions.like}
                        </Typography>
                      </Box>
                    )}
                    {thread.reactions.dislike > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: "pointer" }}>
                        <ThumbDownIcon sx={{ fontSize: 18, color: "#F02849" }} />
                        <Typography variant="caption" sx={{ color: TEXT_GREY, fontSize: "13px", fontWeight: 500 }}>
                          {thread.reactions.dislike}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {thread.replies.length > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: TEXT_GREY, 
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {thread.replies.length} comment{thread.replies.length !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Action buttons */}
              <Box
                sx={{
                  px: 0.5,
                  py: 0.5,
                  display: "flex",
                  borderTop: "1px solid #E4E6EB",
                  mb: 0,
                  pb: 0,
                  paddingBottom: 0,
                }}
              >
                <Box
                  sx={{ position: "relative", flex: 1 }}
                  onMouseEnter={(e) => {
                    // Only show popover on desktop (non-touch devices)
                    if (!isTouchDevice) {
                      setEmojiAnchor(e.currentTarget);
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
                      myReaction === "like" ? <ThumbUpIcon /> : 
                      myReaction === "dislike" ? <ThumbDownIcon /> : 
                      <ThumbUpOutlinedIcon />
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      // On mobile/tablet (touch devices), toggle popover; on desktop, just handle reaction
                      if (isTouchDevice) {
                        if (emojiAnchor === e.currentTarget) {
                          setEmojiAnchor(null);
                        } else {
                          setEmojiAnchor(e.currentTarget);
                        }
                      } else {
                        if (myReaction === "dislike") {
                          handleReactThread("dislike");
                        } else {
                          handleReactThread("like");
                        }
                      }
                    }}
                    disabled={processingReaction}
                    sx={{
                      color: myReaction === "like" ? PRIMARY_ORANGE : 
                             myReaction === "dislike" ? "#dc2626" : 
                             TEXT_GREY,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "15px",
                      borderRadius: 1,
                      "&:hover": {
                        backgroundColor: "#F2F3F5",
                      },
                    }}
                  >
                    {myReaction === "dislike" ? "Dislike" : "Like"}
                  </Button>
                  <ReactionPopover
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    onLike={() => handleReactThread("like")}
                    onDislike={() => handleReactThread("dislike")}
                    zIndex={1300}
                    isMobile={isTouchDevice}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Button
                    fullWidth
                    startIcon={<CommentOutlinedIcon />}
                    disabled
                    sx={{
                      color: TEXT_GREY,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "15px",
                      borderRadius: 1,
                      "&:hover": {
                        backgroundColor: "#F2F3F5",
                      },
                    }}
                  >
                    Comment
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <ToastComponent />
    </Box>
  );
};

// Wrapper component for modal
export const ThreadDetailModalContent: React.FC<{ threadId: string; onClose: () => void; initialEditMode?: boolean; onUpdate?: () => void }> = ({ threadId, onClose, initialEditMode = false, onUpdate }) => {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const user = useSelector((state: RootState) => state.auth.user);
  const { showSuccess, showError } = useToast();

  React.useEffect(() => {
    interface WindowWithCallback extends Window {
      onThreadDeleted?: () => void;
    }
    const windowWithCallback = window as WindowWithCallback;
    windowWithCallback.onThreadDeleted = onClose;
    return () => {
      const windowWithCallback = window as WindowWithCallback;
      delete windowWithCallback.onThreadDeleted;
    };
  }, [onClose]);

  React.useEffect(() => {
    setIsEditMode(initialEditMode);
  }, [initialEditMode]);

  React.useEffect(() => {
    const loadComments = async () => {
      try {
        console.log("Loading comments for threadId:", threadId);
        const commentsData = await getThreadComments(String(threadId));
        console.log("Loaded comments:", commentsData);
        setComments(commentsData || []);
      } catch (error) {
        console.error("Failed to load comments:", error);
        setComments([]);
      }
    };
    if (threadId && !isEditMode) {
      loadComments();
    }
  }, [threadId, isEditMode]);

  const handleAddComment = async (content: string, images?: File[]) => {
    try {
      await createComment(String(threadId), { content, images });
      const commentsData = await getThreadComments(String(threadId));
      setComments(commentsData);
      showSuccess("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
      showError("Failed to add comment");
      throw error;
    }
  };

  const handleCommentUpdated = async () => {
    const commentsData = await getThreadComments(String(threadId));
    setComments(commentsData);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", mb: 0, pb: 0, marginBottom: 0, paddingBottom: 0, minHeight: 0 }}>
        <Box sx={{ mb: 0, pb: 0, mt: 0, pt: 0, marginBottom: 0, paddingBottom: 0, marginTop: 0, paddingTop: 0, display: "block", minHeight: "auto" }}>
          <ThreadDetailView threadId={threadId} initialEditMode={initialEditMode} onUpdate={onUpdate} onEditModeChange={setIsEditMode} />
        </Box>
        {/* Comments Section - scrollable with post content - Hide when in edit mode */}
        {!isEditMode && (
          <Card
            sx={{
              mb: 0,
              borderRadius: 0,
              backgroundColor: "#FFFFFF",
              boxShadow: "none",
              mt: 0,
              pt: 0,
              marginTop: 0,
              paddingTop: 0,
              "& .MuiCardContent-root": {
                pt: 0,
                paddingTop: 0,
                "&:first-of-type": {
                  pt: 0,
                  paddingTop: 0,
                },
              },
            }}
          >
            <CardContent sx={{ p: 2.5, pt: 0, pb: 1, paddingTop: 0, marginTop: 0, "&:last-child": { pb: 1 }, "&:first-of-type": { pt: 0, paddingTop: 0 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: PRIMARY_BLUE, 
                  mb: 1.5, 
                  fontSize: "17px",
                  letterSpacing: "-0.01em",
                }}
              >
                {comments.length} Comment{comments.length !== 1 ? 's' : ''}
              </Typography>

              {comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    onCommentUpdated={handleCommentUpdated}
                    currentUserId={user?._id}
                  />
                ))
              ) : (
                <Typography sx={{ color: TEXT_GREY, textAlign: "center", py: 2 }}>
                  No comments yet
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
      {/* Fixed Comment Form at bottom - Hide when in edit mode */}
      {!isEditMode && (
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #E4E6EB",
            px: 2,
            py: 1.5,
            zIndex: 10,
            boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <ReplyForm onSubmit={handleAddComment} placeholder="Write a comment..." />
        </Box>
      )}
    </Box>
  );
};

export default ThreadDetailView;
