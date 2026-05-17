// src/components/quiz/AntiCheatLogsDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as SafeIcon,
  Tab as TabIcon,
  BlurOn as BlurIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Mouse as MouseIcon,
  Fullscreen as FullscreenIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { AntiCheatLog } from '../../types/quiz.types';

interface AntiCheatLogsDialogProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  logs?: AntiCheatLog[];
}

const AntiCheatLogsDialog: React.FC<AntiCheatLogsDialogProps> = ({
  open,
  onClose,
  studentName,
  logs = [],
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return <TabIcon />;
      case 'window_blur':
        return <BlurIcon />;
      case 'copy':
        return <CopyIcon />;
      case 'paste':
        return <PasteIcon />;
      case 'right_click':
        return <MouseIcon />;
      case 'fullscreen_exit':
        return <FullscreenIcon />;
      case 'devtools_open':
        return <CodeIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return 'Tab Switch';
      case 'window_blur':
        return 'Window Blur';
      case 'copy':
        return 'Copy Text';
      case 'paste':
        return 'Paste Content';
      case 'right_click':
        return 'Right Click';
      case 'fullscreen_exit':
        return 'Exit Fullscreen';
      case 'devtools_open':
        return 'DevTools Attempt';
      default:
        return type;
    }
  };

  const getSummary = () => {
    return {
      totalViolations: logs.length,
      tabSwitches: logs.filter(l => l.type === 'tab_switch').length,
      windowBlurs: logs.filter(l => l.type === 'window_blur').length,
      copyEvents: logs.filter(l => l.type === 'copy').length,
      pasteEvents: logs.filter(l => l.type === 'paste').length,
      rightClicks: logs.filter(l => l.type === 'right_click').length,
      fullscreenExits: logs.filter(l => l.type === 'fullscreen_exit').length,
      devToolsAttempts: logs.filter(l => l.type === 'devtools_open').length,
    };
  };

  const summary = getSummary();
  const isClean = logs.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: isClean ? '#E8F5E9' : '#FFF3CD', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isClean ? (
            <SafeIcon sx={{ color: '#4CAF50', fontSize: 28 }} />
          ) : (
            <WarningIcon sx={{ color: '#B90000', fontSize: 28 }} />
          )}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Anti-Cheat Report: {studentName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {isClean ? 'No violations detected' : `${summary.totalViolations} violation(s) detected`}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {isClean ? (
          <Alert severity="success" icon={<SafeIcon />}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              ✅ Clean Submission
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              This student completed the quiz with no suspicious activities detected.
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Summary Cards */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Violation Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {summary.tabSwitches > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TabIcon sx={{ color: '#B90000' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#B90000' }}>
                        {summary.tabSwitches}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Tab Switches
                    </Typography>
                  </Paper>
                )}

                {summary.windowBlurs > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BlurIcon sx={{ color: '#B90000' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#B90000' }}>
                        {summary.windowBlurs}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Window Blurs
                    </Typography>
                  </Paper>
                )}

                {summary.copyEvents > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CopyIcon sx={{ color: '#B90000' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#B90000' }}>
                        {summary.copyEvents}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Copy Attempts
                    </Typography>
                  </Paper>
                )}

                {summary.pasteEvents > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PasteIcon sx={{ color: '#B90000' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#B90000' }}>
                        {summary.pasteEvents}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Paste Attempts
                    </Typography>
                  </Paper>
                )}

                {summary.fullscreenExits > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FullscreenIcon sx={{ color: '#B90000' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#B90000' }}>
                        {summary.fullscreenExits}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Fullscreen Exits
                    </Typography>
                  </Paper>
                )}

                {summary.devToolsAttempts > 0 && (
                  <Paper elevation={1} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CodeIcon sx={{ color: '#D32F2F' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                        {summary.devToolsAttempts}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      DevTools Attempts
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Detailed Logs */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Detailed Activity Log
            </Typography>

            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#F5F5F5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getIcon(log.type)}
                          label={getLabel(log.type)}
                          size="small"
                          sx={{
                            backgroundColor: log.type === 'devtools_open' ? '#FFEBEE' : '#FFF3CD',
                            color: log.type === 'devtools_open' ? '#D32F2F' : '#B90000',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '13px', color: '#666' }}>
                          {log.details || 'No details'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Note:</strong> While violations were detected, they may not necessarily indicate cheating. 
                Use this information along with other assessment factors when evaluating the student's work.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: '#B90000',
            '&:hover': { backgroundColor: '#d66a0e' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AntiCheatLogsDialog;
