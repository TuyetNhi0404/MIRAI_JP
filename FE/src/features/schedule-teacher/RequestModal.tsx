import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { Session } from '../../types/scheduleTeacher.types';

interface RequestLeaveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  scheduleItem: {
    calendarId: string;
    dateStr: string;
    sessionId: string;
    courseName?: string;
  } | null;
  sessions: Session[];
}

const RequestModal: React.FC<RequestLeaveModalProps> = ({
  open,
  onClose,
  onSubmit,
  scheduleItem,
  sessions,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const session = sessions.find(
    (s) => s._id === scheduleItem?.sessionId
  );

  const getHoursUntilClass = () => {
    if (!scheduleItem?.dateStr || !session?.startTime) return null;
    const [hours, minutes] = session.startTime.split(':').map(Number);
    const classDateTime = new Date(scheduleItem.dateStr);
    classDateTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    const diffMs = classDateTime.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  };

  const hoursRemaining = getHoursUntilClass();
  const canSubmit = hoursRemaining !== null && hoursRemaining >= 24;
  const isReasonValid = reason.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isReasonValid || !canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      await onSubmit(reason);
      onClose();
    } catch (err) {
      setError('Không thể gửi yêu cầu. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={loading ? undefined : handleClose}
        onBackdropClick={loading ? undefined : handleClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle
          sx={{
            bgcolor: '#B90000',
            color: 'white',
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
          }}
        >
          Yêu cầu xin nghỉ dạy
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {scheduleItem && (
            <Box
              sx={{
mb: 2,
                p: 2,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography variant="body2" sx={{ mb: 0.8, display: 'flex' }}>
                <strong style={{ minWidth: 100 }}>Ngày học:</strong>
                <span>
                  {new Date(scheduleItem.dateStr).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </Typography>

              <Typography variant="body2" sx={{ mb: 0.8, display: 'flex' }}>
                <strong style={{ minWidth: 100 }}>Ca học:</strong>
                <span>
                  {session
                    ? `${session.sessionName} (${session.startTime} - ${session.endTime})`
                    : 'N/A'}
                </span>
              </Typography>

              {scheduleItem.courseName && (
                <Typography variant="body2" sx={{ mb: 0.8, display: 'flex' }}>
                  <strong style={{ minWidth: 100 }}>Khóa học:</strong>
                  <span>{scheduleItem.courseName}</span>
                </Typography>
              )}

              {hoursRemaining !== null && (
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex',
                    color: hoursRemaining < 24 ? 'error.main' : 'success.main',
                    fontWeight: 500,
                  }}
                >
                  <strong style={{ minWidth: 100 }}>Thời gian còn lại:</strong>
                  <span style={{ marginLeft: 4 }}>
                    {hoursRemaining < 0
                      ? 'Đã trôi qua'
                      : hoursRemaining >= 24
                        ? `Còn lại ${hoursRemaining} giờ`
                        : `Còn lại ${hoursRemaining} giờ (Ít hơn 24 giờ)`}
                  </span>
                </Typography>
              )}
            </Box>
          )}

          {!canSubmit && hoursRemaining !== null && hoursRemaining >= 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
               Yêu cầu xin nghỉ dạy phải được gửi trước ít nhất 24 giờ.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Lý do xin nghỉ dạy *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vui lòng giải thích lý do bạn cần xin nghỉ dạy ca học này..."
            disabled={loading || !canSubmit}
            error={reason.length > 0 && !isReasonValid}
            helperText={
              !isReasonValid && reason.length > 0
                ? 'Lý do phải có ít nhất 5 ký tự'
                : !canSubmit && hoursRemaining !== null && hoursRemaining >= 0
                  ? 'Cần báo trước ít nhất 24 giờ'
                  : ''
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': { borderColor: '#B90000' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#B90000' },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} sx={{ color: '#666' }} disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isReasonValid || loading || !canSubmit}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              bgcolor: '#B90000',
              '&:hover': { bgcolor: '#d66a0e' },
              '&:disabled': { bgcolor: '#ccc' },
              minWidth: 120,
            }}
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestModal;
