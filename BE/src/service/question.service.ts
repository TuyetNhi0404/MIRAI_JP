import mongoose from "mongoose";
import { Question, IQuestion } from "../model/question.model";

class QuestionService {
  async createQuestion(payload: {
    chapterId: string;
    questionText: string;
    correctAnswer: number;
    answer1: string;
    answer2: string;
    answer3: string;
    answer4: string;
  }): Promise<IQuestion> {
    const question = new Question({
      chapterId: new mongoose.Types.ObjectId(payload.chapterId),
      questionText: payload.questionText,
      correctAnswer: payload.correctAnswer,
      answer1: payload.answer1,
      answer2: payload.answer2,
      answer3: payload.answer3,
      answer4: payload.answer4,
    });
    return question.save();
  }

  async listQuestionsByChapter(chapterId: string): Promise<IQuestion[]> {
    return Question.find({ chapterId: new mongoose.Types.ObjectId(chapterId) }).sort({ createdAt: -1 });
  }

  async listQuestionsByChapters(chapterIds: string[]): Promise<IQuestion[]> {
    const uniqueChapterIds = [
      ...new Set(
        chapterIds
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter((id) => id.length > 0)
      ),
    ];
    if (uniqueChapterIds.length === 0) {
      return [];
    }
    const mongooseIds = uniqueChapterIds.map((id) => new mongoose.Types.ObjectId(id));
    return Question.find({ chapterId: { $in: mongooseIds } }).sort({ createdAt: -1 });
  }

  async listAllQuestions(): Promise<IQuestion[]> {
    return Question.find().sort({ createdAt: -1 });
  }

  async updateQuestion(id: string, data: Partial<IQuestion>): Promise<IQuestion | null> {
    return Question.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteQuestion(id: string): Promise<void> {
    await Question.findByIdAndDelete(id);
  }
}

export default new QuestionService();


