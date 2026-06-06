import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import { X, Paperclip, Trash, File } from 'lucide-react';

import { assignmentService } from '../../services/assignmentService';
import type { Assignment, Course } from '../../types/assignment.types';

interface AssignmentDialogProps {
  open: boolean;
  assignment: Assignment | null;
  onClose: () => void;
  refreshList: () => void;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  open,
  assignment,
  onClose,
  refreshList
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    course: '',
    description: '',
    dueDate: '',
    maxScore: 100,
    status: 'draft' as 'active' | 'draft' | 'closed'
  });

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (open) {
      void fetchCourses();
      if (assignment) {
        console.log('📝 Editing assignment:', assignment);
        console.log('📎 Existing files:', assignment.fileUrls);
        
        setFormData({
          title: assignment.title || '',
          courseId: assignment.courseId || '',
          course: assignment.course || '',
          description: assignment.description || '',
          dueDate: assignment.dueDate ? assignment.dueDate.split('T')[0] : '',
          maxScore: assignment.maxScore || 100,
          status: assignment.status || 'draft'
        });
        
        // ✅ Ensure fileUrls is always an array
        const fileUrlsArray = Array.isArray(assignment.fileUrls) 
          ? assignment.fileUrls 
          : assignment.fileUrls 
            ? [assignment.fileUrls] 
            : [];
        
        console.log('📦 Setting existing files:', fileUrlsArray);
        setExistingFiles(fileUrlsArray);
        setNewFiles([]);
        setFilesToDelete([]);
      } else {
        resetForm();
      }
      setErrors({});
    }
  }, [open, assignment]);

  const fetchCourses = async () => {
    try {
      const data = await assignmentService.getCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setCourses([]);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      courseId: '',
      course: '',
      description: '',
      dueDate: '',
      maxScore: 100,
      status: 'draft'
    });
    setNewFiles([]);
    setExistingFiles([]);
    setFilesToDelete([]);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Tiêu đề phải có ít nhất 3 ký tự';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
    }

    // Course validation
    if (!formData.courseId) {
      newErrors.courseId = 'Vui lòng chọn một khóa học';
    }

    // Due date validation
    if (!formData.dueDate) {
      newErrors.dueDate = 'Vui lòng chọn hạn nộp';
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.dueDate = 'Hạn nộp không thể ở quá khứ';
      }
    }

    // Max score validation
    if (formData.maxScore <= 0) {
      newErrors.maxScore = 'Điểm tối đa phải lớn hơn 0';
    } else if (formData.maxScore > 1000) {
      newErrors.maxScore = 'Điểm tối đa không thể vượt quá 1000';
    }

    // Description validation (optional but has max length)
    if (formData.description.length > 2000) {
      newErrors.description = 'Mô tả không được vượt quá 2000 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setFormData(prev => ({
      ...prev,
      courseId,
      course: course ? course.name : ''
    }));
    // Clear course error when user selects
    if (errors.courseId) {
      setErrors(prev => ({ ...prev, courseId: '' }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    console.log('📤 Adding new files:', fileArray.map(f => f.name));
    
    setNewFiles(prev => {
      const updated = [...prev, ...fileArray];
      console.log('📦 Total new files:', updated.length);
      return updated;
    });
    
    event.target.value = '';
  };

  const handleRemoveNewFile = (index: number) => {
    console.log('🗑️ Removing new file at index:', index);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (fileUrl: string) => {
    console.log('🗑️ Marking existing file for deletion:', fileUrl);
    setExistingFiles(prev => prev.filter(url => url !== fileUrl));
    setFilesToDelete(prev => [...prev, fileUrl]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      console.log('💾 Submitting assignment...');
      console.log('📝 Form data:', formData);
      console.log('📎 New files:', newFiles.length);
      console.log('🗑️ Files to delete:', filesToDelete.length);
      
      if (assignment) {
        const result = await assignmentService.update(
          formData.courseId,
          assignment._id || assignment.id || '',
          formData,
          newFiles,
          filesToDelete
        );
        console.log('✅ Update result:', result);
      } else {
        const result = await assignmentService.create(formData, newFiles);
        console.log('✅ Create result:', result);
      }
      
      refreshList();
      handleClose();
    } catch (error: unknown) {
      console.error('❌ Save failed:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save assignment';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      return decodeURIComponent(url.split('/').pop() || url);
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {assignment ? '✏️ Chỉnh sửa bài tập' : '➕ Tạo bài tập mới'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tiêu đề"
              value={formData.title}
              required
              placeholder="Nhập tiêu đề bài tập"
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              error={!!errors.title}
              helperText={errors.title}
            />
          </Grid>

          {!assignment && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!errors.courseId}>
                  <InputLabel>Khóa học</InputLabel>
                  <Select
                    value={formData.courseId}
                    label="Khóa học"
                    onChange={(e) => handleCourseChange(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Chọn một khóa học</em>
                    </MenuItem>
                    {courses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.courseId && (
                    <FormHelperText>{errors.courseId}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  bgcolor: '#e3f2fd',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid #2196f3',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <Typography variant="body2" color="primary.dark">
                    <strong>Trạng thái:</strong> Bài tập mới sẽ được bắt đầu ở dạng <strong>BẢN NHÁP</strong>.
                  </Typography>
                </Box>
              </Grid>
            </>
          )}

          {assignment && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={formData.status}
                  label="Trạng thái"
                  onChange={(e) => setFormData({
                    ...formData,
                    status: e.target.value as 'active' | 'draft' | 'closed'
                  })}
                >
                  <MenuItem value="draft">Bản nháp</MenuItem>
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="closed">Đã đóng</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Mô tả"
              placeholder="Nhập mô tả (không bắt buộc)"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              error={!!errors.description}
              helperText={errors.description || `${formData.description.length}/2000 ký tự`}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              required
              label="Hạn nộp"
              value={formData.dueDate}
              onChange={(e) => {
                setFormData({ ...formData, dueDate: e.target.value });
                if (errors.dueDate) setErrors(prev => ({ ...prev, dueDate: '' }));
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getTodayDate() }}
              error={!!errors.dueDate}
              helperText={errors.dueDate}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Điểm tối đa"
              value={formData.maxScore}
              required
              onChange={(e) => {
                setFormData({
                  ...formData,
                  maxScore: parseInt(e.target.value) || 0
                });
                if (errors.maxScore) setErrors(prev => ({ ...prev, maxScore: '' }));
              }}
              inputProps={{ min: 1, max: 1000 }}
              error={!!errors.maxScore}
              helperText={errors.maxScore}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 3,
              bgcolor: '#f9f9f9'
            }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                📎 Tệp đính kèm
              </Typography>
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                id="file-upload-input"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
              />
              <label htmlFor="file-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Paperclip size={16} />}
                  size="medium"
                  sx={{ mb: 2 }}
                >
                  Thêm tệp mới
                </Button>
              </label>

              {existingFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{
                    fontWeight: 'bold',
                    display: 'block',
                    mb: 1
                  }}>
                    📁 Tệp hiện tại ({existingFiles.length})
                  </Typography>
                  <List dense sx={{ bgcolor: 'white', borderRadius: 1 }}>
                    {existingFiles.map((fileUrl, index) => (
                      <ListItem
                        key={`existing-${index}`}
                        sx={{
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <File size={20} style={{ marginRight: 8, color: '#1976d2' }} />
                        <ListItemText
                          primary={getFileNameFromUrl(fileUrl)}
                          secondary={
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#1976d2', textDecoration: 'none' }}
                            >
                              Xem tệp
                            </a>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveExistingFile(fileUrl)}
                            color="error"
                          >
                            <Trash size={18} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {newFiles.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{
                    fontWeight: 'bold',
                    display: 'block',
                    mb: 1
                  }}>
                    🆕 Tệp mới ({newFiles.length})
                  </Typography>
                  <List dense sx={{ bgcolor: 'white', borderRadius: 1 }}>
                    {newFiles.map((file, index) => (
                      <ListItem
                        key={`new-${index}`}
                        sx={{
                          border: '1px solid #4caf50',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: '#f1f8e9'
                        }}
                      >
                        <File size={20} style={{ marginRight: 8, color: '#4caf50' }} />
                        <ListItemText
                          primary={file.name}
                          secondary={formatFileSize(file.size)}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveNewFile(index)}
                            color="error"
                          >
                            <Trash size={18} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {existingFiles.length === 0 && newFiles.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Chưa đính kèm tệp nào. Bấm "Thêm tệp mới" để tải lên.
                </Typography>
              )}
            </Box>
          </Grid>

          {errors.submit && (
            <Grid item xs={12}>
              <Typography color="error" variant="body2">
                {errors.submit}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Đang lưu...' : assignment ? 'Cập nhật bài tập' : 'Tạo bài tập'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentDialog;
