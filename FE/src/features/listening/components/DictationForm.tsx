import React, { useState } from 'react';
import { Box, TextField, Grid, Button, Alert, Chip } from '@mui/material';
import type { DictationExercise } from '../types';

interface DictationFormProps {
  initialData?: DictationExercise;
  onSave: (exercise: DictationExercise) => void;
  onCancel: () => void;
}

const DictationForm: React.FC<DictationFormProps> = ({ initialData, onSave, onCancel }) => {
  const [question, setQuestion] = useState(initialData?.question || 'Hãy nghe và chép lại đoạn audio sau');
  const [startTime, setStartTime] = useState<number>(initialData?.startTime || 0);
  const [endTime, setEndTime] = useState<number>(initialData?.endTime || 0);
  const [correctText, setCorrectText] = useState(initialData?.correctText || '');
  const [variants, setVariants] = useState<string>(initialData?.acceptableVariants?.join('\n') || '');

  const isValid = question.trim() !== '' && correctText.trim() !== '' && endTime > startTime;

  const handleSave = () => {
    if (!isValid) return;
    const exercise: DictationExercise = {
      id: initialData?.id || `dictation_${Date.now()}`,
      type: 'dictation',
      question: question.trim(),
      startTime,
      endTime,
      correctText: correctText.trim(),
      acceptableVariants: variants.trim()
        ? variants.split('\n').map(v => v.trim()).filter(Boolean)
        : undefined,
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
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              required
              type="number"
              label="Bắt đầu (giây)"
              inputProps={{ min: 0 }}
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              required
              type="number"
              label="Kết thúc (giây)"
              inputProps={{ min: 0 }}
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value))}
            />
          </Grid>
        </Grid>
        {startTime >= endTime && endTime !== 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Thời gian kết thúc phải lớn hơn thời gian bắt đầu
          </Alert>
        )}
        {endTime > startTime && (
          <Chip label={`Độ dài: ${endTime - startTime} giây`} color="info" sx={{ mt: 2 }} />
        )}
      </Box>

      <TextField
        fullWidth
        required
        label="Đáp án chuẩn"
        multiline
        rows={3}
        value={correctText}
        onChange={(e) => setCorrectText(e.target.value)}
        helperText="Nhập đúng nội dung audio học viên cần nghe và chép lại"
      />

      <TextField
        fullWidth
        label="Cách viết gần đúng được chấp nhận"
        multiline
        rows={2}
        value={variants}
        onChange={(e) => setVariants(e.target.value)}
        helperText="Mỗi dòng là một cách viết được chấp nhận (không bắt buộc)"
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

export default DictationForm;
