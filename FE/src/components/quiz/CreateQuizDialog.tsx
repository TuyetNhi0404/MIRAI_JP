// src/components/quiz/CreateQuizDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Select,
  InputLabel,
  FormControl,
  Chip,
  OutlinedInput,
  Typography,
} from "@mui/material";
import { useCourse } from "../../hooks/useCourse";
import { useChapter } from "../../hooks/useChapter";
import type { Quiz, CreateQuizRequest, UpdateQuizRequest } from "../../types/quiz.types";
import type { SelectChangeEvent } from '@mui/material';

interface CreateQuizDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateQuizRequest | UpdateQuizRequest) => void;
  editQuiz?: Quiz | null;
}

const CreateQuizDialog: React.FC<CreateQuizDialogProps> = ({
  open,
  onClose,
  onSubmit,
  editQuiz,
}) => {
  const { courses, loadAllCourses } = useCourse();
  const { chapters, loadAllChapters } = useChapter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    chapterIds: [] as string[],
    useAllChapters: false,
    totalQuestions: 10,
    durationMinutes: 30,
    dueDate: "",
  });

  // Load courses and chapters when dialog opens
  useEffect(() => {
    if (open) {
      loadAllCourses();
      loadAllChapters();
    }
  }, [open, loadAllCourses, loadAllChapters]);

  useEffect(() => {
    if (editQuiz) {
      // Format due date for datetime-local input
      const formattedDueDate = editQuiz.dueDate
        ? new Date(editQuiz.dueDate).toISOString().slice(0, 16)
        : "";

      setFormData({
        title: editQuiz.title,
        description: editQuiz.description || "",
        courseId: editQuiz.courseId,
        chapterIds: editQuiz.chapterIds || (editQuiz.chapterId ? [editQuiz.chapterId] : []),
        useAllChapters: editQuiz.coversAllChapters || false,
        totalQuestions: editQuiz.totalQuestions,
        durationMinutes: editQuiz.durationMinutes || 30,
        dueDate: formattedDueDate,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        courseId: "",
        chapterIds: [],
        useAllChapters: false,
        totalQuestions: 10,
        durationMinutes: 30,
        dueDate: "",
      });
    }
  }, [editQuiz, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? checked
        : (name === "totalQuestions" || name === "durationMinutes")
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleChaptersChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      chapterIds: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleUseAllChaptersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormData((prev) => ({
      ...prev,
      useAllChapters: checked,
      chapterIds: checked ? [] : prev.chapterIds,
    }));
  };

  const handleSubmit = () => {
    // Convert due date to ISO string if provided
    const submitData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
    };

    console.log('🚀 Submitting quiz data:', JSON.stringify(submitData, null, 2));
    onSubmit(submitData);
    onClose();
  };

  const isLoading = courses.length === 0 || chapters.length === 0;
  const isValid = formData.title &&
    formData.courseId &&
    (formData.useAllChapters || formData.chapterIds.length > 0);

  // Get minimum datetime (current time)
  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle sx={{ color: "#B90000", fontWeight: 600 }}>
        {editQuiz ? "Edit Quiz" : "Create New Quiz"}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#B90000" }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Quiz Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
            />

            {!editQuiz && (
              <>
                <TextField
                  fullWidth
                  select
                  label="Course"
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="">
                    <em>Select a course</em>
                  </MenuItem>
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </TextField>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.useAllChapters}
                      onChange={handleUseAllChaptersChange}
                      name="useAllChapters"
                      sx={{
                        color: "#B90000",
                        '&.Mui-checked': {
                          color: "#B90000",
                        },
                      }}
                    />
                  }
                  label="Use questions from all chapters"
                />

                {!formData.useAllChapters && (
                  <FormControl fullWidth required>
                    <InputLabel>Chapters</InputLabel>
                    <Select
                      multiple
                      value={formData.chapterIds}
                      onChange={handleChaptersChange}
                      input={<OutlinedInput label="Chapters" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const chapter = chapters.find(c => c._id === value);
                            return (
                              <Chip
                                key={value}
                                label={chapter?.name || value}
                                size="small"
                                sx={{ backgroundColor: "#FFF5E6" }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {chapters.map((chapter) => (
                        <MenuItem key={chapter._id} value={chapter._id}>
                          {chapter.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            <TextField
              fullWidth
              type="number"
              label="Total Questions"
              name="totalQuestions"
              value={formData.totalQuestions}
              onChange={handleChange}
              required
              InputProps={{ inputProps: { min: 1 } }}
            />

            <TextField
              fullWidth
              type="number"
              label="Duration (minutes)"
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 1 } }}
            />

            {/* Due Date Field */}
            <Box>
              <TextField
                fullWidth
                type="datetime-local"
                label="Due Date (Optional)"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: minDateTime,
                }}
                helperText="Quiz will automatically close at this time. Leave empty for no deadline."
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Tip: Set a due date to automatically close the quiz and prevent late submissions
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: "#666" }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            backgroundColor: "#B90000",
            "&:hover": { backgroundColor: "#d66a0e" },
          }}
          disabled={isLoading || !isValid}
        >
          {editQuiz ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateQuizDialog;
