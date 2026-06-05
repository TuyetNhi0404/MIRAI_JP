import React from 'react';
import { Box, Typography, IconButton, Chip, Paper, List, ListItem, ListItemText } from '@mui/material';
import { Edit, Delete, Assignment } from '@mui/icons-material';
import type { ListeningExercise } from '../types';

interface ExerciseListProps {
  exercises: ListeningExercise[];
  onEdit: (exercise: ListeningExercise) => void;
  onDelete: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
}

const ExerciseList: React.FC<ExerciseListProps> = ({ exercises, onEdit, onDelete }) => {
  if (exercises.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px dashed #ccc', textAlign: 'center' }}>
        <Assignment sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          Chưa có bài tập nào. Nhấn 'Thêm bài tập' hoặc 'Nhập file' để bắt đầu.
        </Typography>
      </Paper>
    );
  }

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'quiz':
        return <Chip label="Trắc nghiệm" size="small" sx={{ bgcolor: '#ffebee', color: '#B90000', fontWeight: 'bold' }} />;
      case 'fill_blank':
        return <Chip label="Điền từ" size="small" color="warning" sx={{ fontWeight: 'bold' }} />;
      case 'dictation':
        return <Chip label="Nghe chép" size="small" color="info" sx={{ fontWeight: 'bold' }} />;
      default:
        return null;
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa bài tập này?')) {
      onDelete(id);
    }
  };

  return (
    <Paper elevation={0} sx={{ border: '1px solid #eee', borderRadius: 2 }}>
      <List disablePadding>
        {exercises.map((ex, idx) => (
          <ListItem 
            key={ex.id || ex._id || idx} 
            divider={idx !== exercises.length - 1}
            sx={{ 
              py: 2,
              '&:hover': { bgcolor: '#fbfbfb' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', minWidth: 30 }}>
                #{idx + 1}
              </Typography>
              <Box sx={{ minWidth: 90 }}>
                {getTypeChip(ex.type)}
              </Box>
              <ListItemText 
                primary={ex.question}
                primaryTypographyProps={{ 
                  variant: 'body2',
                  sx: { 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: { xs: 200, sm: 400, md: 500 }
                  } 
                }}
              />
              <Box sx={{ display: 'flex', ml: 'auto' }}>
                <IconButton size="small" onClick={() => onEdit(ex)}>
                  <Edit fontSize="small" color="action" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(ex.id || ex._id || '')}>
                  <Delete fontSize="small" color="error" />
                </IconButton>
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ExerciseList;
