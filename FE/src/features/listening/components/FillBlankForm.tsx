import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Chip, Button } from '@mui/material';
import type { FillBlankExercise } from '../types';

interface FillBlankFormProps {
  initialData?: FillBlankExercise;
  onSave: (exercise: FillBlankExercise) => void;
  onCancel: () => void;
}

const FillBlankForm: React.FC<FillBlankFormProps> = ({ initialData, onSave, onCancel }) => {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [template, setTemplate] = useState(initialData?.textWithBlanks || '');
  const [answers, setAnswers] = useState<string[]>(initialData?.answers || []);
  const [hints, setHints] = useState<string[]>(initialData?.hints || []);

  const blankCount = (template.match(/___/g) || []).length;

  useEffect(() => {
    setAnswers(prev => {
      const arr = [...prev];
      while (arr.length < blankCount) arr.push('');
      return arr.slice(0, blankCount);
    });
    setHints(prev => {
      const arr = [...prev];
      while (arr.length < blankCount) arr.push('');
      return arr.slice(0, blankCount);
    });
  }, [blankCount]);

  const isValid = template.trim() !== '' && question.trim() !== '' && blankCount > 0 && answers.every(a => a.trim() !== '');

  const handleSave = () => {
    if (!isValid) return;
    const exercise: FillBlankExercise = {
      id: initialData?.id || `fill_${Date.now()}`,
      type: 'fill_blank',
      question: question.trim(),
      textWithBlanks: template.trim(),
      answers: answers.map(a => a.trim()),
      hints: hints.some(h => h.trim()) ? hints.map(h => h.trim()) : undefined,
    };
    onSave(exercise);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
      <TextField
        fullWidth
        required
        label="Câu hỏi / Hướng dẫn"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <Box>
        <TextField
          fullWidth
          required
          label="Template câu văn"
          multiline
          rows={3}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          helperText="Dùng ___ (3 dấu gạch dưới) để đánh dấu chỗ trống"
        />
        <Chip 
          label={`Phát hiện ${blankCount} chỗ trống`} 
          color={blankCount > 0 ? 'success' : 'default'} 
          sx={{ mt: 1 }} 
        />
      </Box>

      {blankCount > 0 && (
        <Box sx={{ bgcolor: '#f9f9f9', p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Đáp án cho từng chỗ trống:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {answers.map((ans, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip label={`Ô trống ${i + 1}`} size="small" />
                <TextField
                  required
                  size="small"
                  label="Đáp án"
                  value={ans}
                  onChange={(e) => {
                    const newArr = [...answers];
                    newArr[i] = e.target.value;
                    setAnswers(newArr);
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  placeholder="Gợi ý (không bắt buộc)"
                  value={hints[i] || ''}
                  onChange={(e) => {
                    const newArr = [...hints];
                    newArr[i] = e.target.value;
                    setHints(newArr);
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <Button variant="outlined" onClick={onCancel}>Hủy</Button>
        <Button variant="contained" disabled={!isValid} onClick={handleSave} sx={{ bgcolor: '#B90000', '&:hover': { bgcolor: '#990000' } }}>
          Lưu bài tập
        </Button>
      </Box>
    </Box>
  );
};

export default FillBlankForm;
