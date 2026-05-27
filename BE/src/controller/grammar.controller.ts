import { Request, Response } from "express";
import GrammarDocument from "../model/grammarDocument.model";
import GrammarChunk from "../model/grammarChunk.model";
import GrammarCard from "../model/grammarCard.model";
import { CourseMember } from "../model/courseMember.model";
import { Course } from "../model/course.model";
import { Question } from "../model/question.model";
import { Quiz, QuizAttempt } from "../model/quiz.model";
import { QuizQuestion } from "../model/quizQuestion.model";
import { GrammarService } from "../service/grammar.service";
import mongoose from "mongoose";

class GrammarController {
  // ─── ADMIN: UPLOAD & OCR DOCUMENT ──────────────────────────────────────────
  async uploadDocument(req: Request, res: Response) {
    try {
      const { title, centerId, level } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: "Vui lòng tải lên file PDF." });
      }
      if (!title || !centerId || !level) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc (title, centerId, level)." });
      }

      const userId = req.id; // Lấy từ verifyToken middleware
      if (!userId) {
        return res.status(401).json({ success: false, message: "Không tìm thấy thông tin xác thực." });
      }

      // 1. Tạo bản ghi tài liệu gốc với trạng thái "processing"
      const document = await GrammarDocument.create({
        title: title.trim(),
        filePath: file.originalname,
        centerId,
        level,
        status: "processing",
        totalPages: 0,
        uploadedBy: new mongoose.Types.ObjectId(userId)
      });

      // 2. Chạy tác vụ nền (Background Task) để gọi FastAPI OCR + sinh vector chunks
      // Chạy không đồng bộ để trả phản hồi cho Admin ngay lập tức
      setTimeout(() => {
        GrammarService.processAndIndexDocument(
          document._id as string,
          file.buffer,
          file.originalname,
          centerId,
          level as any
        ).catch(err => {
          console.error(`[Background OCR] Lỗi xử lý tài liệu ${document._id}:`, err);
        });
      }, 0);

      res.status(202).json({
        success: true,
        message: "Tài liệu đang được đưa vào hàng đợi để OCR và chia nhỏ vector.",
        document
      });

    } catch (error: any) {
      console.error("[GrammarController] uploadDocument error:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi upload tài liệu." });
    }
  }

  // ─── ADMIN: DANH SÁCH TÀI LIỆU GỐC ─────────────────────────────────────────
  async getDocuments(req: Request, res: Response) {
    try {
      const { centerId, level } = req.query;
      const filter: any = {};
      if (centerId) filter.centerId = centerId;
      if (level) filter.level = level;

      const documents = await GrammarDocument.find(filter)
        .populate("uploadedBy", "name email")
        .sort({ createdAt: -1 });

      res.json({ success: true, documents });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách tài liệu." });
    }
  }

  // ─── ADMIN: XÓA TÀI LIỆU & CHUNKS LIÊN QUAN ──────────────────────────────────
  async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const document = await GrammarDocument.findById(id);

      if (!document) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu." });
      }

      // Xóa các chunks vector liên quan trước
      await GrammarChunk.deleteMany({ documentId: document._id });
      // Xóa tài liệu gốc
      await GrammarDocument.findByIdAndDelete(document._id);

      res.json({ success: true, message: "Đã xóa tài liệu và tất cả dữ liệu vector tương ứng." });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa tài liệu." });
    }
  }

  // ─── ADMIN: RAG - GỢI Ý THẺ NGỮ PHÁP TỪ AI ─────────────────────────────────
  async generateDraftCards(req: Request, res: Response) {
    try {
      const { centerId, level, topic } = req.body;

      if (!centerId || !level || !topic) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin đầu vào (centerId, level, topic)." });
      }

      const draftCards = await GrammarService.generateDraftGrammarCards(centerId, level as any, topic);
      res.json({ success: true, draftCards });
    } catch (error: any) {
      console.error("[GrammarController] generateDraftCards error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi AI khi sinh thẻ ngữ pháp." });
    }
  }

  // ─── ADMIN & TEACHER: CRUD GRAMMAR CARDS ────────────────────────────────────
  async getGrammarCards(req: Request, res: Response) {
    try {
      const { centerId, level, search } = req.query;
      const filter: any = {};
      if (centerId) filter.centerId = centerId;
      if (level) filter.level = level;
      if (search) {
        filter.title = { $regex: search, $options: "i" };
      }

      const cards = await GrammarCard.find(filter)
        .populate("createdBy", "name email")
        .sort({ title: 1 });

      res.json({ success: true, cards });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách thẻ ngữ pháp." });
    }
  }

  async createGrammarCard(req: Request, res: Response) {
    try {
      const { centerId, level, title, structure, meaningVi, explanation, examples } = req.body;
      const userId = req.id;

      if (!centerId || !level || !title || !structure || !meaningVi || !explanation) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ các trường bắt buộc." });
      }

      const card = await GrammarCard.create({
        centerId,
        level,
        title: title.trim(),
        structure: structure.trim(),
        meaningVi: meaningVi.trim(),
        explanation: explanation.trim(),
        examples: Array.isArray(examples) ? examples : [],
        createdBy: new mongoose.Types.ObjectId(userId)
      });

      res.status(201).json({ success: true, card });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Lỗi khi tạo thẻ ngữ pháp: " + err.message });
    }
  }

  async updateGrammarCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, structure, meaningVi, explanation, examples, level } = req.body;

      const card = await GrammarCard.findByIdAndUpdate(
        id,
        {
          ...(title && { title: title.trim() }),
          ...(structure && { structure: structure.trim() }),
          ...(meaningVi && { meaningVi: meaningVi.trim() }),
          ...(explanation && { explanation: explanation.trim() }),
          ...(examples && { examples }),
          ...(level && { level })
        },
        { new: true }
      );

      if (!card) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thẻ ngữ pháp." });
      }

      res.json({ success: true, card });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật thẻ ngữ pháp." });
    }
  }

  async deleteGrammarCard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const card = await GrammarCard.findByIdAndDelete(id);

      if (!card) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thẻ ngữ pháp." });
      }

      res.json({ success: true, message: "Đã xóa thẻ ngữ pháp thành công." });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa thẻ ngữ pháp." });
    }
  }

  // ─── STUDENT: GET PRACTICE CARDS BY ENROLLED LEVELS ──────────────────────────
  async getStudentPracticeCards(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Chưa xác thực người dùng." });
      }

      // 1. Tìm tất cả các lớp học hoạt động mà học sinh này đang tham gia
      const enrolledCourses = await CourseMember.find({
        userId: new mongoose.Types.ObjectId(userId),
        role: "student",
        deletedAt: null
      }).populate("courseId");

      if (enrolledCourses.length === 0) {
        return res.json({ success: true, levels: [], cards: [] });
      }

      // 2. Trích xuất các levels từ các khóa học đó
      const levelsSet = new Set<string>();
      enrolledCourses.forEach((member: any) => {
        if (member.courseId && member.courseId.level) {
          levelsSet.add(member.courseId.level);
        }
      });
      const activeLevels = Array.from(levelsSet);

      if (activeLevels.length === 0) {
        return res.json({ success: true, levels: [], cards: [] });
      }

      // 3. Truy vấn các Grammar Cards thuộc các level này
      const cards = await GrammarCard.find({
        level: { $in: activeLevels }
      }).sort({ level: 1, title: 1 });

      res.json({
        success: true,
        levels: activeLevels,
        cards
      });
    } catch (err: any) {
      console.error("[StudentGrammar] error:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi tải bài học ngữ pháp." });
    }
  }

  // ─── TEACHER: AUTO GENERATE MCQ QUESTIONS BY GEMINI ─────────────────────────
  async teacherGenerateQuestions(req: Request, res: Response) {
    try {
      const { grammarCardIds, numQuestions } = req.body;

      if (!grammarCardIds || !Array.isArray(grammarCardIds) || grammarCardIds.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một cấu trúc ngữ pháp." });
      }

      const questions = await GrammarService.generateQuizQuestions(
        grammarCardIds,
        numQuestions || 5
      );

      res.json({ success: true, questions });
    } catch (error: any) {
      console.error("[TeacherQuizGen] error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi AI sinh câu hỏi trắc nghiệm." });
    }
  }

  // ─── TEACHER: LƯU QUIZ VÀ CÂU HỎI VÀO KHÓA HỌC ─────────────────────────────────
  async teacherCreateQuiz(req: Request, res: Response) {
    try {
      const { courseId, title, durationMinutes, questions } = req.body;
      const userId = req.id;

      if (!courseId || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng điền đủ tiêu đề, lớp học và câu hỏi." });
      }

      // 1. Tìm/tạo Chapter phụ trách Quiz này nếu có, hoặc tạo thẳng
      // Ở đây ta tạo thẳng các Question và Quiz gán trực tiếp cho Course
      const createdQuestionIds: mongoose.Types.ObjectId[] = [];
      
      for (const q of questions) {
        const questionDoc = await Question.create({
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          answer1: q.answer1,
          answer2: q.answer2,
          answer3: q.answer3,
          answer4: q.answer4,
          grammarCardId: q.grammarCardId ? new mongoose.Types.ObjectId(q.grammarCardId) : undefined
        });
        createdQuestionIds.push(questionDoc._id as mongoose.Types.ObjectId);
      }

      // 2. Tạo Quiz mới
      const quiz = await Quiz.create({
        title,
        courseId: new mongoose.Types.ObjectId(courseId),
        totalQuestions: createdQuestionIds.length,
        durationMinutes: durationMinutes || 15,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(userId)
      });

      // 3. Tạo ánh xạ câu hỏi vào Quiz qua QuizQuestion map
      for (let index = 0; index < createdQuestionIds.length; index++) {
        await QuizQuestion.create({
          quizId: quiz._id,
          questionId: createdQuestionIds[index],
          questionOrder: index + 1
        });
      }

      res.status(201).json({
        success: true,
        message: "Tạo bài Quiz ngữ pháp thành công.",
        quizId: quiz._id
      });

    } catch (err: any) {
      console.error("[TeacherCreateQuiz] error:", err);
      res.status(500).json({ success: false, message: "Lỗi hệ thống khi tạo đề thi Quiz." });
    }
  }

  // ─── TEACHER: XEM ĐIỂM SỐ HỌC SINH LÀM QUIZ NGỮ PHÁP ────────────────────────────
  async getQuizAttempts(req: Request, res: Response) {
    try {
      const { quizId } = req.params;

      const attempts = await QuizAttempt.find({ quizId })
        .populate("studentId", "name email")
        .sort({ score: -1, completedAt: -1 });

      res.json({ success: true, attempts });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy lịch sử làm bài học viên." });
    }
  }
}

export default new GrammarController();
