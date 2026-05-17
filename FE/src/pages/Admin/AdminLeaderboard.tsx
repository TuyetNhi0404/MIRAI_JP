import React, { useState } from 'react';
import {
  Box,
  Card,
  Container,
  Tabs,
  Tab,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Trophy, School, Globe } from 'lucide-react';
import CourseLeaderboardTab from '../../components/admin-leaderboard/CourseLeaderboardTab';
import GlobalLeaderboardTab from '../../components/admin-leaderboard/GlobalLeaderboardTab';
import CourseComparisonTab from '../../components/admin-leaderboard/CourseComparisonTab';

const AdminLeaderboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 50%, #fff8f3 100%)', 
      py: isMobile ? 2 : 4,
      px: isMobile ? 2 : 0,
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
          borderRadius: isMobile ? 2 : 3, 
          p: isMobile ? 2 : 3, 
          mb: 3, 
          boxShadow: '0 8px 32px rgba(255,107,53,0.2)' 
        }}>
          <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
            <Trophy size={isMobile ? 28 : 36} color="#fff" />
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color="#fff">
                {isMobile ? 'Admin Leaderboard' : 'Admin Leaderboard Dashboard'}
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {isMobile ? 'Track performance' : 'Manage and track student performance'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Tabs Navigation */}
        <Card sx={{ borderRadius: isMobile ? 2 : 3, mb: 3, boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{
              '& .MuiTab-root': { 
                fontWeight: 600, 
                fontSize: isMobile ? '0.875rem' : '1rem',
                textTransform: 'none',
                minHeight: isMobile ? 48 : 64,
              },
              '& .Mui-selected': { 
                color: '#ff6b35',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#ff6b35',
                height: 3,
              },
            }}
          >
            <Tab 
              label={isMobile ? 'Course' : 'Course Leaderboard'} 
              icon={<School size={isMobile ? 18 : 20} />} 
              iconPosition="start" 
            />
            <Tab 
              label={isMobile ? 'Global' : 'Global Leaderboard'} 
              icon={<Globe size={isMobile ? 18 : 20} />} 
              iconPosition="start" 
            />
            <Tab 
              label={isMobile ? 'Top 1' : 'Top 1 Comparison'} 
              icon={<Trophy size={isMobile ? 18 : 20} />} 
              iconPosition="start" 
            />
          </Tabs>
        </Card>

        {/* Tab Content */}
        <Box>
          {activeTab === 0 && <CourseLeaderboardTab />}
          {activeTab === 1 && <GlobalLeaderboardTab />}
          {activeTab === 2 && <CourseComparisonTab />}
        </Box>
      </Container>
    </Box>
  );
};

export default AdminLeaderboard;
