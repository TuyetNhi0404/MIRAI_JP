// src/pages/Student/StudentQuizzesPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useQuiz } from "../../hooks/useQuiz";
import { useAppSelector } from "../../hooks/hooks";
import AvailableQuizzes from "../../components/quiz/AvailableQuizzes";
import QuizHistory from "../../components/quiz/QuizHistory";
import type { QuizWithAttempt, UserWithId } from "../../types/quiz.types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quiz-tabpanel-${index}`}
      aria-labelledby={`quiz-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

function isQuizWithAttempt(quiz: unknown): quiz is QuizWithAttempt {
  return (
    typeof quiz === 'object' &&
    quiz !== null &&
    'hasAttempted' in quiz
  );
}

const StudentQuizzesPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const user = useAppSelector((state) => state.auth.user);

  const {
    quizzes,
    attempts,
    loading,
    error,
    loadStudentQuizzes,
    loadStudentHistory,
    resetError
  } = useQuiz();

  const studentQuizzes = quizzes.filter(isQuizWithAttempt);

  useEffect(() => {
    loadStudentQuizzes();

    if (user?._id || (user as UserWithId)?.id) {
      const userId = user?._id || (user as UserWithId)?.id;
      loadStudentHistory({ studentId: userId });
    }
  }, [loadStudentQuizzes, loadStudentHistory, user]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        mb: { xs: 2, sm: 3 },
        px: { xs: 0, sm: 0 }
      }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            color: "#B90000",
            fontWeight: 700,
            mb: { xs: 0.5, sm: 1 },
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Bài kiểm tra
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
        >
          Làm bài kiểm tra và xem kết quả của bạn
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={resetError}
          sx={{
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{
        borderBottom: 1,
        borderColor: "divider",
        mb: { xs: 1, sm: 2 },
        overflow: 'auto'
      }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            minHeight: { xs: 42, sm: 48 },
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 500,
              minHeight: { xs: 42, sm: 48 },
              px: { xs: 1, sm: 2 }
            },
            "& .Mui-selected": {
              color: "#B90000 !important",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#B90000",
            },
          }}
        >
          <Tab label={isMobile ? "Có sẵn" : "Bài kiểm tra hiện có"} />
          <Tab label={isMobile ? "Kết quả" : "Kết quả của tôi"} />
        </Tabs>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{
          display: "flex",
          justifyContent: "center",
          py: { xs: 3, sm: 4 }
        }}>
          <CircularProgress sx={{ color: "#B90000" }} />
        </Box>
      )}

      {/* Tab Panels */}
      {!loading && (
        <>
          <TabPanel value={tabValue} index={0}>
            <AvailableQuizzes quizzes={studentQuizzes} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <QuizHistory attempts={attempts} />
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default StudentQuizzesPage;
