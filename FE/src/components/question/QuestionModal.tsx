// src/components/question/QuestionModal.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import type { IQuestion } from "../../types/question.types";

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    questionText: string;
    answer1: string;
    answer2: string;
    answer3: string;
    answer4: string;
    correctAnswer: number;
  }) => Promise<void>;
  question?: IQuestion | null;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  open,
  onClose,
  onSubmit,
  question,
}) => {
  const [questionText, setQuestionText] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [answer4, setAnswer4] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setQuestionText(question.questionText);
      setAnswer1(question.answer1);
      setAnswer2(question.answer2);
      setAnswer3(question.answer3);
      setAnswer4(question.answer4);
      setCorrectAnswer(question.correctAnswer);
    } else {
      setQuestionText("");
      setAnswer1("");
      setAnswer2("");
      setAnswer3("");
      setAnswer4("");
      setCorrectAnswer(1);
    }
  }, [question, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        questionText,
        answer1,
        answer2,
        answer3,
        answer4,
        correctAnswer,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#B90000", color: "white" }}>
        {question ? "Edit Question" : "Create New Question"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
              fullWidth
              multiline
              rows={2}
              autoFocus
            />
            
            <TextField
              label="Answer 1"
              value={answer1}
              onChange={(e) => setAnswer1(e.target.value)}
              required
              fullWidth
            />
            
            <TextField
              label="Answer 2"
              value={answer2}
              onChange={(e) => setAnswer2(e.target.value)}
              required
              fullWidth
            />
            
            <TextField
              label="Answer 3"
              value={answer3}
              onChange={(e) => setAnswer3(e.target.value)}
              required
              fullWidth
            />
            
            <TextField
              label="Answer 4"
              value={answer4}
              onChange={(e) => setAnswer4(e.target.value)}
              required
              fullWidth
            />

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ color: "#B90000", fontWeight: 600 }}>
                Correct Answer
              </FormLabel>
              <RadioGroup
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(Number(e.target.value))}
              >
                <FormControlLabel value={1} control={<Radio />} label="Answer 1" />
                <FormControlLabel value={2} control={<Radio />} label="Answer 2" />
                <FormControlLabel value={3} control={<Radio />} label="Answer 3" />
                <FormControlLabel value={4} control={<Radio />} label="Answer 4" />
              </RadioGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !questionText.trim() || !answer1.trim() || !answer2.trim() || !answer3.trim() || !answer4.trim()}
            sx={{ bgcolor: "#B90000", "&:hover": { bgcolor: "#d66609" } }}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default QuestionModal;
