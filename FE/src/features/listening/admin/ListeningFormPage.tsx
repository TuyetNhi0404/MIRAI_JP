import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, MenuItem, Select, FormControl, InputLabel, CircularProgress, Skeleton, Alert, Snackbar, Switch, FormControlLabel } from '@mui/material';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import listeningService from '../../../services/listeningService';

const ListeningFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: 'daily_life',
    level: 'N5' as 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
    audioSource: 'upload' as 'upload' | 'tts',
    audioUrl: '',
    transcript: '',
    isPublished: true,
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      const loadExistingContent = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await listeningService.getById(id);
          setFormData({
            title: data.title || '',
            description: data.description || '',
            topic: data.topic || 'daily_life',
            level: (data.level || 'N5') as 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
            audioSource: (data.audioSource || 'upload') as 'upload' | 'tts',
            audioUrl: data.audioUrl || '',
            transcript: data.transcript || '',
            isPublished: data.isPublished !== undefined ? data.isPublished : true,
          });
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Không thể tải thông tin bài nghe.');
        } finally {
          setLoading(false);
        }
      };
      loadExistingContent();
    }
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Vui lòng nhập tiêu đề');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Lưu metadata trước (không có audioUrl nếu đang upload file)
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        topic: formData.topic,
        level: formData.level,
        audioSource: formData.audioSource,
        audioUrl: formData.audioSource === 'tts' ? formData.audioUrl.trim() : undefined,
        transcript: formData.transcript.trim() || undefined,
        isPublished: formData.isPublished,
      };

      let savedContentId = id;

      if (isEditMode && id) {
        await listeningService.update(id, payload);
      } else {
        const created = await listeningService.create(payload);
        savedContentId = created._id ?? (created as { id?: string }).id;
      }

      if (formData.audioSource === 'upload' && audioFile) {
        if (!savedContentId) {
          throw new Error('Không lấy được ID bài nghe sau khi lưu.');
        }
        setUploading(true);
        try {
          await listeningService.uploadAudio(savedContentId, audioFile);
        } catch (uploadErr: unknown) {
          const msg =
            uploadErr && typeof uploadErr === 'object' && 'response' in uploadErr
              ? (uploadErr as { response?: { data?: { message?: string } } }).response?.data?.message
              : uploadErr instanceof Error
                ? uploadErr.message
                : 'Lỗi server';
          throw new Error(
            'Đã lưu thông tin bài nghe nhưng upload âm thanh lên Cloudinary thất bại: ' + msg
          );
        } finally {
          setUploading(false);
        }
      } else if (formData.audioSource === 'upload' && !audioFile && !isEditMode) {
        throw new Error('Vui lòng chọn file âm thanh để upload.');
      }

      setSnackbarMessage(isEditMode ? 'Cập nhật bài nghe thành công!' : 'Tạo mới bài nghe thành công!');
      setTimeout(() => {
        navigate('/dashboard/admin/listening');
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      const apiMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const message =
        err instanceof Error ? err.message : apiMessage || 'Lưu bài nghe thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
        <Skeleton variant="text" width="20%" height={32} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="50%" height={48} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4, borderRadius: '16px' }}>
          <Grid container spacing={3}>
            <Grid item xs={12}><Skeleton variant="rectangular" height={56} /></Grid>
            <Grid item xs={12}><Skeleton variant="rectangular" height={100} /></Grid>
            <Grid item xs={6}><Skeleton variant="rectangular" height={56} /></Grid>
            <Grid item xs={6}><Skeleton variant="rectangular" height={56} /></Grid>
            <Grid item xs={12}><Skeleton variant="rectangular" height={150} /></Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/dashboard/admin/listening')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          disabled={saving || uploading}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <Typography
          variant="h4"
          sx={{
            color: '#B90000',
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem' },
            margin: 0,
          }}
        >
          {isEditMode ? 'Chỉnh sửa nội dung luyện nghe' : 'Tạo mới nội dung luyện nghe'}
        </Typography>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tiêu đề"
              name="title"
              value={formData.title}
              onChange={handleChange}
              variant="outlined"
              disabled={saving || uploading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Mô tả"
              name="description"
              value={formData.description}
              onChange={handleChange}
              variant="outlined"
              disabled={saving || uploading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Chủ đề</InputLabel>
              <Select name="topic" value={formData.topic} onChange={handleChange as any} label="Chủ đề" disabled={saving || uploading}>
                <MenuItem value="daily_life">Đời sống hàng ngày</MenuItem>
                <MenuItem value="travel">Du lịch</MenuItem>
                <MenuItem value="business">Công việc</MenuItem>
                <MenuItem value="culture">Văn hóa</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Trình độ</InputLabel>
              <Select name="level" value={formData.level} onChange={handleChange as any} label="Trình độ" disabled={saving || uploading}>
                <MenuItem value="N5">N5</MenuItem>
                <MenuItem value="N4">N4</MenuItem>
                <MenuItem value="N3">N3</MenuItem>
                <MenuItem value="N2">N2</MenuItem>
                <MenuItem value="N1">N1</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Nguồn âm thanh</InputLabel>
              <Select name="audioSource" value={formData.audioSource} onChange={handleChange as any} label="Nguồn âm thanh" disabled={saving || uploading}>
                <MenuItem value="upload">Tải tệp lên (Cloudinary)</MenuItem>
                <MenuItem value="tts">Chuyển văn bản thành giọng nói (ElevenLabs)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            {formData.audioSource === 'upload' ? (
              <Box sx={{ border: '1px dashed #ccc', p: 1.5, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '56px' }}>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  id="audio-file-input"
                  style={{ display: 'none' }}
                  disabled={saving || uploading}
                />
                <label htmlFor="audio-file-input">
                  <Button variant="outlined" component="span" size="small" disabled={saving || uploading}>
                    Chọn tệp âm thanh
                  </Button>
                </label>
                <Typography variant="body2" sx={{ ml: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} color="text.secondary">
                  {audioFile ? audioFile.name : (formData.audioUrl ? 'Đã có file audio cũ' : 'Chưa chọn file')}
                </Typography>
              </Box>
            ) : (
              <TextField
                fullWidth
                label="Đường dẫn âm thanh (URL)"
                name="audioUrl"
                value={formData.audioUrl}
                onChange={handleChange}
                variant="outlined"
                placeholder="https://..."
                disabled={saving || uploading}
              />
            )}
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Nội dung lời thoại (Tiếng Nhật)"
              name="transcript"
              value={formData.transcript}
              onChange={handleChange}
              variant="outlined"
              disabled={saving || uploading}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  disabled={saving || uploading}
                />
              }
              label="Xuất bản (Hiển thị cho học viên và giáo viên)"
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard/admin/listening')}
              startIcon={<X size={18} />}
              disabled={saving || uploading}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 'bold',
                textTransform: 'none',
              }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              startIcon={(saving || uploading) ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
              onClick={handleSave}
              disabled={saving || uploading || !formData.title.trim()}
              sx={{
                bgcolor: '#B90000',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': { bgcolor: '#990000' }
              }}
            >
              {uploading ? 'Đang tải lên âm thanh...' : saving ? 'Đang lưu...' : 'Lưu nội dung'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={2000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage || ''}
      />
    </div>
  );
};

export default ListeningFormPage;
