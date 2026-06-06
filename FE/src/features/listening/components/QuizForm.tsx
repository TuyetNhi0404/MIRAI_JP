import React, { useState } from 'react';
import { Box, TextField, Grid, Radio, RadioGroup, FormControlLabel, Button } from '@mui/material';
import type { QuizExercise } from '../types';

interface QuizFormProps {
  initialData?: QuizExercise;
  onSave: (exercise: QuizExercise) => void;
  onCancel: () => void;
}

const QuizForm: React.FC<QuizFormProps> = ({ initialData, onSave, onCancel }) => {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [options, setOptions] = useState<Record<'A' | 'B' | 'C' | 'D', string>>(() => {
    if (initialData?.options && Array.isArray(initialData.options)) {
      return {
        A: initialData.options[0] || '',
        B: initialData.options[1] || '',
        C: initialData.options[2] || '',
        D: initialData.options[3] || '',
      };
    }
    return { A: '', B: '', C: '', D: '' };
  });
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>(() => {
    if (initialData && Array.isArray(initialData.options)) {
      const idx = initialData.options.indexOf(initialData.correctAnswer);
      if (idx === 0) return 'A';
      if (idx === 1) return 'B';
      if (idx === 2) return 'C';
      if (idx === 3) return 'D';
    }
    return 'A';
  });
  const [explanation, setExplanation] = useState(initialData?.explanation || '');

  const isValid = question.trim() !== '' && options.A.trim() !== '' && options.B.trim() !== '' && options.C.trim() !== '' && options.D.trim() !== '';

  const handleSave = () => {
    if (!isValid) return;
    const exercise: QuizExercise = {
      id: initialData?.id || `quiz_${Date.now()}`,
      type: 'quiz',
      question: question.trim(),
      options: [
        options.A.trim(),
        options.B.trim(),
        options.C.trim(),
        options.D.trim(),
      ],
      correctAnswer: 
        correctAnswer === 'A' ? options.A.trim() :
        correctAnswer === 'B' ? options.B.trim() :
        correctAnswer === 'C' ? options.C.trim() :
        options.D.trim(),
      explanation: explanation.trim() || undefined,
    };
    onSave(exercise);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
      <TextField
        fullWidth
        required
        label="Câu hỏi"
        multiline
        rows={2}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <Box>
        <RadioGroup value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}>
          <Grid container spacing={2}>
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <Grid item xs={12} sm={6} key={opt} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  value={opt}
                  control={<Radio sx={{ color: correctAnswer === opt ? '#B90000' : undefined, '&.Mui-checked': { color: '#B90000' } }} />}
                  label=""
                  sx={{ mr: 1 }}
                />
                <TextField
                  fullWidth
                  label={`Đáp án ${opt}`}
                  value={options[opt]}
                  onChange={(e) => setOptions({ ...options, [opt]: e.target.value })}
                  sx={correctAnswer === opt ? { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#B90000' } } } : {}}
                />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </Box>

      <TextField
        fullWidth
        label="Giải thích đáp án đúng (không bắt buộc)"
        multiline
        rows={2}
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <Button variant="outlined" onClick={onCancel}>Hủy</Button>
        <Button variant="contained" disabled={!isValid} onClick={handleSave} sx={{ bgcolor: '#B90000', '&:hover': { bgcolor: '#990000' } }}>
          Lưu bài tập
        </Button>
      </Box>
    </Box>
  );
};

export default QuizForm;
