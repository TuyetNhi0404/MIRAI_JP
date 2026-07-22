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

  async listQuestionsByGrammarCards(grammarCardIds: string[]): Promise<IQuestion[]> {
    const uniqueIds = [
      ...new Set(
        grammarCardIds
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter((id) => id.length > 0)
      ),
    ];
    if (uniqueIds.length === 0) return [];
    const mongooseIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    return Question.find({ grammarCardId: { $in: mongooseIds } })
      .populate("grammarCardId", "title level structure meaningVi")
      .sort({ createdAt: -1 });
  }

  async listGrammarQuestions(filter?: { level?: string; search?: string }): Promise<IQuestion[]> {
    const query: any = { grammarCardId: { $exists: true, $ne: null } };

    let questions = await Question.find(query)
      .populate("grammarCardId", "title level structure meaningVi")
      .sort({ createdAt: -1 });

    if (filter?.level && filter.level !== "ALL") {
      const lvl = filter.level.toUpperCase();
      questions = questions.filter((q: any) => q.grammarCardId?.level?.toUpperCase() === lvl);
    }

    if (filter?.search) {
      const s = filter.search.toLowerCase().trim();
      questions = questions.filter((q: any) =>
        (q.questionText && q.questionText.toLowerCase().includes(s)) ||
        (q.grammarCardId?.title && q.grammarCardId.title.toLowerCase().includes(s)) ||
        (q.grammarCardId?.meaningVi && q.grammarCardId.meaningVi.toLowerCase().includes(s)) ||
        (q.explanation && q.explanation.toLowerCase().includes(s))
      );
    }

    return questions;
  }

  async deleteQuestion(id: string): Promise<void> {
    await Question.findByIdAndDelete(id);
  }
}

export default new QuestionService();


