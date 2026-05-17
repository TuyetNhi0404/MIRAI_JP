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
  Snackbar,
  Slide,
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
      setSuccess(false);
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
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
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
          Request Teaching Leave
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
                <strong style={{ minWidth: 100 }}>Date:</strong>
                <span>
                  {new Date(scheduleItem.dateStr).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </Typography>

              <Typography variant="body2" sx={{ mb: 0.8, display: 'flex' }}>
                <strong style={{ minWidth: 100 }}>Time Slot:</strong>
                <span>
                  {session
                    ? `${session.sessionName} (${session.startTime} - ${session.endTime})`
                    : 'N/A'}
                </span>
              </Typography>

              {scheduleItem.courseName && (
                <Typography variant="body2" sx={{ mb: 0.8, display: 'flex' }}>
                  <strong style={{ minWidth: 100 }}>Course:</strong>
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
                  <strong style={{ minWidth: 100 }}>Time Until Class:</strong>
                  <span style={{ marginLeft: 4 }}>
                    {hoursRemaining < 0
                      ? 'Already passed'
                      : hoursRemaining >= 24
                        ? `${hoursRemaining} hours remaining`
                        : `${hoursRemaining} hours (Less than 24h)`}
                  </span>
                </Typography>
              )}
            </Box>
          )}

          {!canSubmit && hoursRemaining !== null && hoursRemaining >= 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
               Leave requests must be submitted at least 24 hours in advance.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Leave Request *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain why you need to take leave from this teaching session..."
            disabled={loading || !canSubmit}
            error={reason.length > 0 && !isReasonValid}
            helperText={
              !isReasonValid && reason.length > 0
                ? 'Reason must be at least 5 characters'
                : !canSubmit && hoursRemaining !== null && hoursRemaining >= 0
? 'Less than 24 hours notice required'
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
            Cancel
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
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={2500}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={(props) => <Slide {...props} direction="down" />}
      >
        <Alert
          onClose={() => setSuccess(false)}
          sx={{
            backgroundColor: '#B90000',
            color: 'white',
            fontWeight: 500,
            borderRadius: 2,
            boxShadow: '0 3px 10px rgba(236, 117, 16, 0.3)',
            '& .MuiAlert-icon': { color: 'white' },
          }}
          icon={false}
        >
          Leave request submitted successfully!
        </Alert>
      </Snackbar>
    </>
  );
};

export default RequestModal;
