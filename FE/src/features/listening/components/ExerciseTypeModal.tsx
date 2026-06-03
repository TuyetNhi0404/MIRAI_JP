import React from 'react';
import { Dialog, DialogTitle, DialogContent, Grid, Card, Typography, Box } from '@mui/material';
import { HelpOutline, EditNote, Headset } from '@mui/icons-material';

interface ExerciseTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'quiz' | 'fill_blank' | 'dictation') => void;
}

const ExerciseTypeModal: React.FC<ExerciseTypeModalProps> = ({ open, onClose, onSelect }) => {
  const types = [
    {
      id: 'quiz' as const,
      icon: <HelpOutline sx={{ fontSize: 48, color: '#B90000', mb: 2 }} />,
      title: 'Quiz (Trắc nghiệm)',
      desc: 'Câu hỏi có 4 đáp án A/B/C/D, chọn 1 đáp án đúng'
    },
    {
      id: 'fill_blank' as const,
      icon: <EditNote sx={{ fontSize: 48, color: '#ed6c02', mb: 2 }} />,
      title: 'Fill in the Blank (Điền từ)',
      desc: 'Điền từ vào chỗ trống, dùng ___ để đánh dấu vị trí trống'
    },
    {
      id: 'dictation' as const,
      icon: <Headset sx={{ fontSize: 48, color: '#0288d1', mb: 2 }} />,
      title: 'Dictation (Nghe chép)',
      desc: 'Nghe và chép lại đoạn audio, gắn với khoảng thời gian cụ thể'
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', color: '#B90000', textAlign: 'center' }}>
        Chọn loại bài tập
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {types.map((t) => (
            <Grid item xs={12} sm={4} key={t.id}>
              <Card
                elevation={0}
                onClick={() => onSelect(t.id)}
                sx={{
                  border: '1px solid #eee',
                  borderRadius: 3,
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-4px)', 
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    borderColor: '#ccc'
                  }
                }}
              >
                {t.icon}
                <Typography variant="h6" fontWeight="bold" gutterBottom>{t.title}</Typography>
                <Typography variant="body2" color="text.secondary">{t.desc}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseTypeModal;
