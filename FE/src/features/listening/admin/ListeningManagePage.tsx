import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Skeleton, Alert, Snackbar, Switch } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import listeningService from '../../../services/listeningService';
import type { ListeningContent } from '../types';

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
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#B90000' }}>
          Quản lý nội dung luyện nghe
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/dashboard/admin/listening/new')}
          sx={{
            bgcolor: '#B90000',
            color: 'white',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#990000' }
          }}
        >
          Thêm nội dung mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f9f9f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Tiêu đề</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Chủ đề</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Trình độ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nguồn</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Xuất bản</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
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
                    <Box sx={{ display: 'flex' }}>
                      <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
                      <Skeleton variant="circular" width={30} height={30} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : contents.map((content) => (
              <TableRow key={content._id} hover>
                <TableCell>{content.title}</TableCell>
                <TableCell>
                  <Chip label={content.topic} size="small" sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 'bold' }} />
                </TableCell>
                <TableCell>
                  <Chip label={content.level} size="small" sx={{ bgcolor: '#fecaca', color: '#B90000', fontWeight: 'bold' }} />
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
                <TableCell>
                  <IconButton onClick={() => navigate(`/dashboard/admin/listening/${content._id}/edit`)} sx={{ color: 'primary.main', mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(content._id)} sx={{ color: 'error.main' }}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && contents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  Không tìm thấy nội dung luyện nghe nào. Nhấp vào "Thêm nội dung mới" để tạo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
