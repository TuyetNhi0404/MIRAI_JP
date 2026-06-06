import { useState, useEffect, useRef } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Assignment,
  School,
  CheckCircle,
  Close,
  Quiz,
  Reply,
  Alarm,
  Add,
  CalendarToday,
  ThumbUp,
  ThumbDown,
  Edit,
  Delete,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import notificationService from "../../services/notification.service";
import { courseService, type Course } from "../../services/courseService";
import { userService } from "../../services/accountService";
import type { User } from "../../types/account.types";
import type { 
  Notification, 
  CreateGlobalNotificationRequest,
  SendNotificationToUserRequest,
  MyCreatedNotification,
} from "../../types/notification.types";
import { useAppSelector } from "../../hooks/hooks";

const translateTitle = (title: string): string => {
  const tMap: Record<string, string> = {
    "New Assignment": "Bài tập mới",
    "Assignment Deadline Approaching": "Sắp đến hạn nộp bài tập",
    "Assignment Graded": "Bài tập đã chấm điểm",
    "Schedule Change Request": "Yêu cầu thay đổi lịch học",
    "Schedule Request Response": "Phản hồi yêu cầu lịch học",
    "Schedule Response": "Phản hồi lịch học",
    "New Enrollment Request": "Yêu cầu ghi danh mới",
    "Enrollment Request Response": "Phản hồi yêu cầu ghi danh",
    "New Quiz": "Bài trắc nghiệm mới",
  };
  return tMap[title] || title;
};

const translateMessage = (message: string): string => {
  if (!message) return message;
  let msg = message;
  
  const newAssignmentRegex = /A new assignment "([^"]+)" has been posted\. Due: (.*)/i;
  if (newAssignmentRegex.test(msg)) {
    return msg.replace(newAssignmentRegex, 'Bài tập mới "$1" đã được đăng. Hạn nộp: $2');
  }

  const deadlineRegex = /Reminder: Assignment "([^"]+)" is due on (.*)/i;
  if (deadlineRegex.test(msg)) {
    return msg.replace(deadlineRegex, 'Nhắc nhở: Bài tập "$1" có hạn nộp vào ngày $2');
  }

  const gradedRegex = /Your assignment "([^"]+)" has been graded\. Score: (.*)/i;
  if (gradedRegex.test(msg)) {
    return msg.replace(gradedRegex, 'Bài tập "$1" của bạn đã được chấm điểm. Điểm số: $2');
  }

  const scheduleRequestRegex = /(.*) requested a schedule change\. Reason: (.*)/i;
  if (scheduleRequestRegex.test(msg)) {
    return msg.replace(scheduleRequestRegex, '$1 đã yêu cầu thay đổi lịch học. Lý do: $2');
  }

  if (msg.includes("Your schedule change request has been approved")) {
    return "Yêu cầu thay đổi lịch học của bạn đã được phê duyệt.";
  }
  if (msg.includes("Your schedule change request has been rejected")) {
    return "Yêu cầu thay đổi lịch học của bạn đã bị từ chối.";
  }

  const enrollmentRequestRegex = /(.*) \((.*)\) requested to enroll in "([^"]+)"/i;
  if (enrollmentRequestRegex.test(msg)) {
    return msg.replace(enrollmentRequestRegex, '$1 ($2) đã đăng ký ghi danh vào khóa học "$3"');
  }

  const enrollApprovedRegex = /Your enrollment request for "([^"]+)" has been approved! Welcome to the course\./i;
  if (enrollApprovedRegex.test(msg)) {
    return msg.replace(enrollApprovedRegex, 'Yêu cầu ghi danh của bạn cho khóa học "$1" đã được duyệt! Chào mừng bạn tham gia khóa học.');
  }

  const enrollRejectedRegex = /Your enrollment request for "([^"]+)" has been rejected\./i;
  if (enrollRejectedRegex.test(msg)) {
    return msg.replace(enrollRejectedRegex, 'Yêu cầu ghi danh của bạn cho khóa học "$1" đã bị từ chối.');
  }

  const quizCreatedDueRegex = /A new quiz "([^"]+)" has been created\. Due date: (.*)\./i;
  if (quizCreatedDueRegex.test(msg)) {
    return msg.replace(quizCreatedDueRegex, 'Bài trắc nghiệm mới "$1" đã được tạo. Hạn làm bài: $2.');
  }
  const quizCreatedRegex = /A new quiz "([^"]+)" has been created\./i;
  if (quizCreatedRegex.test(msg)) {
    return msg.replace(quizCreatedRegex, 'Bài trắc nghiệm mới "$1" đã được tạo.');
  }

  return msg;
};

