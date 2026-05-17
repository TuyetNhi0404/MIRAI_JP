// src/pages/Student/TakeQuizPage.tsx - FIXED VERSION
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Timer as TimerIcon,
  Send as SubmitIcon,
  ArrowBack as BackIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import { useAntiCheat } from "../../hooks/useAntiCheat";
import AntiCheatWarning from "../../components/quiz/AntiCheatWarning";
import type { UserWithId } from "../../types/quiz.types";

const TakeQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { currentQuiz, loading, error, beginQuiz, submitQuizAnswers } = useQuiz();

  // Anti-Cheat Hook với config
  const {
    logs,
    violationCount,
    isFullscreen,
    isLocked,
    showWarning,
    currentWarningType,
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    exitFullscreen,
    getSummary,
    shouldAutoSubmit,
    maxViolations,
  } = useAntiCheat({
    maxViolations: 5,
    enableFullscreen: true,
    enableDevToolsDetection: true,
    enableCopyPasteBlock: true,
    enableContextMenuBlock: true,
    enableTabSwitchDetection: true,
    warningDuration: 5000,
  });

  // Quiz State
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showAutoSubmitDialog, setShowAutoSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const hasStartedMonitoring = useRef(false);
  const autoSubmitTriggered = useRef(false);

  /**
   * ============================================
   * LOAD QUIZ & START MONITORING - FIXED
   * ============================================
   */
  useEffect(() => {
    if (quizId && !hasStartedMonitoring.current) {
      const userId = user?._id || (user as UserWithId)?.id;
      
      beginQuiz(quizId, userId).then(() => {
        // ✅ FIX: Start monitoring AFTER quiz is loaded
        console.log('✅ Quiz loaded, starting anti-cheat monitoring...');
        startMonitoring();
        hasStartedMonitoring.current = true;
      });
    }

    return () => {
      if (hasStartedMonitoring.current) {
        stopMonitoring();
        hasStartedMonitoring.current = false;
      }
    };
  }, [quizId, beginQuiz, user, startMonitoring, stopMonitoring]);

  /**
   * ============================================
   * TIMER SETUP
   * ============================================
   */
  useEffect(() => {
    if (currentQuiz?.durationMinutes) {
      setTimeLeft(currentQuiz.durationMinutes * 60);
    }
  }, [currentQuiz]);

  useEffect(() => {
    if (timeLeft > 0 && !isLocked && !isSubmitting) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit('time_expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isLocked, isSubmitting]);

  /**
   * ============================================
   * AUTO-SUBMIT ON MAX VIOLATIONS
   * ============================================
   */
  useEffect(() => {
    if (shouldAutoSubmit() && !autoSubmitTriggered.current && !isSubmitting) {
      autoSubmitTriggered.current = true;
      setShowAutoSubmitDialog(true);
      
      // Auto submit after 5 seconds
      setTimeout(() => {
        handleAutoSubmit('max_violations');
      }, 5000);
    }
  }, [shouldAutoSubmit, isSubmitting]);

  /**
   * ============================================
   * HANDLE ANSWER CHANGE
   * ============================================
   */
  const handleAnswerChange = useCallback((questionIndex: number, answerValue: number) => {
    if (isLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerValue,
    }));
  }, [isLocked]);

  /**
   * ============================================
   * SUBMIT HANDLERS
   * ============================================
   */
  const handleAutoSubmit = useCallback(async (reason: 'time_expired' | 'max_violations') => {
    if (isSubmitting) return;
    await handleSubmitQuiz(true, reason);
  }, [isSubmitting]);

  const handleSubmitQuiz = useCallback(async (isAuto = false, reason?: string) => {
    if (!currentQuiz || !quizId || isSubmitting) return;

    setIsSubmitting(true);
    stopMonitoring();

    const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
    const answerArray = currentQuiz.questions.map((_, index) => answers[index] || 0);
    const userId = user?._id || (user as UserWithId)?.id;

    try {
      await submitQuizAnswers(quizId, {
        answers: answerArray,
        timeSpent: timeSpentMinutes,
        studentId: userId,
        antiCheatLogs: logs,
      });

      navigate("/dashboard/student/quizzes", {
        state: {
          message: isAuto
            ? `Quiz automatically submitted due to: ${reason === 'time_expired' ? 'Time Expired' : 'Excessive Violations'}`
            : "Quiz submitted successfully!",
          isAutoSubmit: isAuto,
        },
      });
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setIsSubmitting(false);
      startMonitoring(); // Resume monitoring if failed
    }
  }, [currentQuiz, quizId, answers, startTime, user, logs, submitQuizAnswers, navigate, stopMonitoring, isSubmitting, startMonitoring]);

  const handleSubmitClick = useCallback(() => {
    if (isLocked) return;

    const unanswered = currentQuiz?.questions.filter((_, index) => !answers[index]).length || 0;

    if (unanswered > 0) {
      setShowSubmitDialog(true);
    } else {
      handleSubmitQuiz();
    }
  }, [currentQuiz, answers, isLocked, handleSubmitQuiz]);

  /**
   * ============================================
   * HELPER FUNCTIONS
   * ============================================
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgress = () => {
    if (!currentQuiz) return 0;
    const answered = Object.keys(answers).length;
    return (answered / currentQuiz.questions.length) * 100;
  };

  const getTimeColor = () => {
    if (timeLeft < 60) return "error";
    if (timeLeft < 300) return "warning";
    return "default";
  };

  const summary = getSummary();
  const hasViolations = summary.totalViolations > 0;

  /**
   * ============================================
   * LOADING & ERROR STATES
   * ============================================
   */
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: "#B90000" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/dashboard/student/quizzes")}
          sx={{ color: "#B90000" }}
        >
          Back to Quizzes
        </Button>
      </Box>
    );
  }

  if (!currentQuiz) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="textSecondary">
          Quiz not found
        </Typography>
      </Box>
    );
  }

  /**
   * ============================================
   * MAIN RENDER
   * ============================================
   */
  return (
    <Box>
      {/* Anti-Cheat Notice */}
      <Alert
        severity="info"
        sx={{ mb: 3 }}
        icon={<WarningIcon />}
        action={
          <Tooltip title="View details about anti-cheat system">
            <IconButton size="small" color="inherit">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        }
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          🔒 <strong>This quiz is monitored for academic integrity.</strong> All activities (tab switches, copy/paste, window blur, etc.) are recorded and will be sent to your teacher.
        </Typography>
      </Alert>

      {/* Lock Alert */}
      {isLocked && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<LockIcon />}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            ⚠️ QUIZ LOCKED - Too many violations detected
          </Typography>
          <Typography variant="body2">
            You have exceeded the maximum violation limit. The quiz will be automatically submitted.
          </Typography>
        </Alert>
      )}

      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: isLocked ? "#FFEBEE" : "#FFF5E6" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h4" sx={{ color: isLocked ? "#D32F2F" : "#B90000", fontWeight: 700 }}>
            {currentQuiz.title}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {/* Violations Badge */}
            {hasViolations && (
              <Badge badgeContent={summary.totalViolations} color="error" max={99}>
                <Chip
                  icon={<WarningIcon />}
                  label={`${violationCount}/${maxViolations} Violations`}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Badge>
            )}

            {/* Fullscreen Toggle */}
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              <IconButton
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                disabled={isLocked}
                sx={{
                  backgroundColor: isFullscreen ? "#4CAF50" : "#2196F3",
                  color: "white",
                  "&:hover": {
                    backgroundColor: isFullscreen ? "#388E3C" : "#1976D2",
                  },
                  "&:disabled": {
                    backgroundColor: "#BDBDBD",
                  },
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>

            {/* Timer */}
            {currentQuiz.durationMinutes && (
              <Chip
                icon={<TimerIcon />}
                label={formatTime(timeLeft)}
                color={getTimeColor()}
                sx={{
                  fontSize: "18px",
                  fontWeight: 600,
                  px: 2,
                  py: 3,
                }}
              />
            )}
          </Box>
        </Box>

        {currentQuiz.description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {currentQuiz.description}
          </Typography>
        )}

        {/* Progress Bar */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
            Progress: {Object.keys(answers).length} / {currentQuiz.questions.length} answered
          </Typography>
          <LinearProgress
            variant="determinate"
            value={getProgress()}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#E0E0E0",
              "& .MuiLinearProgress-bar": {
                backgroundColor: isLocked ? "#D32F2F" : "#B90000",
              },
            }}
          />
        </Box>
      </Paper>

      {/* Questions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, opacity: isLocked ? 0.5 : 1 }}>
        {currentQuiz.questions.map((question, index) => (
          <Paper key={question.id} elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Chip
                label={`Q${question.order}`}
                sx={{
                  backgroundColor: answers[index] ? "#4CAF50" : "#B90000",
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 500 }}>
                {question.question}
              </Typography>
            </Box>

            <FormControl component="fieldset" fullWidth disabled={isLocked}>
              <RadioGroup
                value={answers[index] || ""}
                onChange={(e) => handleAnswerChange(index, parseInt(e.target.value))}
              >
                {question.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    value={optIndex + 1}
                    control={
                      <Radio
                        sx={{
                          color: "#B90000",
                          "&.Mui-checked": { color: "#B90000" },
                          "&.Mui-disabled": { color: "#BDBDBD" },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={String.fromCharCode(65 + optIndex)}
                          size="small"
                          sx={{ backgroundColor: "#E0E0E0", fontWeight: 600 }}
                        />
                        <Typography variant="body2">{option}</Typography>
                      </Box>
                    }
                    sx={{
                      border: "1px solid #E0E0E0",
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      mb: 1,
                      "&:hover": { backgroundColor: isLocked ? "transparent" : "#FAFAFA" },
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Paper>
        ))}
      </Box>

      {/* Submit Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, gap: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/dashboard/student/quizzes")}
          sx={{ color: "#666" }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SubmitIcon />}
          onClick={handleSubmitClick}
          disabled={isLocked || isSubmitting}
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0e" },
            "&:disabled": { backgroundColor: "#BDBDBD" },
            px: 4,
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle sx={{ color: "#B90000" }}>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You have <strong>{currentQuiz.questions.filter((_, index) => !answers[index]).length} unanswered questions</strong>.
          </Typography>
          {hasViolations && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ⚠️ {summary.totalViolations} violation(s) detected:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1, fontSize: '13px' }}>
                • Tab switches: {summary.tabSwitches}<br />
                • Window focus loss: {summary.windowBlurs}<br />
                • Copy attempts: {summary.copyEvents}<br />
                • Paste attempts: {summary.pasteEvents}<br />
                • Fullscreen exits: {summary.fullscreenExits}<br />
                • DevTools attempts: {summary.devToolsAttempts}
              </Typography>
            </Alert>
          )}
          <Typography variant="body2" color="textSecondary">
            Are you sure you want to submit?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} sx={{ color: "#666" }}>
            Review Answers
          </Button>
          <Button
            onClick={() => {
              setShowSubmitDialog(false);
              handleSubmitQuiz();
            }}
            variant="contained"
            sx={{ backgroundColor: "#B90000", "&:hover": { backgroundColor: "#d66a0e" } }}
          >
            Submit Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Submit Warning Dialog */}
      <AntiCheatWarning
        open={showAutoSubmitDialog}
        violationType="max_violations"
        violationCount={violationCount}
        maxViolations={maxViolations}
        onContinue={() => {}}
        isAutoSubmit={true}
      />

      {/* Regular Warning Dialog */}
      <AntiCheatWarning
        open={showWarning && !showAutoSubmitDialog}
        violationType={currentWarningType}
        violationCount={violationCount}
        maxViolations={maxViolations}
        onContinue={() => {}}
      />
    </Box>
  );
};

export default TakeQuizPage;
