import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, MenuItem, Select, FormControl, InputLabel, CircularProgress, Skeleton, Alert, Snackbar } from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
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
        description: formData.description.trim() || undefined,
        topic: formData.topic,
        level: formData.level,
        audioSource: formData.audioSource,
        audioUrl: formData.audioSource === 'tts' ? formData.audioUrl.trim() : undefined,
        transcript: formData.transcript.trim() || undefined,
      };

      console.log('payload', payload);
      let savedContentId = id;

      if (isEditMode && id) {
        await listeningService.update(id, payload);
      } else {
        const created = await listeningService.create(payload);
        savedContentId = created._id;
      }

      // 2. Upload file âm thanh nếu audioSource là upload và có chọn file mới
      if (formData.audioSource === 'upload' && audioFile && savedContentId) {
        setUploading(true);
        try {
          const uploadRes = await listeningService.uploadAudio(savedContentId, audioFile);
          // Cập nhật lại URL nhận được từ Cloudinary vào bài nghe
          await listeningService.update(savedContentId, { audioUrl: uploadRes.audioUrl });
        } catch (uploadErr: any) {
          console.error('Lỗi upload file:', uploadErr);
          throw new Error('Lưu bài nghe thành công nhưng upload file âm thanh thất bại: ' + (uploadErr.message || 'Lỗi server'));
        } finally {
          setUploading(false);
        }
      }

      setSnackbarMessage(isEditMode ? 'Cập nhật bài nghe thành công!' : 'Tạo mới bài nghe thành công!');
      setTimeout(() => {
        navigate('/dashboard/admin/listening');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lưu bài nghe thất bại. Vui lòng thử lại.');
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
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/dashboard/admin/listening')}
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}
        disabled={saving || uploading}
      >
        Back to List
      </Button>

      <Typography variant="h4" fontWeight="bold" sx={{ color: '#B90000', mb: 4 }}>
        {isEditMode ? 'Edit Listening Content' : 'Create New Listening Content'}
      </Typography>

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
              label="Title"
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
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              variant="outlined"
              disabled={saving || uploading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Topic</InputLabel>
              <Select name="topic" value={formData.topic} onChange={handleChange as any} label="Topic" disabled={saving || uploading}>
                <MenuItem value="daily_life">Daily Life</MenuItem>
                <MenuItem value="travel">Travel</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="culture">Culture</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select name="level" value={formData.level} onChange={handleChange as any} label="Level" disabled={saving || uploading}>
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
              <InputLabel>Audio Source</InputLabel>
              <Select name="audioSource" value={formData.audioSource} onChange={handleChange as any} label="Audio Source" disabled={saving || uploading}>
                <MenuItem value="upload">Upload File (Cloudinary)</MenuItem>
                <MenuItem value="tts">Text-to-Speech (ElevenLabs)</MenuItem>
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
                    Choose Audio File
                  </Button>
                </label>
                <Typography variant="body2" sx={{ ml: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} color="text.secondary">
                  {audioFile ? audioFile.name : (formData.audioUrl ? 'Đã có file audio cũ' : 'Chưa chọn file')}
                </Typography>
              </Box>
            ) : (
              <TextField
                fullWidth
                label="Audio URL"
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
              label="Transcript (Japanese)"
              name="transcript"
              value={formData.transcript}
              onChange={handleChange}
              variant="outlined"
              disabled={saving || uploading}
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={(saving || uploading) ? <CircularProgress size={18} color="inherit" /> : <Save />}
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
              {uploading ? 'Uploading Audio...' : saving ? 'Saving...' : 'Save Content'}
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
    </Box>
  );
};

export default ListeningFormPage;
