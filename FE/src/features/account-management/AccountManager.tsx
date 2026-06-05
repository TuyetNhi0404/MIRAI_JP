import React, { useState, useEffect } from "react";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Popover,
  MenuItem,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
  Pagination,
  Snackbar,
  Alert,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { userService } from "../../services/accountService";
import type { User } from "../../types/account.types";
import { AccountLock } from "./AccountLock";
import { AddAccountUsers } from "./AddAccountUsers";

const roleLabels: Record<string, string> = {
  student: "Học viên",
  teacher: "Giáo viên",
  admin: "Quản trị viên",
};

const ITEMS_PER_PAGE = 8;

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

export default function AccountManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "admin">("teacher"); 
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "locked">("all");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  
  const [toast, setToast] = useState({ 
    open: false, 
    message: "", 
    severity: "success" as "success" | "error" 
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      

      const userList = (res?.users || []).map((u: User) => ({
        ...u,
      }));
      
      setUsers(userList);
    } catch (error) {
      console.error(" Failed to fetch users:", error);
      setUsers([]);
      setToast({ 
        open: true, 
        message: "Không thể tải danh sách người dùng", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roles: Array<"student" | "teacher" | "admin"> = ["student", "teacher", "admin"];

  const filteredUsers = users.filter((user) => {
    const roleMatch = user.role === selectedRole;
    const statusMatch = selectedStatus === "all" || user.status === selectedStatus;
    const searchLower = searchQuery.toLowerCase().trim();
    const searchMatch = !searchLower || 
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower));
    
    return roleMatch && statusMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleStatusChange = async (userId: string, newStatus: "active" | "locked") => {
    console.log("🔄 Status change:", userId, "→", newStatus);
    
    setUsers(prevUsers => 
      prevUsers.map((u) => 
        u._id === userId ? { ...u, status: newStatus } : u
      )
    );
    
    await fetchUsers();
    
    setToast({
      open: true,
      message: `Tài khoản đã được ${newStatus === "locked" ? "khóa" : "mở khóa"} thành công`,
      severity: "success"
    });
  };

  const handleAddAccount = async (email: string, name: string) => {
    try {
      await userService.create({ name, email, role: selectedRole });
      
      await fetchUsers();
      
      setOpenAddModal(false);
      setToast({
        open: true,
        message: "Tạo tài khoản thành công",
        severity: "success"
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Không thể tạo tài khoản";
      
      console.error(" Failed to add account:", error);
      
      setToast({
        open: true,
        message: errorMessage,
        severity: "error"
      });
      throw error; 
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedStatus, searchQuery]);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  const filterOpen = Boolean(filterAnchorEl);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  const MobileUserCard = ({ user }: { user: User }) => (
    <Card
      sx={{
        mb: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: 2,
        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#023665" }}>
              {user.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", fontSize: "0.85rem" }}>
              {user.email}
            </Typography>
          </Box>
          <AccountLock user={user} onStatusChange={handleStatusChange} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Chip
            label={user.status}
            color={user.status === "active" ? "success" : "error"}
            size="small"
          />
          <Typography variant="caption" sx={{ color: "#999" }}>
            {user.createdAt ? formatDate(user.createdAt) : "N/A"}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth={isTablet ? "md" : "lg"} sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ color: "#023665", fontWeight: "bold" }}>
          QUẢN LÝ {selectedRole === "student" ? "HỌC VIÊN" : selectedRole === "teacher" ? "GIÁO VIÊN" : "QUẢN TRỊ VIÊN"}
        </Typography>
        <Tabs
          value={roles.indexOf(selectedRole)}
          onChange={(_, val) => setSelectedRole(roles[val])}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            borderBottom: "1px solid #e0e0e0",
            "& .MuiTab-root": { textTransform: "none" },
          }}
        >
          {roles.map((r) => (
            <Tab key={r} label={`${roleLabels[r]} (${users.filter(u => u.role === r).length})`} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          placeholder="Tìm kiếm theo tên hoặc email..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ 
            flexGrow: 1, 
            minWidth: "200px",
            maxWidth: { xs: "100%", sm: "400px" } 
          }}
        />

        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <IconButton 
            onClick={handleFilterClick}
            sx={{ 
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              bgcolor: filterOpen ? "#f5f5f5" : "transparent"
            }}
          >
            <FilterListIcon />
          </IconButton>
          
          <Popover
            open={filterOpen}
            anchorEl={filterAnchorEl}
            onClose={handleFilterClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box sx={{ p: 1, minWidth: 150 }}>
              <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", color: "#666" }}>
                Lọc theo trạng thái
              </Typography>
              {(["all", "active", "locked"] as const).map((s) => (
                <MenuItem
                  key={s}
                  selected={selectedStatus === s}
                  onClick={() => {
                    setSelectedStatus(s);
                    handleFilterClose();
                  }}
                  sx={{ 
                    borderRadius: 1, 
                    mx: 1,
                    "&.Mui-selected": {
                      bgcolor: "#023665",
                      color: "white",
                      "&:hover": {
                        bgcolor: "#001f4d"
                      }
                    }
                  }}
                >
                  {s === "all" ? "Tất cả" : s === "active" ? "Đang hoạt động" : "Đã khóa"}
                </MenuItem>
              ))}
            </Box>
          </Popover>
          
          {selectedRole !== "student" && (
            <Button
              variant="contained"
              sx={{ 
                backgroundColor: "#023665", 
                "&:hover": { background: "#001f4d" },
                whiteSpace: "nowrap",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                px: { xs: 1.5, sm: 2 }
              }}
              onClick={() => setOpenAddModal(true)}
            >
              {isMobile ? "+ Thêm" : `+ Thêm ${selectedRole === "teacher" ? "Giáo viên" : "Quản trị viên"}`}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Hiển thị {paginatedUsers.length} trên {filteredUsers.length} {selectedRole === "student" ? "học viên" : selectedRole === "teacher" ? "giáo viên" : "quản trị viên"}
          {selectedStatus !== "all" && ` (${selectedStatus === "active" ? "Đang hoạt động" : "Đã khóa"})`}
          {searchQuery && ` khớp với "${searchQuery}"`}
        </Typography>
        {searchQuery && (
          <Button 
            size="small" 
            onClick={() => setSearchQuery("")}
            sx={{ color: "#B90000" }}
          >
            Xóa tìm kiếm
          </Button>
        )}
      </Box>

      {!isMobile ? (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead sx={{ background: "#f5f5f5" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Họ tên</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow 
                    key={user._id}
                    sx={{ 
                      "&:hover": { bgcolor: "#f9f9f9" },
                      transition: "background-color 0.2s"
                    }}
                  >
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                        color={user.status === "active" ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.createdAt ? formatDate(user.createdAt) : "N/A"}</TableCell>
                    <TableCell align="center">
                      <AccountLock user={user} onStatusChange={handleStatusChange} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" variant="body1">
                      {searchQuery ? (
                        <>Không tìm thấy {selectedRole === "student" ? "học viên" : selectedRole === "teacher" ? "giáo viên" : "quản trị viên"} nào khớp với "{searchQuery}"</>
                      ) : (
                        <>Không tìm thấy {selectedRole === "student" ? "học viên" : selectedRole === "teacher" ? "giáo viên" : "quản trị viên"} nào</>
                      )}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ mb: 3 }}>
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => <MobileUserCard key={user._id} user={user} />)
          ) : (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary">
                {searchQuery ? (
                  <>Không tìm thấy {selectedRole === "student" ? "học viên" : selectedRole === "teacher" ? "giáo viên" : "quản trị viên"} nào khớp với "{searchQuery}"</>
                ) : (
                  <>Không tìm thấy {selectedRole === "student" ? "học viên" : selectedRole === "teacher" ? "giáo viên" : "quản trị viên"} nào</>
                )}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "center", 
          mt: 3,
          mb: 2
        }}>
          <Pagination 
            count={totalPages} 
            page={currentPage} 
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size={isMobile ? "small" : "medium"}
            showFirstButton={!isMobile}
            showLastButton={!isMobile}
            sx={{
              "& .MuiPaginationItem-root": {
                "&.Mui-selected": {
                  bgcolor: "#023665",
                  "&:hover": {
                    bgcolor: "#001f4d"
                  }
                }
              }
            }}
          />
        </Box>
      )}

      <AddAccountUsers
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddAccount}
        role={selectedRole === "student" ? "teacher" : selectedRole} 
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, open: false })} 
          severity={toast.severity} 
          sx={{ 
            width: "100%",
            bgcolor: toast.severity === "success" ? "#B90000" : "#d32f2f",
            color: "white",
            "& .MuiAlert-icon": {
              color: "white"
            }
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
