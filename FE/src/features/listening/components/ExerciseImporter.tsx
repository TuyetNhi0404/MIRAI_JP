import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button, Typography, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { UploadFile, Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import type { ListeningExercise } from '../types';

interface ExerciseImporterProps {
  open: boolean;
  onImport: (exercises: ListeningExercise[]) => void;
  onClose: () => void;
}

const ExerciseImporter: React.FC<ExerciseImporterProps> = ({ open, onImport, onClose }) => {
  const [previewData, setPreviewData] = useState<ListeningExercise[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Quiz
    const quizHeaders = [['QuestionText', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', 'Explanation']];
    const quizExample = [['Anh ấy làm nghề gì?', 'Bác sĩ', 'Kỹ sư', 'Giáo viên', 'Đầu bếp', 'C', 'Trong đoạn hội thoại anh ấy nói...']];
    const wsQuiz = XLSX.utils.aoa_to_sheet([...quizHeaders, ...quizExample]);
    XLSX.utils.book_append_sheet(wb, wsQuiz, 'Quiz');

    // Sheet 2: FillBlank
    const fbHeaders = [['QuestionText', 'Template', 'Answer1', 'Answer2', 'Answer3', 'Hint1', 'Hint2', 'Hint3']];
    const fbExample = [['Điền từ thích hợp vào chỗ trống', 'Hôm nay trời ___ và ___.', 'nắng', 'đẹp', '', '', '', '']];
    const wsFB = XLSX.utils.aoa_to_sheet([...fbHeaders, ...fbExample]);
    XLSX.utils.book_append_sheet(wb, wsFB, 'FillBlank');

    // Sheet 3: Dictation
    const dictHeaders = [['QuestionText', 'StartTime', 'EndTime', 'CorrectText', 'Variant1', 'Variant2']];
    const dictExample = [['Nghe và chép lại đoạn sau', 10, 25, 'おはようございます。今日はいい天気ですね。', 'おはようございます今日はいい天気ですね', '']];
    const wsDict = XLSX.utils.aoa_to_sheet([...dictHeaders, ...dictExample]);
    XLSX.utils.book_append_sheet(wb, wsDict, 'Dictation');

    XLSX.writeFile(wb, 'exercise_template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const wb = XLSX.read(data, { type: 'binary' });

      const parsed: ListeningExercise[] = [];
      const errs: string[] = [];

      // Parse sheet Quiz
      const wsQuiz = wb.Sheets['Quiz'];
      if (wsQuiz) {
        const rows = XLSX.utils.sheet_to_json<any>(wsQuiz);
        rows.forEach((row, i) => {
          if (!row.QuestionText) {
            errs.push(`Quiz row ${i + 2}: thiếu QuestionText`);
            return;
          }
          if (!row.CorrectAnswer || !['A', 'B', 'C', 'D'].includes(row.CorrectAnswer)) {
            errs.push(`Quiz row ${i + 2}: CorrectAnswer phải là A, B, C hoặc D`);
            return;
          }
          parsed.push({
            id: `quiz_import_${Date.now()}_${i}`,
            type: 'quiz',
            question: String(row.QuestionText),
            options: [
              String(row.OptionA || ''),
              String(row.OptionB || ''),
              String(row.OptionC || ''),
              String(row.OptionD || ''),
            ],
            correctAnswer: 
              row.CorrectAnswer === 'A' ? String(row.OptionA || '') :
              row.CorrectAnswer === 'B' ? String(row.OptionB || '') :
              row.CorrectAnswer === 'C' ? String(row.OptionC || '') :
              String(row.OptionD || ''),
            explanation: row.Explanation ? String(row.Explanation) : undefined,
          });
        });
      }

      // Parse sheet FillBlank
      const wsFB = wb.Sheets['FillBlank'];
      if (wsFB) {
        const rows = XLSX.utils.sheet_to_json<any>(wsFB);
        rows.forEach((row, i) => {
          if (!row.QuestionText || !row.Template) {
            errs.push(`FillBlank row ${i + 2}: thiếu QuestionText hoặc Template`);
            return;
          }
          const templateStr = String(row.Template);
          const blankCount = (templateStr.match(/___/g) || []).length;
          if (blankCount === 0) {
            errs.push(`FillBlank row ${i + 2}: Template không có chỗ trống (___)`);
            return;
          }
          const answers = [];
          const hints = [];
          for (let j = 1; j <= blankCount; j++) {
            if (!row[`Answer${j}`]) {
              errs.push(`FillBlank row ${i + 2}: thiếu Answer${j}`);
              return;
            }
            answers.push(String(row[`Answer${j}`]));
            if (row[`Hint${j}`]) hints.push(String(row[`Hint${j}`]));
          }
          parsed.push({
            id: `fill_import_${Date.now()}_${i}`,
            type: 'fill_blank',
            question: String(row.QuestionText),
            textWithBlanks: templateStr,
            answers,
            hints: hints.length > 0 ? hints : undefined,
          });
        });
      }

      // Parse sheet Dictation
      const wsDict = wb.Sheets['Dictation'];
      if (wsDict) {
        const rows = XLSX.utils.sheet_to_json<any>(wsDict);
        rows.forEach((row, i) => {
          if (!row.QuestionText || !row.CorrectText) {
            errs.push(`Dictation row ${i + 2}: thiếu QuestionText hoặc CorrectText`);
            return;
          }
          if (Number(row.EndTime) <= Number(row.StartTime)) {
            errs.push(`Dictation row ${i + 2}: EndTime phải lớn hơn StartTime`);
            return;
          }
          const variants = [];
          for (let j = 1; j <= 5; j++) {
            if (row[`Variant${j}`]) variants.push(String(row[`Variant${j}`]));
          }
          parsed.push({
            id: `dictation_import_${Date.now()}_${i}`,
            type: 'dictation',
            question: String(row.QuestionText),
            audioSegmentStart: Number(row.StartTime),
            audioSegmentEnd: Number(row.EndTime),
            targetText: String(row.CorrectText),
            acceptableVariants: variants.length > 0 ? variants : undefined,
          });
        });
      }

      setPreviewData(parsed);
      setErrors(errs);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirm = () => {
    onImport(previewData);
    setPreviewData([]);
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Nhập bài tập từ Excel</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ bgcolor: '#f4f6f8', p: 3, borderRadius: 2, textAlign: 'center' }}>
          <Download sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            Bạn cần tải file mẫu Excel về, điền nội dung và upload lại lên hệ thống.
          </Typography>
          <Button variant="outlined" startIcon={<Download />} onClick={downloadTemplate}>
            Tải file mẫu (.xlsx)
          </Button>
        </Box>

        <Box sx={{ border: '2px dashed #ccc', p: 3, borderRadius: 2, textAlign: 'center' }}>
          <Button variant="contained" component="label" startIcon={<UploadFile />} sx={{ mb: 1, bgcolor: '#B90000', '&:hover': { bgcolor: '#990000' } }}>
            Chọn file Excel
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
          </Button>
          {fileName && <Typography variant="body2" color="text.secondary">Đã chọn: {fileName}</Typography>}
        </Box>

        {errors.length > 0 && (
          <Alert severity="error">
            <Typography variant="subtitle2" fontWeight="bold">Phát hiện lỗi:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </Alert>
        )}

        {previewData.length > 0 && errors.length === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Xem trước: {previewData.length} bài tập</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Nội dung câu hỏi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 5).map((ex, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{ex.type === 'quiz' ? 'Trắc nghiệm' : ex.type === 'fill_blank' ? 'Điền từ' : 'Nghe chép'}</TableCell>
                    <TableCell>{ex.question.length > 60 ? ex.question.substring(0, 60) + '...' : ex.question}</TableCell>
                  </TableRow>
                ))}
                {previewData.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">... và {previewData.length - 5} bài tập khác</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={onClose}>Hủy</Button>
              <Button variant="contained" onClick={handleConfirm} sx={{ bgcolor: '#B90000', '&:hover': { bgcolor: '#990000' } }}>
                Xác nhận import
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseImporter;
