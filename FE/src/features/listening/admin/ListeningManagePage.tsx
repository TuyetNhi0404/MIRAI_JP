import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  Snackbar,
  Switch,
  Tooltip,
} from '@mui/material';
import { Plus, Pencil, Trash2, Headphones, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import listeningService from '../../../services/listeningService';
import type { ListeningContent } from '../types';

const LEVEL_COLORS: Record<string, string> = {
  N1: "#7B1FA2",
  N2: "#1565C0",
  N3: "#2E7D32",
  N4: "#F57F17",
  N5: "#B90000",
};

const ListeningManagePage = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ListeningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Notification states
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listeningService.getAll({ limit: 100 });
      setContents(res.contents);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Tải danh sách bài nghe thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nội dung này không?')) {
      try {
        await listeningService.delete(id);
        setContents(prev => prev.filter(c => c._id !== id));
        setSnackbar({
          open: true,
          message: 'Xóa nội dung thành công!',
          severity: 'success',
        });
      } catch (err: any) {
        console.error(err);
        setSnackbar({
          open: true,
          message: err.message || 'Xóa nội dung thất bại',
          severity: 'error',
        });
      }
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await listeningService.update(id, { isPublished: !currentStatus });
      setContents(prev =>
        prev.map(c => c._id === id ? { ...c, isPublished: !currentStatus } : c)
      );
      setSnackbar({
        open: true,
        message: `Nội dung đã được ${!currentStatus ? 'xuất bản' : 'hủy xuất bản'} thành công!`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.message || 'Cập nhật nội dung thất bại',
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              bgcolor: '#B90000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Headphones size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a1a">
              Quản lý Luyện nghe
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Danh sách nội dung luyện nghe JLPT N5 - N1
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Làm mới dữ liệu">
            <IconButton onClick={loadData} sx={{ border: '1px solid #eee' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => navigate('/dashboard/admin/listening/new')}
            sx={{
              bgcolor: '#B90000',
              color: 'white',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#990000' },
            }}
          >
            Thêm bài nghe
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden' }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                <TableCell sx={{ fontWeight: 700, color: '#555' }}>Tiêu đề</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#555' }}>Chủ đề</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#555' }}>Trình độ</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#555' }}>Nguồn</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#555', textAlign: 'center' }}>Xuất bản</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#555', textAlign: 'center' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: '4px' }} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: '4px' }} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: '4px' }} /></TableCell>
                    <TableCell sx={{ textAlign: 'center' }}><Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: '4px', mx: 'auto' }} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
                        <Skeleton variant="circular" width={30} height={30} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : contents.map((content) => (
                <TableRow key={content._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={content.topic}
                      size="small"
                      sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={content.level}
                      size="small"
                      sx={{
                        bgcolor: LEVEL_COLORS[content.level] + '18',
                        color: LEVEL_COLORS[content.level],
                        fontWeight: 700,
                        border: `1px solid ${LEVEL_COLORS[content.level]}40`,
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={content.audioSource?.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Switch
                      checked={content.isPublished || false}
                      onChange={() => handleTogglePublish(content._id, content.isPublished || false)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/dashboard/admin/listening/${content._id}/edit`)}
                        sx={{ color: '#1565C0', '&:hover': { bgcolor: '#e3f2fd' } }}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(content._id)}
                        sx={{ color: '#B90000', '&:hover': { bgcolor: '#fff5f5' } }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && contents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Không tìm thấy nội dung luyện nghe nào. Nhấp vào "Thêm bài nghe" để tạo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default ListeningManagePage;
