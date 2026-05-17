import { useState, type ReactElement } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UseToastReturn {
  showToast: (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  ToastComponent: () => ReactElement;
}

export const useToast = (): UseToastReturn => {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const showSuccess = (message: string) => showToast(message, 'success');
  const showError = (message: string) => showToast(message, 'error');
  const showInfo = (message: string) => showToast(message, 'info');
  const showWarning = (message: string) => showToast(message, 'warning');

  const handleClose = () => {
    setToast({ ...toast, open: false });
  };

  const ToastComponent = () => (
    <Snackbar
      open={toast.open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ top: { xs: 72, sm: 84 } }}
    >
      <Alert
        onClose={handleClose}
        severity={toast.severity}
        sx={{
          width: '100%',
          bgcolor: toast.severity === 'success' ? '#4caf50' : 
                   toast.severity === 'error' ? '#f44336' : 
                   toast.severity === 'warning' ? '#B90000' : '#2196f3',
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white',
          },
        }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    ToastComponent,
  };
};

