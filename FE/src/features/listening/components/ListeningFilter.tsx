import React from 'react';
import { Box, TextField, MenuItem, Select, FormControl, InputLabel, Chip } from '@mui/material';

interface ListeningFilterProps {
  topic: string;
  level: string;
  setTopic: (v: string) => void;
  setLevel: (v: string) => void;
}

const topics = [
  { value: 'all', label: 'Tất cả chủ đề' },
  { value: 'daily_life', label: 'Đời sống hàng ngày' },
  { value: 'travel', label: 'Du lịch' },
  { value: 'business', label: 'Công việc/Kinh doanh' },
  { value: 'culture', label: 'Văn hóa' },
];

const levels = ['Tất cả', 'N5', 'N4', 'N3', 'N2', 'N1'];

const ListeningFilter: React.FC<ListeningFilterProps> = ({ topic, level, setTopic, setLevel }) => {
  return (
    <Box sx={{
      display: 'flex',
      gap: 2,
      alignItems: 'center',
      mb: 4,
      p: 2,
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="topic-select-label">Chủ đề</InputLabel>
        <Select
          labelId="topic-select-label"
          value={topic}
          label="Chủ đề"
          onChange={(e) => setTopic(e.target.value)}
          sx={{ borderRadius: '8px' }}
        >
          {topics.map(t => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {levels.map(l => (
          <Chip
            key={l}
            label={l}
            clickable
            onClick={() => setLevel(l === 'Tất cả' ? 'all' : l)}
            sx={{
              fontWeight: 600,
              bgcolor: level === (l === 'Tất cả' ? 'all' : l) ? '#B90000' : 'default',
              color: level === (l === 'Tất cả' ? 'all' : l) ? 'white' : 'text.primary',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                bgcolor: level === (l === 'Tất cả' ? 'all' : l) ? '#990000' : 'rgba(0,0,0,0.08)'
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ListeningFilter;