const NotificationDropdown = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notificationType, setNotificationType] = useState<"global" | "user">("global");
  const [formData, setFormData] = useState<CreateGlobalNotificationRequest>({
    title: "",
    message: "",
    targetRole: "all",
    courseIds: [],
  });
  const [sendToUserFormData, setSendToUserFormData] = useState<SendNotificationToUserRequest>({
    recipientUserId: "",
    title: "",
    message: "",
  });
  const [editingNotification, setEditingNotification] = useState<Notification | MyCreatedNotification | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: "", message: "" });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [debouncedSearchInput, setDebouncedSearchInput] = useState("");
  const [myCreatedDialogOpen, setMyCreatedDialogOpen] = useState(false);
  const [myCreatedNotifications, setMyCreatedNotifications] = useState<MyCreatedNotification[]>([]);
  const [loadingMyCreated, setLoadingMyCreated] = useState(false);
  const [myCreatedPage, setMyCreatedPage] = useState(1);
  const [myCreatedTotalPages, setMyCreatedTotalPages] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || "student";

  const open = Boolean(anchorEl);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getMyNotifications({
        limit: 50,
        page: 1,
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    if (userRole === "admin") {
      fetchCourses();
    }
  }, [userRole]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchInput(userSearchInput);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [userSearchInput]);

  // Fetch courses for admin
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const allCourses = await courseService.getAll();
      setCourses(allCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch users for sendToUser
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userService.getAll();
      const userList = (response?.users || []) as User[];
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch my created notifications
  const fetchMyCreatedNotifications = async (page: number = 1) => {
    try {
      setLoadingMyCreated(true);
      const response = await notificationService.getMyCreatedNotifications({ page, limit: 20 });
      setMyCreatedNotifications(response.data.notifications);
      setMyCreatedTotalPages(response.data.totalPages);
      setMyCreatedPage(response.data.page);
    } catch (error) {
      console.error("Error fetching my created notifications:", error);
      setMyCreatedNotifications([]);
    } finally {
      setLoadingMyCreated(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (notificationType === "user") {
      // Send to specific user
      if (!sendToUserFormData.recipientUserId || !sendToUserFormData.title.trim() || !sendToUserFormData.message.trim()) {
        return;
      }

      try {
        setCreating(true);
        await notificationService.sendNotificationToUser(sendToUserFormData);
        setCreateDialogOpen(false);
        setSendToUserFormData({
          recipientUserId: "",
          title: "",
          message: "",
        });
        fetchNotifications();
        fetchUnreadCount();
      } catch (error) {
        console.error("Error sending notification to user:", error);
      } finally {
        setCreating(false);
      }
    } else {
      // Global notification
      if (!formData.title.trim() || !formData.message.trim()) {
        return;
      }

      // If "courses" is selected, ensure courseIds is provided
      if (formData.targetRole === "courses" && (!formData.courseIds || formData.courseIds.length === 0)) {
        alert("Please select at least one course");
        return;
      }

      try {
        setCreating(true);
        const submitData: CreateGlobalNotificationRequest = {
          title: formData.title,
          message: formData.message,
          ...(formData.targetRole === "courses" 
            ? { courseIds: formData.courseIds } 
            : { targetRole: formData.targetRole }),
        };
        await notificationService.createGlobalNotification(submitData);
        setCreateDialogOpen(false);
        setFormData({
          title: "",
          message: "",
          targetRole: "all",
          courseIds: [],
        });
        fetchNotifications();
        fetchUnreadCount();
      } catch (error) {
        console.error("Error creating notification:", error);
      } finally {
        setCreating(false);
      }
    }
  };

  // Handle view my created notifications
  const handleViewMyCreated = () => {
    setMyCreatedDialogOpen(true);
    fetchMyCreatedNotifications(1);
  };

  // Polling for real-time updates
  useEffect(() => {
    if (open) {
      // Fetch immediately when dropdown opens
      fetchNotifications();
      fetchUnreadCount();
    }

    // Set up polling every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Global announcement: show dialog only (except enrollment_request and schedule_request which navigate directly)
    if (notification.type === "global_announcement") {
      // Check if this is an enrollment_request notification (based on title or message)
      if (
        notification.title === "New Enrollment Request" ||
        notification.message.includes("requested to enroll")
      ) {
        // Navigate directly to enrollment requests page
        handleClose();
        window.location.href = `/dashboard/admin/requests`;
        return;
      }
      // Check if this is a schedule_request notification (based on title or message)
      // Only navigate for REQUEST, not for RESPONSE
      const title = notification.title || "";
      const message = notification.message || "";
      if (
        title === "Schedule Change Request" ||
        title === "New Schedule Request" ||
        (message.includes("schedule") && !title.includes("Response") && !message.includes("Response"))
      ) {
        // Navigate directly to request management page
        handleClose();
        window.location.href = `/dashboard/admin/request-management`;
        return;
      }
      // If it's a schedule response, just mark as read and close (message already shown in dropdown)
      if (
        title === "Schedule Request Response" ||
        title === "Schedule Response" ||
        (title.includes("Response") && (message.includes("schedule") || message.includes("Schedule")))
      ) {
        // Just close dropdown, message already visible in dropdown, don't navigate, don't show dialog
        handleClose();
        return;
      }
      // For other global announcements, show dialog
      handleClose(); // Close dropdown first
      setSelectedNotification(notification);
      setDetailDialogOpen(true);
      return;
    }

    // Approve/Reject notifications: only mark as read (already marked above), don't navigate
    if (notification.type === "forum_post_approved" || notification.type === "forum_post_rejected") {
      handleClose(); // Close dropdown
      return;
    }

    handleClose(); // Close dropdown

    // enrollment_request: navigate directly to requests page
    if (notification.type === "enrollment_request") {
      window.location.href = `/dashboard/admin/requests`;
      return;
    }

    // schedule_request: navigate directly to request-management page
    if (notification.type === "schedule_request") {
      window.location.href = `/dashboard/admin/request-management`;
      return;
    }

    // schedule_response: only mark as read, don't navigate (response is just a notification)
    if (notification.type === "schedule_response") {
      // Already marked as read above, just close dropdown
      return;
    }

    // forum_pending_post: do nothing, just close dropdown
    if (notification.type === "forum_pending_post") {
      handleClose();
      return;
    }

    // Other notifications: navigate directly
    if (notification.relatedEntityId || notification.metadata) {
      switch (notification.type) {
        case "assignment_created":
        case "assignment_graded":
        case "assignment_deadline":
          window.location.href = `/dashboard/student/assignment`;
          break;
        case "quiz_created":
          window.location.href = `/dashboard/student/quizzes`;
          break;
        case "enrollment_response":
          window.location.href = `/dashboard/admin/requests`;
          break;
        default:
          break;
      }
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleCreateNotification = () => {
    setCreateDialogOpen(true);
    setNotificationType("global");
    setUserSearchInput("");
    setDebouncedSearchInput("");
    setFormData({
      title: "",
      message: "",
      targetRole: "all",
      courseIds: [],
    });
    setSendToUserFormData({
      recipientUserId: "",
      title: "",
      message: "",
    });
    fetchCourses();
    fetchUsers();
  };

  const handleEditNotification = (notification: Notification | MyCreatedNotification) => {
    setEditingNotification(notification);
    setEditFormData({
      title: notification.title,
      message: notification.message,
    });
    setEditDialogOpen(true);
    handleClose();
  };

  const handleUpdateSubmit = async () => {
    if (!editingNotification || !editFormData.title.trim() || !editFormData.message.trim()) {
      return;
    }

    try {
      setUpdating(true);
      await notificationService.updateNotification(editingNotification._id, editFormData);
      setEditDialogOpen(false);
      setEditingNotification(null);
      setEditFormData({ title: "", message: "" });
      fetchNotifications();
    } catch (error) {
      console.error("Error updating notification:", error);
    } finally {
      setUpdating(false);
    }
  };



  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  // Helper function to check if notification is a schedule notification
  const isScheduleNotification = (notification: Notification): boolean => {
    if (notification.type === "schedule_request" || notification.type === "schedule_response") {
      return true;
    }
    if (notification.type === "global_announcement") {
      const title = notification.title || "";
      const message = notification.message || "";
      return (
        title === "Schedule Change Request" ||
        title === "New Schedule Request" ||
        message.toLowerCase().includes("schedule") ||
        message.includes("Schedule")
      );
    }
    return false;
  };

  const getNotificationIcon = (notification: Notification) => {
    // Check if it's a schedule notification first
    if (isScheduleNotification(notification)) {
      return <CalendarToday fontSize="small" />;
    }
    
    const type = notification.type;
    
    // Check if global_announcement is actually an enrollment request
    if (type === "global_announcement") {
      const title = notification.title || "";
      const message = notification.message || "";
      if (
        title === "New Enrollment Request" ||
        message.includes("requested to enroll")
      ) {
        return <School fontSize="small" />;
      }
      return <NotificationsIcon fontSize="small" />;
    }
    
    switch (type) {
      case "assignment_created":
      case "assignment_graded":
        return <Assignment fontSize="small" />;
      case "assignment_deadline":
        return <Alarm fontSize="small" />;
      case "quiz_created":
        return <Quiz fontSize="small" />;
      case "forum_post_approved":
        return <CheckCircle fontSize="small" />;
      case "forum_post_rejected":
        return <Close fontSize="small" />;
      case "forum_pending_post":
        return <NotificationsIcon fontSize="small" />;
      case "forum_post_like":
        return <ThumbUp fontSize="small" />;
      case "forum_post_dislike":
        return <ThumbDown fontSize="small" />;
      case "forum_comment":
        // Check if it's a comment reaction notification
        if (notification.title === "Comment Reaction") {
          return notification.message.includes("liked") ? (
            <ThumbUp fontSize="small" />
          ) : (
            <ThumbDown fontSize="small" />
          );
        }
        return <NotificationsIcon fontSize="small" />;
      case "forum_question":
        return <NotificationsIcon fontSize="small" />;
      case "reply_comment":
        return <Reply fontSize="small" />;
      case "enrollment_request":
      case "enrollment_response":
        return <School fontSize="small" />;
      case "schedule_request":
      case "schedule_response":
        return <CalendarToday fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const getNotificationColor = (notification: Notification) => {
    // Check if it's a schedule notification first
    if (isScheduleNotification(notification)) {
      return "#0288d1"; // Blue for schedule
    }
    
    const type = notification.type;
    
    // Check if global_announcement is actually an enrollment request
    if (type === "global_announcement") {
      if (
        notification.title === "New Enrollment Request" ||
        (notification.message && notification.message.includes("requested to enroll"))
      ) {
        return "#ed6c02"; // Orange for enrollment
      }
      return "#d32f2f";
    }
    
    switch (type) {
      case "assignment_created":
      case "assignment_graded":
        return "#1976d2";
      case "assignment_deadline":
        return "#ff5722"; // Red/Orange for urgency
      case "quiz_created":
        return "#9c27b0"; // Purple
      case "forum_post_approved":
        return "#4caf50"; // Green for approval
      case "forum_post_rejected":
        return "#f44336"; // Red for rejection
      case "forum_pending_post":
        return "#B90000"; // Orange for pending
      case "forum_post_like":
        return "#1976d2"; // Blue for like
      case "forum_post_dislike":
        return "#d32f2f"; // Red for dislike
      case "forum_comment":
      case "forum_question":
        return "#2e7d32";
      case "reply_comment":
        return "#0288d1"; // Light blue
      case "enrollment_request":
      case "enrollment_response":
        return "#ed6c02"; // Orange for enrollment
      case "schedule_request":
      case "schedule_response":
        return "#0288d1"; // Blue for schedule (different from enrollment)
      default:
        return "#666";
    }
  };

  return (
    <>
      <Badge
        badgeContent={unreadCount > 0 ? unreadCount : 0}
        color="error"
        sx={{
          "& .MuiBadge-badge": {
            backgroundColor: "#B90000",
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
            minWidth: "20px",
            height: "20px",
            top: "4px",
            right: "4px",
          },
        }}
      >
        <IconButton
          onClick={handleClick}
          sx={{
            backgroundColor: "white",
            color: "#6B6B6B",
            borderRadius: "50%",
            width: 40,
            height: 40,
            "&:hover": { backgroundColor: "#f5f5f5" },
          }}
        >
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Badge>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 420,
            maxWidth: "90vw",
            maxHeight: 650,
            mt: 1.5,
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.05)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header with gradient */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #B90000 0%, #d6670e 100%)",
            p: 2.5,
            pb: 2,
            color: "white",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <NotificationsIcon sx={{ fontSize: 24 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  letterSpacing: "0.3px",
                }}
              >
                Thông báo
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.25)",
                    color: "white",
                    fontWeight: 600,
                    height: 22,
                    fontSize: "0.7rem",
                    backdropFilter: "blur(10px)",
                  }}
                />
              )}
            </Box>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                sx={{
                  color: "white",
                  fontSize: "0.75rem",
                  minWidth: "auto",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.3)",
                  },
                  "&:disabled": {
                    color: "rgba(255,255,255,0.7)",
                  },
                }}
              >
                {markingAll ? (
                  <CircularProgress size={14} sx={{ color: "white" }} />
                ) : (
                  "Đánh dấu tất cả đã đọc"
                )}
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 520 }}>
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: "#f5f5f5",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#ddd",
                borderRadius: "3px",
                "&:hover": {
                  background: "#bbb",
                },
              },
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 5,
                  gap: 2,
                }}
              >
                <CircularProgress size={32} sx={{ color: "#B90000" }} />
                <Typography variant="body2" color="text.secondary">
                  Đang tải...
                </Typography>
              </Box>
            ) : notifications.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  p: 5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 40, color: "#ccc" }} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 500, color: "#666" }}
                >
                  Không có thông báo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Bạn sẽ nhận được thông báo tại đây
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification, index) => (
                  <Box key={notification._id}>
                    <ListItem
                      disablePadding
                      sx={{
                        backgroundColor: notification.isRead
                          ? "transparent"
                          : isScheduleNotification(notification)
                            ? "linear-gradient(90deg, rgba(2, 136, 209, 0.05) 0%, transparent 100%)"
                            : "linear-gradient(90deg, rgba(236, 117, 16, 0.05) 0%, transparent 100%)",
                        background: notification.isRead
                          ? "transparent"
                          : isScheduleNotification(notification)
                            ? "linear-gradient(90deg, rgba(2, 136, 209, 0.05) 0%, transparent 100%)"
                            : "linear-gradient(90deg, rgba(236, 117, 16, 0.05) 0%, transparent 100%)",
                        position: "relative",
                        borderLeft: isScheduleNotification(notification) ? "2px solid #0288d1" : "none",
                        "&:hover": {
                          backgroundColor: notification.isRead
                            ? "#fafafa"
                            : isScheduleNotification(notification)
                              ? "rgba(2, 136, 209, 0.08)"
                              : "rgba(236, 117, 16, 0.08)",
                        },
                        transition: "all 0.2s ease-in-out",
                        "&::before": notification.isRead
                          ? {}
                          : {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: "3px",
                              bgcolor: isScheduleNotification(notification) ? "#0288d1" : "#B90000",
                              borderRadius: "0 2px 2px 0",
                            },
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          py: 2,
                          px: 2.5,
                          alignItems: "flex-start",
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: getNotificationColor(notification),
                            width: 44,
                            height: 44,
                            mr: 2,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            border: "2px solid white",
                          }}
                        >
                          {getNotificationIcon(notification)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              mb: 0.75,
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: notification.isRead ? 500 : 700,
                                flex: 1,
                                fontSize: "0.9rem",
                                lineHeight: 1.4,
                                color: notification.isRead ? "#666" : "#1a1a1a",
                              }}
                            >
                              {translateTitle(notification.title)}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              {!notification.isRead && (
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: "#B90000",
                                    flexShrink: 0,
                                    mt: 0.5,
                                    boxShadow: "0 0 0 2px rgba(236, 117, 16, 0.2)",
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          {(notification.type !== "global_announcement" || 
                            notification.title === "Schedule Request Response" ||
                            notification.title === "Schedule Response") && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mb: 1,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                color: "#666",
                                fontSize: "0.8rem",
                                lineHeight: 1.5,
                              }}
                            >
                              {translateMessage(notification.message)}
                            </Typography>
                          )}
                          {notification.type === "schedule_response" && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mb: 1,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                color: "#666",
                                fontSize: "0.8rem",
                                lineHeight: 1.5,
                              }}
                            >
                              {translateMessage(notification.message)}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.75rem",
                                color: "#999",
                                fontWeight: 400,
                              }}
                            >
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { addSuffix: true, locale: vi }
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                    {index < notifications.length - 1 && (
                      <Divider sx={{ mx: 2.5, borderColor: "#f0f0f0" }} />
                    )}
                  </Box>
                ))}
              </List>
            )}
          </Box>

          {/* Admin Actions (Admin only) - Fixed at bottom */}
          {userRole === "admin" && (
            <>
              <Divider sx={{ borderColor: "#f0f0f0" }} />
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: "#fafafa",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateNotification}
                  sx={{
                    bgcolor: "#B90000",
                    color: "white",
                    fontWeight: 600,
                    py: 1.25,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.9rem",
                    boxShadow: "0 2px 8px rgba(236, 117, 16, 0.3)",
                    "&:hover": {
                      bgcolor: "#d6670e",
                      boxShadow: "0 4px 12px rgba(236, 117, 16, 0.4)",
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  Tạo thông báo mới
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleViewMyCreated}
                  sx={{
                    borderColor: "#B90000",
                    color: "#B90000",
                    fontWeight: 600,
                    py: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.85rem",
                    "&:hover": {
                      borderColor: "#d6670e",
                      bgcolor: "rgba(236, 117, 16, 0.05)",
                    },
                  }}
                >
                  Đã tạo
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Popover>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        {selectedNotification && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2.5,
                pb: 2,
                pt: 3,
                px: 3,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Avatar
                sx={{
                  bgcolor: getNotificationColor(selectedNotification),
                  width: 56,
                  height: 56,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getNotificationIcon(selectedNotification)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 0.75,
                    fontSize: "1.25rem",
                    color: "#1a1a1a",
                  }}
                >
                  {translateTitle(selectedNotification.title)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#999",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {formatDistanceToNow(
                    new Date(selectedNotification.createdAt),
                    { addSuffix: true, locale: vi }
                  )}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent
              sx={{
                px: 3,
                py: 3,
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#f5f5f5",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#ddd",
                  borderRadius: "3px",
                },
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.8,
                  fontSize: "0.95rem",
                  color: "#333",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  pr: 1,
                }}
              >
                {translateMessage(selectedNotification.message)}
              </Typography>
            </DialogContent>
            <DialogActions
              sx={{
                px: 3,
                pb: 3,
                pt: 2,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Button
                onClick={handleCloseDetailDialog}
                variant="contained"
                sx={{
                  bgcolor: "#B90000",
                  color: "white",
                  fontWeight: 600,
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow: "0 2px 8px rgba(236, 117, 16, 0.3)",
                  "&:hover": {
                    bgcolor: "#d6670e",
                    boxShadow: "0 4px 12px rgba(236, 117, 16, 0.4)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
                fullWidth
              >
                Đóng
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create Notification Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #B90000 0%, #d6670e 100%)",
            color: "white",
            fontWeight: 700,
            fontSize: "1.3rem",
            py: 2.5,
            px: 3,
          }}
        >
          Tạo thông báo mới
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Notification Type Selection */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: "#333" }}>
                Loại thông báo
              </Typography>
              <ToggleButtonGroup
                value={notificationType}
                exclusive
                onChange={(_e, newType) => {
                  if (newType !== null) {
                    setNotificationType(newType);
                  }
                }}
                fullWidth
                sx={{
                  "& .MuiToggleButton-root": {
                    borderColor: "#B90000",
                    color: "#666",
                    fontWeight: 500,
                    textTransform: "none",
                    py: 1.25,
                    "&.Mui-selected": {
                      bgcolor: "#B90000",
                      color: "white",
                      "&:hover": {
                        bgcolor: "#d6670e",
                      },
                    },
                    "&:hover": {
                      bgcolor: "rgba(236, 117, 16, 0.08)",
                    },
                  },
                }}
              >
                <ToggleButton value="global">Thông báo chung</ToggleButton>
                <ToggleButton value="user">Gửi cho người dùng</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Common Fields */}
            <TextField
              label="Tiêu đề"
              fullWidth
              value={notificationType === "global" ? formData.title : sendToUserFormData.title}
              onChange={(e) => {
                if (notificationType === "global") {
                  setFormData({ ...formData, title: e.target.value });
                } else {
                  setSendToUserFormData({ ...sendToUserFormData, title: e.target.value });
                }
              }}
              required
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover fieldset": {
                    borderColor: "#B90000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#B90000",
                  },
                },
              }}
            />

            <TextField
              label="Nội dung"
              fullWidth
              multiline
              rows={5}
              value={notificationType === "global" ? formData.message : sendToUserFormData.message}
              onChange={(e) => {
                if (notificationType === "global") {
                  setFormData({ ...formData, message: e.target.value });
                } else {
                  setSendToUserFormData({ ...sendToUserFormData, message: e.target.value });
                }
              }}
              required
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover fieldset": {
                    borderColor: "#B90000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#B90000",
                  },
                },
              }}
            />

            {/* Global Notification Options */}
            {notificationType === "global" && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Gửi đến</InputLabel>
                  <Select
                    value={formData.targetRole}
                    onChange={(e) => {
                      const newRole = e.target.value as "student" | "teacher" | "all" | "courses";
                      setFormData({ 
                        ...formData, 
                        targetRole: newRole,
                        courseIds: newRole === "courses" ? (formData.courseIds || []) : []
                      });
                    }}
                    input={<OutlinedInput label="Gửi đến" />}
                    sx={{
                      borderRadius: 2,
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#B90000",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#B90000",
                      },
                    }}
                  >
                    <MenuItem value="all">Tất cả (Học viên + Giáo viên)</MenuItem>
                    <MenuItem value="student">Chỉ học viên</MenuItem>
                    <MenuItem value="teacher">Chỉ giáo viên</MenuItem>
                    <MenuItem value="courses">Khóa học cụ thể</MenuItem>
                  </Select>
                </FormControl>

                {formData.targetRole === "courses" && (
                  <FormControl fullWidth>
                    <InputLabel>Chọn khóa học</InputLabel>
                    <Select
                      multiple
                      value={formData.courseIds || []}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, courseIds: typeof value === 'string' ? value.split(',') : value as string[] });
                      }}
                      input={<OutlinedInput label="Chọn khóa học" />}
                      renderValue={(selected) => {
                        if (selected.length === 0) return "Chưa chọn khóa học nào";
                        if (selected.length === 1) {
                          const course = courses.find((c) => (c._id || c.id) === selected[0]);
                          return course?.name || selected[0];
                        }
                        return `${selected.length} khóa học được chọn`;
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                          },
                        },
                      }}
                      sx={{
                        borderRadius: 2,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#B90000",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#B90000",
                        },
                      }}
                    >
                      {loadingCourses ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} />
                          <Typography sx={{ ml: 1 }}>Đang tải khóa học...</Typography>
                        </MenuItem>
                      ) : courses.length === 0 ? (
                        <MenuItem disabled>Không có khóa học nào</MenuItem>
                      ) : (
                        courses.map((course) => (
                          <MenuItem key={course._id || course.id} value={course._id || course.id}>
                            {course.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            {/* Send to User Option */}
            {notificationType === "user" && (
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.name} (${option.email}) - ${option.role}`}
                value={users.find((user) => user._id === sendToUserFormData.recipientUserId) || null}
                onChange={(_event, newValue) => {
                  setSendToUserFormData({
                    ...sendToUserFormData,
                    recipientUserId: newValue ? newValue._id : "",
                  });
                }}
                onInputChange={(_event, newInputValue) => {
                  setUserSearchInput(newInputValue);
                }}
                inputValue={userSearchInput}
                loading={loadingUsers}
                ListboxProps={{
                  style: {
                    maxHeight: 300,
                  },
                }}
                filterOptions={(options) => {
                  // Use debounced search input for filtering
                  const searchTerm = debouncedSearchInput.toLowerCase();
                  if (!searchTerm) {
                    return options;
                  }
                  const filtered = options.filter((option) => {
                    return (
                      option.name.toLowerCase().includes(searchTerm) ||
                      option.email.toLowerCase().includes(searchTerm) ||
                      option.role.toLowerCase().includes(searchTerm)
                    );
                  });
                  return filtered;
                }}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tìm kiếm và chọn người dùng"
                    placeholder="Nhập để tìm kiếm người dùng..."
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#B90000",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#B90000",
                        },
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option._id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#666" }}>
                        {option.email} - {option.role}
                      </Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText="Không tìm thấy người dùng"
                sx={{
                  "& .MuiAutocomplete-popper": {
                    "& .MuiAutocomplete-option": {
                      "&:hover": {
                        bgcolor: "rgba(236, 117, 16, 0.08)",
                      },
                      "&[aria-selected='true']": {
                        bgcolor: "rgba(236, 117, 16, 0.12)",
                      },
                    },
                  },
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1.5,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Button
            onClick={() => setCreateDialogOpen(false)}
            sx={{
              color: "#666",
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#f5f5f5",
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={
              creating || 
              (notificationType === "global" 
                ? (!formData.title.trim() || !formData.message.trim())
                : (!sendToUserFormData.title.trim() || !sendToUserFormData.message.trim() || !sendToUserFormData.recipientUserId))
            }
            sx={{
              bgcolor: "#B90000",
              color: "white",
              fontWeight: 600,
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              boxShadow: "0 2px 8px rgba(236, 117, 16, 0.3)",
              "&:hover": {
                bgcolor: "#d6670e",
                boxShadow: "0 4px 12px rgba(236, 117, 16, 0.4)",
              },
              "&:disabled": {
                bgcolor: "#ccc",
                boxShadow: "none",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            {creating ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              notificationType === "global" ? "Tạo" : "Gửi"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Notification Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingNotification(null);
          setEditFormData({ title: "", message: "" });
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #B90000 0%, #d6670e 100%)",
            color: "white",
            fontWeight: 700,
            fontSize: "1.3rem",
            py: 2.5,
            px: 3,
          }}
        >
          Chỉnh sửa thông báo
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Tiêu đề"
              fullWidth
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              required
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover fieldset": {
                    borderColor: "#B90000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#B90000",
                  },
                },
              }}
            />

            <TextField
              label="Nội dung"
              fullWidth
              multiline
              rows={5}
              value={editFormData.message}
              onChange={(e) => setEditFormData({ ...editFormData, message: e.target.value })}
              required
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover fieldset": {
                    borderColor: "#B90000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#B90000",
                  },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1.5,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingNotification(null);
              setEditFormData({ title: "", message: "" });
            }}
            sx={{
              color: "#666",
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#f5f5f5",
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleUpdateSubmit}
            variant="contained"
            disabled={updating || !editFormData.title.trim() || !editFormData.message.trim()}
            sx={{
              bgcolor: "#B90000",
              color: "white",
              fontWeight: 600,
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              boxShadow: "0 2px 8px rgba(236, 117, 16, 0.3)",
              "&:hover": {
                bgcolor: "#d6670e",
                boxShadow: "0 4px 12px rgba(236, 117, 16, 0.4)",
              },
              "&:disabled": {
                bgcolor: "#ccc",
                boxShadow: "none",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            {updating ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Cập nhật"
            )}
          </Button>
        </DialogActions>
      </Dialog>


      {/* My Created Notifications Dialog */}
      <Dialog
        open={myCreatedDialogOpen}
        onClose={() => setMyCreatedDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #B90000 0%, #d6670e 100%)",
            color: "white",
            fontWeight: 700,
            fontSize: "1.3rem",
            py: 2.5,
            px: 3,
          }}
        >
          Thông báo tôi đã tạo
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          {loadingMyCreated ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 5 }}>
              <CircularProgress size={32} sx={{ color: "#B90000" }} />
            </Box>
          ) : myCreatedNotifications.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 5 }}>
              <Typography variant="body1" sx={{ color: "#666" }}>
                Chưa có thông báo nào được tạo
              </Typography>
            </Box>
          ) : (
            <Box>
              <List sx={{ p: 0 }}>
                {myCreatedNotifications.map((notification, index) => (
                  <Box key={notification._id}>
                    <ListItem
                      disablePadding
                      sx={{
                        py: 2,
                        px: 2,
                        "&:hover": {
                          bgcolor: "#fafafa",
                        },
                      }}
                    >
                      <Box sx={{ width: "100%" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.95rem", flex: 1 }}>
                            {translateTitle(notification.title)}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
                            <Chip
                              label={notification.notificationType === "global" ? `${notification.recipientCount} người nhận` : "Cá nhân"}
                              size="small"
                              sx={{
                                bgcolor: notification.notificationType === "global" ? "#B90000" : "#0288d1",
                                color: "white",
                                fontSize: "0.7rem",
                                height: 22,
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleEditNotification(notification);
                                setMyCreatedDialogOpen(false);
                              }}
                              sx={{
                                width: 28,
                                height: 28,
                                color: "#666",
                                "&:hover": {
                                  bgcolor: "#f0f0f0",
                                  color: "#B90000",
                                },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (window.confirm("Bạn có chắc chắn muốn xóa thông báo này không?")) {
                                  try {
                                    setDeleting(true);
                                    await notificationService.deleteNotification(notification._id);
                                    fetchMyCreatedNotifications(myCreatedPage);
                                    fetchNotifications();
                                    fetchUnreadCount();
                                  } catch (error) {
                                    console.error("Error deleting notification:", error);
                                  } finally {
                                    setDeleting(false);
                                  }
                                }
                              }}
                              disabled={deleting}
                              sx={{
                                width: 28,
                                height: 28,
                                color: "#666",
                                "&:hover": {
                                  bgcolor: "#f0f0f0",
                                  color: "#f44336",
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#666", mb: 1, fontSize: "0.85rem" }}>
                          {translateMessage(notification.message)}
                        </Typography>
                        {notification.notificationType === "individual" && notification.recipientId && (
                          <Typography variant="caption" sx={{ color: "#999", fontSize: "0.75rem" }}>
                            Đến: {typeof notification.recipientId === "object" 
                              ? `${notification.recipientId.name || "Không rõ"} (${notification.recipientId.email || "N/A"})`
                              : "Người dùng không rõ"}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "#999", fontSize: "0.75rem", display: "block", mt: 0.5 }}>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < myCreatedNotifications.length - 1 && (
                      <Divider sx={{ mx: 2, borderColor: "#f0f0f0" }} />
                    )}
                  </Box>
                ))}
              </List>
              {myCreatedTotalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 3 }}>
                  <Button
                    disabled={myCreatedPage === 1}
                    onClick={() => {
                      const newPage = myCreatedPage - 1;
                      setMyCreatedPage(newPage);
                      fetchMyCreatedNotifications(newPage);
                    }}
                    sx={{ color: "#B90000" }}
                  >
                    Trước
                  </Button>
                  <Typography sx={{ display: "flex", alignItems: "center", px: 2 }}>
                    Trang {myCreatedPage} / {myCreatedTotalPages}
                  </Typography>
                  <Button
                    disabled={myCreatedPage === myCreatedTotalPages}
                    onClick={() => {
                      const newPage = myCreatedPage + 1;
                      setMyCreatedPage(newPage);
                      fetchMyCreatedNotifications(newPage);
                    }}
                    sx={{ color: "#B90000" }}
                  >
                    Sau
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1.5,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Button
            onClick={() => setMyCreatedDialogOpen(false)}
            variant="contained"
            sx={{
              bgcolor: "#B90000",
              color: "white",
              fontWeight: 600,
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              boxShadow: "0 2px 8px rgba(236, 117, 16, 0.3)",
              "&:hover": {
                bgcolor: "#d6670e",
                boxShadow: "0 4px 12px rgba(236, 117, 16, 0.4)",
              },
            }}
            fullWidth
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationDropdown;

