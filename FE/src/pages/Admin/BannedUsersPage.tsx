import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Pagination,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getBannedUsers, unbanForumUser } from "../../services/forum.service";
import type { ForumBan, BannedUsersResponse } from "../../types/forum.type";
import { useToast } from "../../hooks/useToast";

const ITEMS_PER_PAGE = 10;

const BannedUsersPage: React.FC = () => {
  const [bannedUsers, setBannedUsers] = useState<ForumBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ForumBan | null>(null);
  const { showError, showSuccess, ToastComponent } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const fetchBannedUsers = async () => {
    try {
      setLoading(true);
      const response: BannedUsersResponse = await getBannedUsers(
        currentPage,
        ITEMS_PER_PAGE,
        searchQuery
      );
      setBannedUsers(response.data || []);
      setTotalPages(Math.ceil((response.pagination?.total || 0) / ITEMS_PER_PAGE));
    } catch (error: unknown) {
      console.error("Error fetching banned users:", error);
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Unable to load banned users list");
      setBannedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedUsers();
  }, [currentPage, searchQuery]);

  const handleUnban = async () => {
    if (!selectedUser) return;

    try {
      const userId =
        typeof selectedUser.userId === "object"
          ? selectedUser.userId._id
          : selectedUser.userId;

      await unbanForumUser(userId);
      showSuccess("User unbanned successfully");
      setUnbanDialogOpen(false);
      setSelectedUser(null);
      fetchBannedUsers();
    } catch (error: unknown) {
      console.error("Error unbanning user:", error);
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Unable to unban user");
    }
  };

  const handleOpenUnbanDialog = (user: ForumBan) => {
    setSelectedUser(user);
    setUnbanDialogOpen(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Permanent";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getUserInfo = (user: ForumBan) => {
    if (typeof user.userId === "object") {
      return {
        name: user.userId.name || "Unknown",
        email: user.userId.email || "",
        avatar: user.userId.avatar,
        role: user.userId.role || "student",
      };
    }
    return {
      name: "Unknown",
      email: "",
      avatar: undefined,
      role: "student",
    };
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: "1.5rem", sm: "2rem" }
          }}
        >
          Banned Users Management
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: { xs: '14px', sm: '16px' }
            }
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : bannedUsers.length === 0 ? (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <BlockIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: "text.secondary", mb: 2 }} />
          <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary">
            No banned users
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile Card Layout
        <>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {bannedUsers.map((user) => {
              const userInfo = getUserInfo(user);
              return (
                <Card key={user._id} elevation={2}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {/* User Info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Avatar src={userInfo.avatar} sx={{ width: 48, height: 48 }}>
                        {userInfo.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={600} noWrap>
                          {userInfo.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {userInfo.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Ban Info */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          Violations:
                        </Typography>
                        <Chip label={user.count} color="error" size="small" />
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          Ban Type:
                        </Typography>
                        {user.permanent ? (
                          <Chip label="Permanent" color="error" size="small" />
                        ) : (
                          <Chip label="Temporary" color="warning" size="small" />
                        )}
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          Ban Until:
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatDate(user.bannedUntil)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          Reason:
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                          {user.reason || "No reason"}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Action Button */}
                    <Button
                      fullWidth
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleOpenUnbanDialog(user)}
                      sx={{ mt: 1 }}
                    >
                      Unban
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          )}
        </>
      ) : (
        // Desktop Table Layout
        <>
          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '12px', sm: '14px' } }}>User</TableCell>
                  <TableCell sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Violations</TableCell>
                  <TableCell sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Ban Type</TableCell>
                  <TableCell sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Ban Until</TableCell>
                  <TableCell sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Reason</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '12px', sm: '14px' } }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bannedUsers.map((user) => {
                  const userInfo = getUserInfo(user);
                  return (
                    <TableRow key={user._id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar src={userInfo.avatar} sx={{ width: 40, height: 40 }}>
                            {userInfo.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {userInfo.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {userInfo.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.count} color="error" size="small" />
                      </TableCell>
                      <TableCell>
                        {user.permanent ? (
                          <Chip label="Permanent" color="error" size="small" />
                        ) : (
                          <Chip label="Temporary" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.bannedUntil)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: { xs: 200, sm: 300 } }}>
                          {user.reason || "No reason"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleOpenUnbanDialog(user)}
                        >
                          Unban
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size={isTablet ? "small" : "medium"}
              />
            </Box>
          )}
        </>
      )}

      <Dialog 
        open={unbanDialogOpen} 
        onClose={() => setUnbanDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Confirm Unban
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: '14px', sm: '16px' } }}>
            Are you sure you want to unban user{" "}
            <strong>
              {selectedUser
                ? typeof selectedUser.userId === "object"
                  ? selectedUser.userId.name
                  : "Unknown"
                : ""}
            </strong>
            ?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, gap: 1 }}>
          <Button 
            onClick={() => setUnbanDialogOpen(false)}
            size={isMobile ? "medium" : "small"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUnban} 
            color="success" 
            variant="contained"
            size={isMobile ? "medium" : "small"}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <ToastComponent />
    </Box>
  );
};

export default BannedUsersPage;

