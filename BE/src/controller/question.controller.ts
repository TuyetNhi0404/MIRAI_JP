import { Request, Response } from "express";
import questionService from "../service/question.service";
import XLSX from "xlsx";

class QuestionController {
  async create(req: Request, res: Response) {
    try {
      const q = await questionService.createQuestion(req.body);
      return res.status(201).json({ message: "Question created", question: q });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  }

  async listByChapter(req: Request, res: Response) {
    const { chapterId } = req.params;
    if (!chapterId) return res.status(400).json({ message: "chapterId is required" });
    const qs = await questionService.listQuestionsByChapter(chapterId as string);
    return res.json({ questions: qs });
  }

  async listByChapters(req: Request, res: Response) {
    const { chapterIds, all } = req.query;

    const includeAll =
      (typeof all === "string" && all.toLowerCase() === "true") ||
      (Array.isArray(chapterIds) &&
        chapterIds.some((value) => typeof value === "string" && value.toLowerCase() === "all")) ||
      (typeof chapterIds === "string" && chapterIds.toLowerCase() === "all");

    if (includeAll) {
      const questions = await questionService.listAllQuestions();
      return res.json({ questions });
    }

    const ids: string[] = Array.isArray(chapterIds)
      ? (chapterIds as string[]).map((id) => id.trim()).filter(Boolean)
      : typeof chapterIds === "string"
      ? chapterIds.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: "chapterIds is required" });
    }

    const questions = await questionService.listQuestionsByChapters(ids);
    return res.json({ questions });
  }

  async listGrammarQuestions(req: Request, res: Response) {
    try {
      const { level, search } = req.query;
      const questions = await questionService.listGrammarQuestions({
        level: typeof level === "string" ? level : undefined,
        search: typeof search === "string" ? search : undefined,
      });
      return res.json({ success: true, questions });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "id is required" });
    const updated = await questionService.updateQuestion(id as string, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Question updated", question: updated });
  }

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "id is required" });
    await questionService.deleteQuestion(id as string);
    return res.json({ message: "Question deleted" });
  }

  // Upload Excel: columns: question_text, answer_1..4, correct_answer (1..4)
  async uploadExcel(req: Request, res: Response) {
    try { 
      const { chapterId } = req.body;
      if (!chapterId) return res.status(400).json({ message: "chapterId is required" });
      if (!req.file) return res.status(400).json({ message: "File is required" });

      const workbook = XLSX.readFile(req.file.path);
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) return res.status(400).json({ message: "Excel has no sheets" });
      const sheet = workbook.Sheets[firstSheet];
      if (!sheet) return res.status(400).json({ message: "Cannot read first sheet" });
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const created: any[] = [];
      for (const r of rows) {
        const payload = {
          chapterId,
          questionText: String(r.question_text || r.Question || r.question || "").trim(),
          answer1: String(r.answer_1 || r.A || r.answer1 || "").trim(),
          answer2: String(r.answer_2 || r.B || r.answer2 || "").trim(),
          answer3: String(r.answer_3 || r.C || r.answer3 || "").trim(),
          answer4: String(r.answer_4 || r.D || r.answer4 || "").trim(),
          correctAnswer: Number(r.correct_answer || r.correct || r.Answer || 0),
        } as any;

        if (!payload.questionText || !payload.answer1 || !payload.answer2 || !payload.answer3 || !payload.answer4 || ![1,2,3,4].includes(payload.correctAnswer)) {
          continue;
        }
        const q = await questionService.createQuestion(payload);
        created.push(q);
      }

      return res.json({ message: "Imported questions", count: created.length });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  }
}

export default new QuestionController();


