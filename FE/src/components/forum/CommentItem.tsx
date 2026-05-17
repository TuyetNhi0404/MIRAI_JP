import React, { useEffect, useState } from "react";
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  ImageList,
  ImageListItem,
  IconButton,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ReplyIcon from "@mui/icons-material/Reply";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import type { ForumComment, ForumReplyBackend } from "../../types/forum.type";

// Type helper for ID that can be string or object with _id
type UserIdLike = string | { _id: string } | { _id?: string };

// Helper function to normalize ID to string
function normalizeId(id: UserIdLike): string {
  if (typeof id === 'object' && id !== null) {
    return id._id ? String(id._id) : String(id);
  }
  return String(id);
}
import { useToast } from "../../hooks/useToast";
import {
  getRepliesToComment,
  createReplyToComment,
  likeReplyToComment,
  dislikeReplyToComment,
  updateReplyToComment,
  deleteReplyToComment,
  reactReply,
  editReply,
  deleteComment,
} from "../../services/forum.service";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

const PRIMARY_BLUE = "#023665";
const PRIMARY_ORANGE = "#B90000";
const TEXT_GREY = "#6b7280";

const getInitials = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : "U";
};

interface CommentItemProps {
  comment: ForumComment;
  onCommentUpdated?: () => void;
  currentUserId?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onCommentUpdated,
  currentUserId,
}) => {
  const [replies, setReplies] = useState<ForumReplyBackend[]>([]);
  const [showReplies, setShowReplies] = useState(false); // Ban đầu ẩn replies
  const [showAllReplies, setShowAllReplies] = useState(false); // Hiển thị tất cả hay chỉ một vài
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyImages, setReplyImages] = useState<File[]>([]);
  const [replyImagePreviews, setReplyImagePreviews] = useState<string[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const INITIAL_REPLIES_TO_SHOW = 2; // Số replies hiển thị ban đầu
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [existingCommentImages, setExistingCommentImages] = useState<string[]>(comment.images || []);
  // Local state để hiển thị content và images đã update (trước khi parent reload)
  const [displayContent, setDisplayContent] = useState(comment.content);
  const [displayImages, setDisplayImages] = useState<string[]>(comment.images || []);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // State for editing reply
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState<string>("");
  const [editReplyImages, setEditReplyImages] = useState<File[]>([]);
  const [editReplyImagePreviews, setEditReplyImagePreviews] = useState<string[]>([]);
  const [existingReplyImages, setExistingReplyImages] = useState<{ [key: string]: string[] }>({});
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(null);
  const [processingReaction, setProcessingReaction] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [dislikeCount, setDislikeCount] = useState(comment.dislikes?.length || 0);
  const { showError, showSuccess, ToastComponent } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);

  const commentAuthor = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.name : 'Unknown';
  const commentAuthorId = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId._id : comment.authorId;
  const commentAuthorAvatar = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.avatar : undefined;
  const isOwner = currentUserId && String(commentAuthorId) === String(currentUserId);
  const isAdmin = user?.role === "admin" || user?.role === "teacher";

  // Initialize reaction state
  useEffect(() => {
    if (currentUserId) {
      const likes = comment.likes || [];
      const dislikes = comment.dislikes || [];
      const userIdStr = String(currentUserId);
      
      if (dislikes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
        setMyReaction("dislike");
      } else if (likes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
        setMyReaction("like");
      } else {
        setMyReaction(null);
      }
    }
  }, [comment, currentUserId]);

  // Auto-load replies when component mounts
  useEffect(() => {
    loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment._id]);

  // Tính toán replies để hiển thị
  const displayedReplies = showAllReplies 
    ? replies 
    : replies.slice(0, INITIAL_REPLIES_TO_SHOW);
  const hasMoreReplies = replies.length > INITIAL_REPLIES_TO_SHOW;

  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const repliesData = await getRepliesToComment(comment._id);
      setReplies(repliesData);
    } catch (err) {
      console.error("Failed to load replies:", err);
      showError("Không thể tải phản hồi");
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleNewReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...replyImages, ...files];
      setReplyImages(newImages);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReplyImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveNewReplyImage = (index: number) => {
    setReplyImages((prev) => prev.filter((_, i) => i !== index));
    setReplyImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      await createReplyToComment(comment._id, { 
        content: replyContent.trim(),
        images: replyImages.length > 0 ? replyImages : undefined,
      });
      setReplyContent("");
      setReplyImages([]);
      setReplyImagePreviews([]);
      setIsReplying(false);
      showSuccess("Reply sent");
      // Reload replies
      await loadReplies();
      if (onCommentUpdated) onCommentUpdated();
    } catch (err) {
      console.error("Failed to submit reply:", err);
      showError("Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReact = async (type: "like" | "dislike") => {
    if (processingReaction) return;
    setProcessingReaction(true);
    
    const prevReaction = myReaction;
    const prevLikeCount = likeCount;
    const prevDislikeCount = dislikeCount;

    // Optimistic update
    if (prevReaction === type) {
      // Remove reaction
      setMyReaction(null);
      if (type === "like") setLikeCount(Math.max(0, likeCount - 1));
      else setDislikeCount(Math.max(0, dislikeCount - 1));
    } else {
      // Switch reaction
      if (prevReaction === "like") setLikeCount(Math.max(0, likeCount - 1));
      if (prevReaction === "dislike") setDislikeCount(Math.max(0, dislikeCount - 1));
      setMyReaction(type);
      if (type === "like") setLikeCount(likeCount + 1);
      else setDislikeCount(dislikeCount + 1);
    }

    try {
      await reactReply("", comment._id, type);
      if (onCommentUpdated) onCommentUpdated();
    } catch (err) {
      // Rollback
      setMyReaction(prevReaction);
      setLikeCount(prevLikeCount);
      setDislikeCount(prevDislikeCount);
      console.error("Failed to react:", err);
      showError("Operation failed");
    } finally {
      setProcessingReaction(false);
    }
  };

  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveCommentImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingCommentImage = (index: number) => {
    setExistingCommentImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || (editContent === comment.content && editImages.length === 0 && existingCommentImages.length === (comment.images?.length || 0))) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      // Tính toán ảnh cần xóa: ảnh ban đầu - ảnh còn lại
      const originalImages = comment.images || [];
      const remainingImages = existingCommentImages;
      const deletedImages = originalImages.filter(
        (img) => !remainingImages.includes(img)
      );

      const response = await editReply("", comment._id, editContent.trim(), editImages.length > 0 ? editImages : undefined, deletedImages.length > 0 ? deletedImages : undefined);
      
      // Cập nhật state ngay lập tức với data từ server
      // Response structure: { message: "...", data: existingComment }
      const updatedComment = response?.data?.data || response?.data;
      if (updatedComment) {
        const updatedImages = Array.isArray(updatedComment.images) 
          ? updatedComment.images 
          : updatedComment.images 
            ? [updatedComment.images] 
            : [];
        
        // Cập nhật display state ngay lập tức để hiển thị thay đổi
        setDisplayContent(updatedComment.content || editContent.trim());
        setDisplayImages(updatedImages);
        setExistingCommentImages(updatedImages);
      } else {
        // Fallback: cập nhật với data local
        setDisplayContent(editContent.trim());
        setDisplayImages(existingCommentImages);
      }
      
      setIsEditing(false);
      setEditImages([]);
      setEditImagePreviews([]);
      showSuccess("Comment updated");
      
      // Notify parent để reload comments và cập nhật UI (chạy ngầm)
      if (onCommentUpdated) {
        // Chạy ngầm để không block UI
        setTimeout(() => {
          onCommentUpdated();
        }, 100);
      }
    } catch (error) {
      console.error("Lưu thất bại:", error);
      showError("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await deleteComment(comment._id);
      showSuccess("Comment deleted");
      if (onCommentUpdated) onCommentUpdated();
    } catch (error) {
      console.error("Xóa thất bại:", error);
      showError("Failed to delete comment");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyReact = async (replyId: string, type: "like" | "dislike") => {
    try {
      if (type === "like") {
        await likeReplyToComment(replyId);
      } else {
        await dislikeReplyToComment(replyId);
      }
      await loadReplies();
    } catch (err) {
      console.error("Failed to react to reply:", err);
      showError("Operation failed");
    }
  };

  const handleReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>, _replyId: string) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...editReplyImages, ...files];
      setEditReplyImages(newImages);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditReplyImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveExistingReplyImage = (replyId: string, index: number) => {
    setExistingReplyImages((prev) => ({
      ...prev,
      [replyId]: (prev[replyId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleStartReplyEdit = (reply: ForumReplyBackend) => {
    setEditingReplyId(reply._id);
    setEditReplyContent(reply.content);
    setEditReplyImages([]);
    setEditReplyImagePreviews([]);
    setExistingReplyImages({ [reply._id]: reply.images || [] });
  };

  const handleCancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditReplyContent("");
    setEditReplyImages([]);
    setEditReplyImagePreviews([]);
    setExistingReplyImages({});
  };

  const handleSaveReplyEdit = async (replyId: string) => {
    if (!editReplyContent.trim()) {
      handleCancelReplyEdit();
      return;
    }
    setLoading(true);
    try {
      // Tính toán ảnh cần xóa: ảnh ban đầu - ảnh còn lại
      const reply = replies.find(r => r._id === replyId);
      const originalImages = reply?.images || [];
      const remainingImages = existingReplyImages[replyId] || [];
      const deletedImages = originalImages.filter(
        (img) => !remainingImages.includes(img)
      );

      const response = await updateReplyToComment(replyId, editReplyContent.trim(), editReplyImages.length > 0 ? editReplyImages : undefined, deletedImages.length > 0 ? deletedImages : undefined);
      
      // Cập nhật state ngay lập tức với data từ server
      // Response structure: { message: "...", data: existingReply }
      const updatedReply = response?.data?.data || response?.data;
      if (updatedReply) {
        const updatedImages = Array.isArray(updatedReply.images) 
          ? updatedReply.images 
          : updatedReply.images 
            ? [updatedReply.images] 
            : [];
        
        // Cập nhật reply trong state ngay lập tức
        setReplies(prevReplies => 
          prevReplies.map(r => 
            r._id === replyId 
              ? { 
                  ...r, 
                  content: updatedReply.content || editReplyContent.trim(),
                  images: updatedImages
                }
              : r
          )
        );
      }
      
      showSuccess("Reply updated");
      handleCancelReplyEdit();
      
      // Reload từ server để đảm bảo đồng bộ (chạy ngầm)
      loadReplies().catch(err => console.error("Background reload failed:", err));
    } catch (err) {
      console.error("Failed to edit reply:", err);
      showError("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyDelete = async (replyId: string) => {
    try {
      await deleteReplyToComment(replyId);
      showSuccess("Reply deleted");
      await loadReplies();
    } catch (err) {
      console.error("Failed to delete reply:", err);
      showError("Delete failed");
    }
  };

  return (
    <Box
      sx={{
        py: 1,
        borderBottom: "1px solid #e5e7eb",
        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1 }}>
        <ListItemAvatar sx={{ minWidth: 40, mr: 1 }}>
          <Avatar 
            src={commentAuthorAvatar}
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: PRIMARY_ORANGE,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {!commentAuthorAvatar && getInitials(commentAuthor)}
          </Avatar>
        </ListItemAvatar>

        <ListItemText
          sx={{ my: 0 }}
          primary={
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: PRIMARY_BLUE,
                  fontSize: "15px",
                }}
              >
                {commentAuthor}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: TEXT_GREY,
                  fontSize: "12px",
                }}
              >
                {new Date(comment.createdAt || new Date()).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Typography>
            </Box>
          }
          disableTypography
          secondary={
            isEditing ? (
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
                sx={{ mt: 1 }}
              >
                <TextField
                  fullWidth
                  multiline
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={loading}
                  sx={{ my: 1 }}
                />
                
                {/* Image upload button */}
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="edit-comment-image-upload"
                    type="file"
                    multiple
                    onChange={handleCommentImageChange}
                    disabled={loading}
                  />
                  <label htmlFor="edit-comment-image-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      disabled={loading}
                      sx={{ mb: 1, textTransform: "none" }}
                    >
                      Add image
                    </Button>
                  </label>
                  
                  {/* Combined images: existing + new previews */}
                  {(existingCommentImages.length > 0 || editImagePreviews.length > 0) && (
                    <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                      {/* Existing images */}
                      {existingCommentImages.map((imageUrl, index) => (
                        <ImageListItem key={`existing-comment-${index}`}>
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
                            onClick={() => handleRemoveExistingCommentImage(index)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ImageListItem>
                      ))}
                      {/* New image previews */}
                      {editImagePreviews.map((preview, index) => (
                        <ImageListItem key={`new-comment-${index}`}>
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
                            onClick={() => handleRemoveCommentImage(index)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ImageListItem>
                      ))}
                    </ImageList>
                  )}
                </Box>
                
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                      setEditImages([]);
                      setEditImagePreviews([]);
                      setExistingCommentImages(comment.images || []);
                    }}
                    disabled={loading}
                    sx={{ textTransform: "none" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    type="submit"
                    sx={{ 
                      backgroundColor: PRIMARY_ORANGE,
                      textTransform: "none",
                    }}
                    disabled={loading || !editContent.trim()}
                  >
                    {loading ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Save"}
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Box
                  component="div"
                sx={{ 
                  whiteSpace: "pre-wrap",
                  color: PRIMARY_BLUE,
                  fontSize: "15px",
                  lineHeight: 1.5,
                  mt: 0.5,
                }}
              >
                {displayContent}
                </Box>
                {displayImages && displayImages.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                      {displayImages.map((imageUrl, index) => (
                        <ImageListItem key={`comment-image-${index}`}>
                          <img
                            src={imageUrl}
                            alt={`Comment image ${index + 1}`}
                            loading="lazy"
                            style={{ objectFit: "cover" }}
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </>
            )
          }
        />
      </ListItem>

      {!isEditing && (
        <Box 
          mt={1.5} 
          ml={6.5} 
          display="flex" 
          gap={0.5} 
          alignItems="center" 
          flexWrap="wrap"
        >
          <Button
            size="small"
            onClick={() => handleReact("like")}
            disabled={processingReaction}
            startIcon={myReaction === "like" ? <ThumbUpIcon sx={{ fontSize: 18 }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{ 
              color: myReaction === "like" ? PRIMARY_ORANGE : TEXT_GREY,
              minWidth: "auto",
              textTransform: "none",
              fontSize: "13px",
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: myReaction === "like" ? "rgba(24, 119, 242, 0.1)" : "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            {likeCount > 0 && likeCount}
          </Button>
          <Button
            size="small"
            onClick={() => handleReact("dislike")}
            disabled={processingReaction}
            startIcon={myReaction === "dislike" ? <ThumbDownIcon sx={{ fontSize: 18 }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{ 
              color: myReaction === "dislike" ? "#dc2626" : TEXT_GREY,
              minWidth: "auto",
              textTransform: "none",
              fontSize: "13px",
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: myReaction === "dislike" ? "rgba(240, 40, 73, 0.1)" : "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            {dislikeCount > 0 && dislikeCount}
          </Button>
          <Button
            size="small"
            onClick={() => setIsReplying(!isReplying)}
            startIcon={<ReplyIcon sx={{ fontSize: 18 }} />}
            sx={{ 
              color: PRIMARY_ORANGE, 
              minWidth: "auto",
              textTransform: "none",
              fontSize: "13px",
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "rgba(24, 119, 242, 0.1)",
              },
            }}
          >
            Reply
          </Button>
          {isOwner && (
            <Button 
              size="small" 
              onClick={() => {
                setIsEditing(true);
                setEditContent(comment.content);
                setEditImages([]);
                setEditImagePreviews([]);
                setExistingCommentImages(comment.images || []);
              }} 
              sx={{ 
                color: PRIMARY_ORANGE, 
                minWidth: "auto",
                textTransform: "none",
                fontSize: "13px",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "rgba(24, 119, 242, 0.1)",
                },
              }}
            >
              Edit
            </Button>
          )}
          {(isOwner || isAdmin) && (
            <Button 
              size="small" 
              onClick={() => setConfirmOpen(true)} 
              sx={{ 
                color: "#dc2626", 
                minWidth: "auto",
                textTransform: "none",
                fontSize: "13px",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "rgba(240, 40, 73, 0.1)",
                },
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      )}

      {/* Replies section with connection line */}
      <Box sx={{ position: "relative", ml: 6.5, mt: 1 }}>
        {/* Vertical connection line - chỉ kéo dài đến reply cuối cùng khi đã mở */}
        {showReplies && displayedReplies.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              left: "-20px", // Nối thẳng với avatar center
              top: 0,
              // Chỉ kéo đến reply cuối cùng đang hiển thị
              height: `${displayedReplies.length * 92}px`,
              width: "2px",
              backgroundColor: "#E4E6EB",
              zIndex: 0,
              borderRadius: "1px",
            }}
          />
        )}

        {/* Button "Xem phản hồi" khi chưa mở */}
        {!showReplies && replies.length > 0 && (
          <Box ml={2} mt={1}>
            <Button
              size="small"
              onClick={() => {
                setShowReplies(true);
                setShowAllReplies(replies.length <= INITIAL_REPLIES_TO_SHOW);
              }}
              sx={{
                color: PRIMARY_ORANGE,
                textTransform: "none",
                fontSize: "13px",
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                "&:hover": {
                  backgroundColor: "rgba(24, 119, 242, 0.1)",
                },
              }}
            >
              View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </Button>
          </Box>
        )}

        {/* Replies list khi đã mở */}
        {showReplies && (
          <Box sx={{ position: "relative", zIndex: 1 }}>
            {loadingReplies ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : displayedReplies.length > 0 ? (
              <>
                {displayedReplies.map((reply) => {
              const replyAuthor = typeof reply.authorId === 'object' && reply.authorId ? reply.authorId.name : 'Unknown';
              const replyAuthorAvatar = typeof reply.authorId === 'object' && reply.authorId ? reply.authorId.avatar : undefined;
              const replyAuthorId = typeof reply.authorId === 'object' && reply.authorId ? reply.authorId._id : reply.authorId;
              const isReplyOwner = currentUserId && String(replyAuthorId) === String(currentUserId);
              const replyLikes = reply.likes?.length || 0;
              const replyDislikes = reply.dislikes?.length || 0;
              const replyMyReaction = currentUserId && (
                reply.dislikes?.some((id: UserIdLike) => normalizeId(id) === String(currentUserId)) ? "dislike" :
                reply.likes?.some((id: UserIdLike) => normalizeId(id) === String(currentUserId)) ? "like" : null
              );

              return (
                <Box
                  key={reply._id}
                  sx={{
                    position: "relative",
                    mb: 1.5,
                  }}
                >
                  {/* Connection line với đường cong mượt - dùng SVG */}
                  <Box
                    sx={{
                      position: "absolute",
                      left: "-20px",
                      top: 0,
                      width: "20px",
                      height: "18px",
                      zIndex: 2,
                    }}
                  >
                    <svg
                      width="20"
                      height="18"
                      style={{ position: "absolute", top: 0, left: 0 }}
                    >
                      {/* Đường dọc */}
                      <line
                        x1="1"
                        y1="0"
                        x2="1"
                        y2="14"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      {/* Đường cong - dùng quadratic curve */}
                      <path
                        d="M 1 14 Q 1 18 5 18 L 12 18"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      pl: 2,
                      backgroundColor: "transparent",
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Avatar
                      src={replyAuthorAvatar}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: PRIMARY_ORANGE,
                        flexShrink: 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      {!replyAuthorAvatar && getInitials(replyAuthor)}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 600, 
                            display: "block", 
                            color: PRIMARY_BLUE,
                            fontSize: "14px",
                          }}
                        >
                          {replyAuthor}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: TEXT_GREY, 
                            fontSize: "12px",
                          }}
                        >
                          {new Date(reply.createdAt || new Date()).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </Typography>
                      </Box>
                      {editingReplyId === reply._id ? (
                        <Box
                          component="form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveReplyEdit(reply._id);
                          }}
                          sx={{ mt: 1 }}
                        >
                          <TextField
                            fullWidth
                            multiline
                            value={editReplyContent}
                            onChange={(e) => setEditReplyContent(e.target.value)}
                            variant="outlined"
                            size="small"
                            disabled={loading}
                            sx={{ mb: 1 }}
                          />
                          
                          {/* Image upload button */}
                          <Box sx={{ mb: 2 }}>
                            <input
                              accept="image/*"
                              style={{ display: "none" }}
                              id={`edit-reply-image-upload-${reply._id}`}
                              type="file"
                              multiple
                              onChange={(e) => handleReplyImageChange(e, reply._id)}
                              disabled={loading}
                            />
                            <label htmlFor={`edit-reply-image-upload-${reply._id}`}>
                              <Button
                                component="span"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                disabled={loading}
                                sx={{ mb: 1, textTransform: "none" }}
                              >
                                Add image
                              </Button>
                            </label>
                            
                            {/* Combined images: existing + new previews */}
                            {((existingReplyImages[reply._id] && existingReplyImages[reply._id].length > 0) || editReplyImagePreviews.length > 0) && (
                              <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                                {/* Existing reply images */}
                                {existingReplyImages[reply._id] && existingReplyImages[reply._id].map((imageUrl, index) => (
                                  <ImageListItem key={`existing-reply-${index}`}>
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
                                      onClick={() => handleRemoveExistingReplyImage(reply._id, index)}
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </ImageListItem>
                                ))}
                                {/* New reply image previews */}
                                {editReplyImagePreviews.map((preview, index) => (
                                  <ImageListItem key={`new-reply-${index}`}>
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
                                      onClick={() => handleRemoveNewReplyImage(index)}
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </ImageListItem>
                                ))}
                              </ImageList>
                            )}
                          </Box>
                          
                          <Box display="flex" justifyContent="flex-end" gap={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleCancelReplyEdit}
                              disabled={loading}
                              sx={{ textTransform: "none" }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              type="submit"
                              sx={{ 
                                backgroundColor: PRIMARY_ORANGE,
                                textTransform: "none",
                              }}
                              disabled={loading || !editReplyContent.trim()}
                            >
                              {loading ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Save"}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 0.5, 
                          whiteSpace: "pre-wrap", 
                          color: PRIMARY_BLUE,
                          fontSize: "14px",
                          lineHeight: 1.5,
                        }}
                      >
                        {reply.content}
                      </Typography>
                          {reply.images && reply.images.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                                {reply.images.map((imageUrl, index) => (
                                  <ImageListItem key={`reply-image-${index}`}>
                                    <img
                                      src={imageUrl}
                                      alt={`Reply image ${index + 1}`}
                                      loading="lazy"
                                      style={{ objectFit: "cover" }}
                                    />
                                  </ImageListItem>
                                ))}
                              </ImageList>
                            </Box>
                          )}
                        </>
                      )}
                      {editingReplyId !== reply._id && (
                      <Box display="flex" gap={0.5} alignItems="center" mt={1}>
                        <Button
                          size="small"
                          onClick={() => handleReplyReact(reply._id, "like")}
                          startIcon={replyMyReaction === "like" ? <ThumbUpIcon sx={{ fontSize: 16 }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />}
                          sx={{ 
                            color: replyMyReaction === "like" ? PRIMARY_ORANGE : TEXT_GREY,
                            minWidth: "auto",
                            fontSize: "12px",
                            textTransform: "none",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            "&:hover": {
                              backgroundColor: "rgba(24, 119, 242, 0.1)",
                            },
                          }}
                        >
                          Like {replyLikes > 0 && `(${replyLikes})`}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleReplyReact(reply._id, "dislike")}
                          startIcon={replyMyReaction === "dislike" ? <ThumbDownIcon sx={{ fontSize: 16 }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />}
                          sx={{ 
                            color: replyMyReaction === "dislike" ? "#dc2626" : TEXT_GREY,
                            minWidth: "auto",
                            fontSize: "12px",
                            textTransform: "none",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            "&:hover": {
                              backgroundColor: "rgba(240, 40, 73, 0.1)",
                            },
                          }}
                        >
                          Dislike {replyDislikes > 0 && `(${replyDislikes})`}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setIsReplying(true)}
                          sx={{ 
                            color: TEXT_GREY,
                            minWidth: "auto",
                            fontSize: "12px",
                            textTransform: "none",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.05)",
                            },
                          }}
                        >
                          Reply
                        </Button>
                          {isReplyOwner && (
                            <Button
                              size="small"
                              onClick={() => handleStartReplyEdit(reply)}
                              sx={{ 
                                color: PRIMARY_ORANGE, 
                                minWidth: "auto", 
                                fontSize: "12px",
                                textTransform: "none",
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                "&:hover": {
                                  backgroundColor: "rgba(24, 119, 242, 0.1)",
                                },
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        {(isReplyOwner || isAdmin) && (
                          <Button
                            size="small"
                            onClick={() => handleReplyDelete(reply._id)}
                            sx={{ 
                              color: "#dc2626", 
                              minWidth: "auto", 
                              fontSize: "12px",
                              textTransform: "none",
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              "&:hover": {
                                backgroundColor: "rgba(240, 40, 73, 0.1)",
                              },
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
                })}
                
                {/* Button "Xem thêm phản hồi" hoặc "Thu gọn" */}
                {hasMoreReplies && (
                  <Box mt={1} ml={2}>
                    <Button
                      size="small"
                      onClick={() => setShowAllReplies(!showAllReplies)}
                      sx={{
                        color: PRIMARY_ORANGE,
                        textTransform: "none",
                        fontSize: "13px",
                        fontWeight: 600,
                        px: 1.5,
                        py: 0.5,
                        "&:hover": {
                          backgroundColor: "rgba(24, 119, 242, 0.1)",
                        },
                      }}
                    >
                      {showAllReplies 
                        ? `Collapse` 
                        : `View ${replies.length - INITIAL_REPLIES_TO_SHOW} more ${replies.length - INITIAL_REPLIES_TO_SHOW === 1 ? 'reply' : 'replies'}`}
                    </Button>
                  </Box>
                )}

                {/* Button "Ẩn phản hồi" để thu lại */}
                <Box mt={1} ml={2}>
                  <Button
                    size="small"
                    onClick={() => {
                      setShowReplies(false);
                      setShowAllReplies(false);
                    }}
                    sx={{
                      color: PRIMARY_ORANGE,
                      textTransform: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      px: 1.5,
                      py: 0.5,
                      "&:hover": {
                        backgroundColor: "rgba(24, 119, 242, 0.1)",
                      },
                    }}
                  >
                    Hide replies
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: TEXT_GREY, ml: 2, mt: 1 }}>
                No replies yet
              </Typography>
            )}
          </Box>
        )}

        {/* Reply form - chỉ hiển thị khi click "Trả lời" */}
        {isReplying && (
          <Box
            sx={{
              position: "relative",
              mt: 1.5,
              pl: 2,
            }}
          >
            {/* Connection line với đường cong mượt cho reply form - chỉ hiện khi có replies */}
            {replies.length > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  left: "-20px",
                  top: 0,
                  width: "20px",
                  height: "18px",
                  zIndex: 2,
                }}
              >
                <svg
                  width="20"
                  height="18"
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  {/* Đường dọc từ reply cuối cùng */}
                  <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="14"
                    stroke="#E4E6EB"
                    strokeWidth="2"
                  />
                  {/* Đường cong - dùng quadratic curve */}
                  <path
                    d="M 1 14 Q 1 18 5 18 L 12 18"
                    stroke="#E4E6EB"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </Box>
            )}
            <Box display="flex" gap={1.5} alignItems="flex-start">
              <Avatar
                src={user?.avatar}
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: PRIMARY_ORANGE,
                  fontSize: "16px",
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
                    backgroundColor: "#F0F2F5",
                    borderRadius: "20px",
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                    "&:focus-within": {
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E4E6EB",
                      boxShadow: "0 0 0 2px rgba(24, 119, 242, 0.1)",
                    },
                  }}
                >
                  <TextField
                    fullWidth
                    multiline
                    minRows={1}
                    maxRows={4}
                    placeholder={`Reply to ${commentAuthor}...`}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    disabled={submittingReply}
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                    }}
                    autoFocus
                    sx={{
                      "& .MuiInputBase-root": {
                        px: 1.5,
                        py: 1,
                        fontSize: "15px",
                        color: PRIMARY_BLUE,
                        "&::placeholder": {
                          color: "#65676B",
                          opacity: 1,
                        },
                      },
                    }}
                  />
                </Box>
                
                {/* Image previews and action buttons */}
                {(replyImagePreviews.length > 0 || replyContent.trim()) && (
                  <Box sx={{ mt: 1.5 }}>
                    {/* Image previews */}
                    {replyImagePreviews.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <ImageList 
                          sx={{ 
                            width: "100%", 
                            height: "auto",
                            margin: 0,
                          }} 
                          cols={replyImagePreviews.length === 1 ? 1 : replyImagePreviews.length === 2 ? 2 : 3} 
                          rowHeight={120}
                          gap={8}
                        >
                          {replyImagePreviews.map((preview, index) => (
                            <ImageListItem 
                              key={`reply-preview-${index}`}
                              sx={{
                                position: "relative",
                                borderRadius: 1,
                                overflow: "hidden",
                                border: "1px solid #E4E6EB",
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
                                onClick={() => handleRemoveNewReplyImage(index)}
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
                        id="reply-comment-image-upload"
                        type="file"
                        multiple
                        onChange={handleNewReplyImageChange}
                        disabled={submittingReply}
                      />
                      <label htmlFor="reply-comment-image-upload">
                        <Button
                          component="span"
                          variant="text"
                          size="small"
                          startIcon={<CloudUploadIcon />}
                          disabled={submittingReply}
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
                      
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setIsReplying(false);
                            setReplyContent("");
                            setReplyImages([]);
                            setReplyImagePreviews([]);
                          }}
                          disabled={submittingReply}
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
                          Cancel
                        </Button>
                        <IconButton
                          onClick={handleSubmitReply}
                          disabled={submittingReply || !replyContent.trim()}
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
                              backgroundColor: "#E4E6EB",
                              color: "#BCC0C4",
                            },
                          }}
                        >
                          {submittingReply ? (
                            <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
                          ) : (
                            <SendIcon sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                )}
                
                {/* Show image upload button when no content */}
                {!replyContent.trim() && replyImagePreviews.length === 0 && (
                  <Box sx={{ mt: 1 }}>
                    <input
                      accept="image/*"
                      style={{ display: "none" }}
                      id="reply-comment-image-upload-empty"
                      type="file"
                      multiple
                      onChange={handleNewReplyImageChange}
                      disabled={submittingReply}
                    />
                    <label htmlFor="reply-comment-image-upload-empty">
                      <Button
                        component="span"
                        variant="text"
                        size="small"
                        startIcon={<CloudUploadIcon />}
                        disabled={submittingReply}
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
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm delete comment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this comment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <ToastComponent />
    </Box>
  );
};

export default CommentItem;

