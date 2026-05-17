// src/components/quiz/QuizStatisticsDialog.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type { QuizStatistics, AntiCheatLog } from "../../types/quiz.types";
import AntiCheatLogsDialog from "./AntiCheatLogsDialog";

interface QuizStatisticsDialogProps {
  open: boolean;
  onClose: () => void;
  statistics: QuizStatistics | null;
  quizId: string;
}

const QuizStatisticsDialog: React.FC<QuizStatisticsDialogProps> = ({
  open,
  onClose,
  statistics,
}) => {
  // State to manage anti-cheat logs dialog
  const [antiCheatDialogOpen, setAntiCheatDialogOpen] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedLogs, setSelectedLogs] = useState<AntiCheatLog[]>([]);

  // Reset state when dialog closes
  const handleClose = () => {
    setAntiCheatDialogOpen(false);
    setSelectedStudentName("");
    setSelectedLogs([]);
    onClose();
  };

  // Handle viewing cheating details
  const handleViewAntiCheatLogs = (studentName: string, logs: AntiCheatLog[]) => {
    setSelectedStudentName(studentName);
    setSelectedLogs(logs || []);
    setAntiCheatDialogOpen(true);
  };

  if (!statistics) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
      >
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#B90000" }} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle sx={{ color: "#B90000", fontWeight: 600 }}>
          Quiz Statistics
        </DialogTitle>
        <DialogContent>
          {/* Summary Cards */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: "#FFF5E6" }}>
              <Typography variant="body2" color="textSecondary">
                Total Attempts
              </Typography>
              <Typography variant="h4" sx={{ color: "#B90000", fontWeight: 700 }}>
                {statistics.totalAttempts}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: "#FFF5E6" }}>
              <Typography variant="body2" color="textSecondary">
                Average Score
              </Typography>
              <Typography variant="h4" sx={{ color: "#B90000", fontWeight: 700 }}>
                {statistics.averageScore}%
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: "#FFF5E6" }}>
              <Typography variant="body2" color="textSecondary">
                Pass Rate
              </Typography>
              <Typography variant="h4" sx={{ color: "#B90000", fontWeight: 700 }}>
                {statistics.passRate}%
              </Typography>
            </Paper>
          </Box>

          {/* Attempts Table */}
          {statistics.attempts.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: "#FFF5E6" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Score
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Percentage
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Time
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Completed At</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Anti-Cheat
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statistics.attempts.map((attempt, index) => {
                    const hasViolations =
                      attempt.antiCheatLogs && attempt.antiCheatLogs.length > 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{attempt.studentName}</TableCell>
                        <TableCell>{attempt.studentEmail}</TableCell>
                        <TableCell align="center">{attempt.score}</TableCell>
                        <TableCell align="center">{attempt.percentage}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={attempt.passed ? <CheckIcon /> : <CancelIcon />}
                            label={attempt.passed ? "Passed" : "Failed"}
                            color={attempt.passed ? "success" : "error"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">{attempt.timeSpent} mins</TableCell>
                        <TableCell>
                          {new Date(attempt.completedAt).toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          {hasViolations ? (
                            <Tooltip title={`${attempt.antiCheatLogs!.length} violation(s) detected`}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleViewAntiCheatLogs(
                                    attempt.studentName,
                                    attempt.antiCheatLogs!
                                  )
                                }
                                sx={{
                                  color: "#B90000",
                                  "&:hover": { backgroundColor: "#FFF3CD" },
                                }}
                              >
                                <WarningIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Chip
                              label="Clean"
                              size="small"
                              sx={{
                                backgroundColor: "#E8F5E9",
                                color: "#4CAF50",
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" sx={{ textAlign: "center", py: 4, color: "#666" }}>
              No attempts yet
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              backgroundColor: "#B90000",
              "&:hover": { backgroundColor: "#d66a0e" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Anti-Cheat Logs Dialog */}
      <AntiCheatLogsDialog
        open={antiCheatDialogOpen}
        onClose={() => setAntiCheatDialogOpen(false)}
        studentName={selectedStudentName}
        logs={selectedLogs}
      />
    </>
  );
};

export default QuizStatisticsDialog;
