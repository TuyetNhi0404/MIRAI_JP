// src/components/quiz/AntiCheatWarning.tsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Block as BlockIcon,
  Visibility as EyeIcon,
} from '@mui/icons-material';

interface AntiCheatWarningProps {
  open: boolean;
  violationType: string;
  violationCount: number;
  maxViolations: number;
  onContinue: () => void;
  isAutoSubmit?: boolean;
}

const AntiCheatWarning: React.FC<AntiCheatWarningProps> = ({
  open,
  violationType,
  violationCount,
  maxViolations,
  onContinue,
  isAutoSubmit = false,
}) => {
  const [countdown, setCountdown] = useState(5);
  const remainingViolations = maxViolations - violationCount;
  const isNearLimit = remainingViolations <= 2;
  const isCritical = remainingViolations <= 1;

  useEffect(() => {
    if (open && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (open && countdown === 0) {
      onContinue();
    }
  }, [open, countdown, onContinue]);

  useEffect(() => {
    if (open) {
      setCountdown(5);
    }
  }, [open]);

  const getMessage = () => {
    const messages: Record<string, string> = {
      tab_switch: '🚨 You switched to another tab',
      window_blur: '🚨 The quiz window lost focus',
      copy: '🚫 Copying text is prohibited',
      paste: '🚫 Pasting content is not allowed',
      right_click: '🚫 Right-click menu is disabled',
      fullscreen_exit: '🚨 You exited fullscreen mode',
      devtools_open: '⚠️ Developer tools detected',
    };
    return messages[violationType] || '⚠️ Suspicious activity detected';
  };

  const getWarningLevel = () => {
    if (isCritical) return { color: '#D32F2F', bg: '#FFEBEE', label: 'CRITICAL' };
    if (isNearLimit) return { color: '#B90000', bg: '#FFF3CD', label: 'WARNING' };
    return { color: '#1976D2', bg: '#E3F2FD', label: 'NOTICE' };
  };

  const warningLevel = getWarningLevel();

  if (isAutoSubmit) {
    return (
      <Dialog
        open={open}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#FFEBEE',
            border: '3px solid #D32F2F',
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#D32F2F', color: 'white', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <BlockIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              QUIZ LOCKED
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Maximum Violations Exceeded
            </Typography>
            <Typography variant="body2">
              You have exceeded the maximum number of allowed violations ({maxViolations}).
              Your quiz will be automatically submitted.
            </Typography>
          </Alert>
          
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 2, color: '#666' }}>
            Auto-submitting in: <strong>{countdown}s</strong>
          </Typography>
          
          <LinearProgress
            variant="determinate"
            value={((5 - countdown) / 5) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#D32F2F',
              },
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onContinue}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: warningLevel.bg,
          border: `2px solid ${warningLevel.color}`,
        },
      }}
    >
      <DialogTitle sx={{ backgroundColor: warningLevel.color, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Suspicious Activity Detected
            </Typography>
          </Box>
          <Chip
            label={warningLevel.label}
            size="small"
            sx={{
              backgroundColor: 'white',
              color: warningLevel.color,
              fontWeight: 700,
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Main Alert */}
        <Alert
          severity={isCritical ? 'error' : isNearLimit ? 'warning' : 'info'}
          icon={<EyeIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            All activities are being monitored and recorded.
          </Typography>
          <Typography variant="body2">
            {getMessage()}
          </Typography>
        </Alert>

        {/* Violation Counter */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            backgroundColor: 'white',
            borderRadius: 2,
            mb: 2,
            border: `2px solid ${warningLevel.color}`,
          }}
        >
          <Box>
            <Typography variant="body2" color="textSecondary">
              Total Violations
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: warningLevel.color }}>
              {violationCount} / {maxViolations}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="textSecondary">
              Remaining
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: isCritical ? '#D32F2F' : '#4CAF50' }}>
              {remainingViolations}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Violation Threshold
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: warningLevel.color }}>
              {Math.round((violationCount / maxViolations) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(violationCount / maxViolations) * 100}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: warningLevel.color,
                borderRadius: 6,
              },
            }}
          />
        </Box>

        {/* Warning Messages */}
        {isCritical && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⚠️ FINAL WARNING!
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              One more violation will automatically submit your quiz and notify your teacher.
            </Typography>
          </Alert>
        )}

        {isNearLimit && !isCritical && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You are approaching the violation limit
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              Please focus on completing the quiz without switching tabs or using prohibited actions.
            </Typography>
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
          Your teacher will be notified of all violations when you submit the quiz.
        </Typography>

        {/* Auto-close countdown */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#999' }}>
          This dialog will close in {countdown} seconds
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onContinue}
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: warningLevel.color,
            '&:hover': {
              backgroundColor: warningLevel.color,
              filter: 'brightness(0.9)',
            },
            py: 1.5,
            fontWeight: 600,
          }}
        >
          I Understand, Continue Quiz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AntiCheatWarning;
