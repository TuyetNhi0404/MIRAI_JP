'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  useTheme, 
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider
} from '@mui/material';
import { Plus, CalendarDays, List as ListIcon, Menu as MenuIcon } from 'lucide-react';
import ScheduleCreatorCalendar from './add-ui-schedule';
import ManageScheduleCalendar from '../components/index';

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
      id={`schedule-tabpanel-${index}`}
      aria-labelledby={`schedule-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const tabs = [
  { label: 'Lịch học', icon: <CalendarDays size={16} /> },
  { label: 'Xem lịch học', icon: <ListIcon size={16} /> },
];

export default function AddSchedule() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);



  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setMobileDrawerOpen(false);
  };

  const handleMobileTabSelect = (index: number) => {
    setActiveTab(index);
    setMobileDrawerOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: isMobile ? 1.5 : 3 }}>
      <Paper sx={{ p: isMobile ? 2 : 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
            Quản lý lịch học
          </Typography>
          
          {!isMobile && (
            <Button 
              variant="contained" 
              onClick={() => setActiveTab(0)}
              startIcon={<Plus size={18} />}
            >
              Thêm lịch học
            </Button>
          )}
          

        </Box>

        {/* Desktop Tabs */}
        {!isMobile ? (
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab 
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.icon}
                    {tab.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        ) : (
          // Mobile: Show current tab with menu button
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
            p: 2,
            bgcolor: 'primary.50',
            borderRadius: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {tabs[activeTab].icon}
              <Typography variant="body1" fontWeight={600}>
                {tabs[activeTab].label}
              </Typography>
            </Box>
            <IconButton onClick={() => setMobileDrawerOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Mobile Tab Drawer */}
        <Drawer
          anchor="bottom"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chọn phần
            </Typography>
            <List>
              {tabs.map((tab, index) => (
                <React.Fragment key={index}>
                  <ListItemButton 
                    selected={activeTab === index}
                    onClick={() => handleMobileTabSelect(index)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {tab.icon}
                      <ListItemText primary={tab.label} />
                    </Box>
                  </ListItemButton>
                  {index < tabs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Drawer>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lịch thêm lịch học
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhấp vào một ca học trên lịch dưới đây để tạo lịch học
            </Typography>
          </Box>
          <ScheduleCreatorCalendar />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lịch xem lịch học
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Xem và quản lý các lịch học hiện tại
            </Typography>
          </Box>
          <ManageScheduleCalendar />
        </TabPanel>

        {/* Mobile FAB for Add Schedule */}
        {isMobile && activeTab === 1 && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => setActiveTab(0)}
              sx={{
                borderRadius: '50%',
                width: 56,
                height: 56,
                minWidth: 56,
                boxShadow: 3,
              }}
            >
              <Plus size={24} />
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
