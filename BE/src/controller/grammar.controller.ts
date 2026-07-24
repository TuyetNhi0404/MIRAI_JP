import { Request, Response } from "express";
import GrammarDocument, { GrammarDocumentScope } from "../model/grammarDocument.model";
import GrammarCard from "../model/grammarCard.model";
import { Course } from "../model/course.model";
import { Question } from "../model/question.model";
import { Quiz, QuizAttempt } from "../model/quiz.model";
import { GrammarService } from "../service/grammar.service";
import mongoose from "mongoose";
import { saveUploadFile, deleteUploadArtifacts } from "../utils/uploadStorage";
import { enqueueGrammarPipeline } from "../queue/grammar.queue";

// ─── Phase 6: date helpers ────────────────────────────────────────────────
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "title"]);
const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);

function parseDateParam(value: any, fieldName: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value);
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw new Error(`Tham số ${fieldName} không phải ngày hợp lệ (ISO 8601).`);
  }
  return d;
}

function parseSortParam(sortByRaw: any, orderRaw: any): { sortBy: string; order: 1 | -1 } {
  const sortBy = sortByRaw ? String(sortByRaw) : "createdAt";
  const order = orderRaw ? String(orderRaw).toLowerCase() : "desc";
  if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
    throw new Error(`sortBy không hợp lệ. Chỉ chấp nhận: ${[...ALLOWED_SORT_FIELDS].join(", ")}`);
  }
  if (!ALLOWED_SORT_ORDERS.has(order)) {
    throw new Error(`order không hợp lệ. Chỉ chấp nhận: ${[...ALLOWED_SORT_ORDERS].join(", ")}`);
  }
  return { sortBy, order: order === "asc" ? 1 : -1 };
}

// Phase 5: validate documentId format + ownership for teacher
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

class GrammarController {
  // ─── ADMIN & TEACHER: UPLOAD & OCR DOCUMENT ────────────────────────────────
  async uploadDocument(req: Request, res: Response) {
    try {
      const { title, centerId, level, scope } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: "Vui lòng tải lên file PDF." });
      }
      if (!title || !centerId || !level) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc (title, centerId, level)." });
      }

      const userId = req.id;
      const userRole = req.role;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Không tìm thấy thông tin xác thực." });
      }

      // Phase 5: chỉ admin được set scope = "shared", teacher luôn mặc định "private"
      let docScope: GrammarDocumentScope = "private";
      if (userRole === "admin" && scope === "shared") {
        docScope = "shared";
      }

      // 1. Tạo bản ghi tài liệu gốc với trạng thái "processing"
      const document = await GrammarDocument.create({
        title: title.trim(),
        filePath: file.originalname,
        centerId,
        level,
        status: "processing",
        processingStage: "queued",
        totalPages: 0,
        uploadedBy: new mongoose.Types.ObjectId(userId),
        scope: docScope,
      });

      const filePath = await saveUploadFile(String(document._id), file.originalname, file.buffer);
      const queued = await enqueueGrammarPipeline({
        documentId: String(document._id),
        filePath,
        centerId,
        level: level as "N5" | "N4" | "N3" | "N2" | "N1",
      });

      if (!queued) {
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
      }

      await GrammarDocument.findByIdAndUpdate(document._id, {
        $push: {
          auditLogs: {
            action: "upload",
            userId: new mongoose.Types.ObjectId(userId),
            userRole: userRole || "teacher"
          }
        }
      });

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

  // ─── ADMIN & TEACHER: DANH SÁCH TÀI LIỆU GỐC ─────────────────────────────
  // Phase 5: teacher chỉ thấy tài liệu của mình + tài liệu admin flag "shared"
  // Phase 6: thêm dateFrom/dateTo/sortBy/order
  async getDocuments(req: Request, res: Response) {
    try {
      const { centerId, level, dateFrom, dateTo, sortBy, order } = req.query;
      const filter: any = {};
      if (centerId) filter.centerId = centerId;
      if (level) filter.level = level;

      // Phase 5: scope filter theo role
      if (req.role === "teacher") {
        filter.$or = [
          { uploadedBy: new mongoose.Types.ObjectId(req.id as string) },
          { scope: "shared" },
        ];
      }

      // Phase 6: date filter
      let parsedFrom: Date | undefined;
      let parsedTo: Date | undefined;
      try {
        parsedFrom = parseDateParam(dateFrom, "dateFrom");
        parsedTo = parseDateParam(dateTo, "dateTo");
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e.message });
      }
      if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
        return res.status(400).json({ success: false, message: "dateFrom phải nhỏ hơn hoặc bằng dateTo." });
      }
      if (parsedFrom || parsedTo) {
        filter.createdAt = {};
        if (parsedFrom) filter.createdAt.$gte = parsedFrom;
        if (parsedTo) filter.createdAt.$lte = parsedTo;
      }

      let sortSpec: { sortBy: string; order: 1 | -1 };
      try {
        sortSpec = parseSortParam(sortBy, order);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e.message });
      }

      const documents = await GrammarDocument.find(filter)
        .populate("uploadedBy", "name email")
        .sort({ [sortSpec.sortBy]: sortSpec.order });

      res.json({
        success: true,
        count: documents.length,
        documents: documents.map(doc => ({
          ...doc.toObject(),
          chunkCount: doc.chunks ? doc.chunks.length : 0,
        })),
      });
    } catch (err) {
      console.error("[GrammarController] getDocuments error:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách tài liệu." });
    }
  }

  // ─── Phase 5: STATUS ENDPOINT ──────────────────────────────────────────────
  // GET /api/grammar/documents/:id/status
  // Trả về trạng thái + chunk count + creator để FE poll/refresh
  async getDocumentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "ID tài liệu không hợp lệ." });
      }
      const document = await GrammarDocument.findById(id)
        .populate("uploadedBy", "name email");
      if (!document) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu." });
      }

      // Phase 5: teacher không thấy tài liệu không thuộc quyền (trừ shared)
      if (req.role === "teacher") {
        const isOwner = String(document.uploadedBy?._id || document.uploadedBy) === String(req.id);
        if (!isOwner && document.scope !== "shared") {
          return res.status(403).json({ success: false, message: "Bạn không có quyền xem tài liệu này." });
        }
      }

      const chunkCount = document.chunks ? document.chunks.length : 0;
      const stageProgress: Record<string, number> = {
        queued: 5, ocr: 25, embed: 55, extract: 85, done: 100, failed: 0,
      };

      res.json({
        success: true,
        document: {
          _id: document._id,
          title: document.title,
          status: document.status,
          processingStage: document.processingStage,
          progress: stageProgress[document.processingStage] ?? 0,
          level: document.level,
          centerId: document.centerId,
          scope: document.scope,
          totalPages: document.totalPages,
          uploadedBy: document.uploadedBy,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          chunkCount,
        }
      });
    } catch (err) {
      console.error("[GrammarController] getDocumentStatus error:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy trạng thái tài liệu." });
    }
  }

  // ─── ADMIN & TEACHER: XÓA TÀI LIỆU & CHUNKS LIÊN QUAN ────────────────────
  // Phase 5: teacher chỉ xóa được tài liệu của mình
  async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const document = await GrammarDocument.findById(id);

      if (!document) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu." });
      }

      if (req.role === "teacher" && String(document.uploadedBy) !== String(req.id)) {
        return res.status(403).json({ success: false, message: "Bạn chỉ có thể xóa tài liệu do chính bạn upload." });
      }

      await GrammarDocument.findByIdAndDelete(document._id);
      await deleteUploadArtifacts(String(document._id));

      res.json({ success: true, message: "Đã xóa tài liệu và tất cả dữ liệu vector tương ứng." });
    } catch {
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa tài liệu." });
    }
  }

  // ─── ADMIN & TEACHER: RAG - GỢI Ý THẺ NGỮ PHÁP TỪ AI ─────────────────────
  // Phase 5: teacher chỉ được RAG trên documentId thuộc quyền (của mình hoặc shared)
  async generateDraftCards(req: Request, res: Response) {
    try {
      const { centerId, level, topic, documentId } = req.body;

      if (!centerId || !level || !topic) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin đầu vào (centerId, level, topic)." });
      }

      // Phase 5: IDOR check — teacher không RAG được tài liệu không thuộc quyền
      if (documentId) {
        if (!isValidObjectId(documentId)) {
          return res.status(400).json({ success: false, message: "documentId không hợp lệ." });
        }
        const doc = await GrammarDocument.findById(documentId).select("uploadedBy scope");
        if (!doc) {
          return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu." });
        }
        if (req.role === "teacher") {
          const isOwner = String(doc.uploadedBy) === String(req.id);
          if (!isOwner && doc.scope !== "shared") {
            return res.status(403).json({ success: false, message: "Bạn không có quyền RAG trên tài liệu này." });
          }
        }
      }

      const { draftCards, contextChunksFound } = await GrammarService.generateDraftGrammarCards(
        centerId, level as any, topic, documentId
      );
      res.json({ success: true, draftCards, documentId: documentId || null, contextChunksFound });
    } catch (error: any) {
      console.error("[GrammarController] generateDraftCards error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi AI khi sinh thẻ ngữ pháp." });
    }
  }

  // ─── ADMIN & TEACHER: CRUD GRAMMAR CARDS ───────────────────────────────────
  // Phase 6: thêm dateFrom/dateTo/sortBy/order
  async getGrammarCards(req: Request, res: Response) {
    try {
      const { centerId, level, search, dateFrom, dateTo, sortBy, order } = req.query;
      const filter: any = {};
      if (centerId) filter.centerId = centerId;
      if (level) filter.level = level;
      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        filter.$or = [
          { title: searchRegex },
          { meaningVi: searchRegex },
          { explanation: searchRegex },
          { structure: searchRegex }
        ];
      }

      // Phase 6: date filter
      let parsedFrom: Date | undefined;
      let parsedTo: Date | undefined;
      try {
        parsedFrom = parseDateParam(dateFrom, "dateFrom");
        parsedTo = parseDateParam(dateTo, "dateTo");
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e.message });
      }
      if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
        return res.status(400).json({ success: false, message: "dateFrom phải nhỏ hơn hoặc bằng dateTo." });
      }
      if (parsedFrom || parsedTo) {
        filter.createdAt = {};
        if (parsedFrom) filter.createdAt.$gte = parsedFrom;
        if (parsedTo) filter.createdAt.$lte = parsedTo;
      }

      let sortSpec: { sortBy: string; order: 1 | -1 };
      try {
        sortSpec = parseSortParam(sortBy, order);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e.message });
      }

      const cards = await GrammarCard.find(filter)
        .populate("createdBy", "name email")
        .sort({ [sortSpec.sortBy]: sortSpec.order });

      res.json({ success: true, count: cards.length, cards });
    } catch (err) {
      console.error("[GrammarController] getGrammarCards error:", err);
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

      const existing = await GrammarCard.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thẻ ngữ pháp." });
      }
      if (req.role === "teacher" && String(existing.createdBy) !== String(req.id)) {
        return res.status(403).json({ success: false, message: "Bạn chỉ có thể sửa thẻ do chính bạn tạo." });
      }

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

  // Phase 4: Prometheus-style metrics for Grafana scraping
  async getOpsMetrics(_req: Request, res: Response) {
    try {
      const { getQueue, getDlq } = await import("../queue/grammar.queue");
      const [main, dead] = await Promise.all([getQueue(), getDlq()]);
      const [waiting, active, completed, failed, dlqWaiting] = await Promise.all([
        main.getWaitingCount(),
        main.getActiveCount(),
        main.getCompletedCount(),
        main.getFailedCount(),
        dead.getWaitingCount(),
      ]);
      res.set("Content-Type", "text/plain; version=0.0.4");
      res.send(
        `# HELP grammar_queue_waiting Jobs waiting in main queue\n` +
        `grammar_queue_waiting ${waiting}\n` +
        `# HELP grammar_queue_active Jobs active\n` +
        `grammar_queue_active ${active}\n` +
        `# HELP grammar_queue_completed Jobs completed\n` +
        `grammar_queue_completed ${completed}\n` +
        `# HELP grammar_queue_failed Jobs failed\n` +
        `grammar_queue_failed ${failed}\n` +
        `# HELP grammar_dlq_waiting Jobs in dead letter queue\n` +
        `grammar_dlq_waiting ${dlqWaiting}\n`
      );
    } catch (err) {
      res.status(503).set("Content-Type", "text/plain").send("grammar_metrics_unavailable 1\n");
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

      // 1. Tìm các khóa học mà học sinh đang tham gia (members nhúng trong Course)
      const enrolledCourses = await Course.find({
        members: {
          $elemMatch: {
            userId: new mongoose.Types.ObjectId(userId),
            role: "student",
            deletedAt: null,
          },
        },
      }).select("name");

      if (enrolledCourses.length === 0) {
        return res.json({ success: true, levels: [], cards: [] });
      }

      // 2. Suy ra JLPT level từ tên khóa (vd. "Lớp N4 buổi tối", "JAPANESE_N5_00")
      const levelsSet = new Set<string>();
      const levelPattern = /(?:_|\b)(N[1-5])(?:_|\b)/i;
      enrolledCourses.forEach((course) => {
        const match = course.name?.match(levelPattern);
        if (match) levelsSet.add(match[1].toUpperCase());
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

  // ─── TEACHER: FETCH EXISTING QUESTIONS FROM DB (0đ AI) ──────────────────────
  async teacherFetchExistingQuestions(req: Request, res: Response) {
    try {
      const { grammarCardIds } = req.body;
      if (!grammarCardIds || !Array.isArray(grammarCardIds) || grammarCardIds.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một cấu trúc ngữ pháp." });
      }

      const questions = await GrammarService.getExistingQuizQuestions(grammarCardIds);
      res.json({ success: true, questions });
    } catch (error: any) {
      console.error("[TeacherFetchExistingQuestions] Lỗi:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi lấy câu hỏi từ Ngân hàng." });
    }
  }

  // ─── TEACHER: AUTO GENERATE MCQ QUESTIONS BY GEMINI ─────────────────────────
  async teacherGenerateQuestions(req: Request, res: Response) {
    console.log("[TeacherQuizGen] Bắt đầu gọi sinh câu hỏi. Request body:", {
      grammarCardIdsCount: req.body.grammarCardIds?.length,
      grammarCardIds: req.body.grammarCardIds,
      numQuestions: req.body.numQuestions
    });

    try {
      const { grammarCardIds, numQuestions } = req.body;

      if (!grammarCardIds || !Array.isArray(grammarCardIds) || grammarCardIds.length === 0) {
        console.warn("[TeacherQuizGen] Kiểm tra hợp lệ thất bại: grammarCardIds rỗng hoặc không đúng định dạng.");
        return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một cấu trúc ngữ pháp." });
      }

      console.log("[TeacherQuizGen] Đang gửi yêu cầu sinh câu hỏi tới GrammarService...");
      const questions = await GrammarService.generateQuizQuestions(
        grammarCardIds,
        numQuestions || 5
      );

      console.log(`[TeacherQuizGen] Sinh câu hỏi thành công! Số lượng câu hỏi tạo ra: ${questions?.length}`);
      res.json({ success: true, questions });
    } catch (error: any) {
      console.error("[TeacherQuizGen] Xảy ra lỗi khi sinh câu hỏi:", {
        message: error.message,
        stack: error.stack,
        details: error
      });
      res.status(500).json({ success: false, message: error.message || "Lỗi AI sinh câu hỏi trắc nghiệm." });
    }
  }

  // ─── TEACHER: LƯU QUIZ VÀ CÂU HỎI VÀO KHÓA HỌC ─────────────────────────────────
  async teacherCreateQuiz(req: Request, res: Response) {
    try {
      const { courseId, title, durationMinutes, dueDate, questions } = req.body;
      const userId = req.id;

      if (!courseId || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng điền đủ tiêu đề, lớp học và câu hỏi." });
      }

      if (!dueDate) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn Hạn nộp (Due Date) cho bài kiểm tra." });
      }

      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ success: false, message: "Hạn nộp không hợp lệ." });
      }

      if (parsedDueDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: "Hạn nộp phải lớn hơn thời gian hiện tại." });
      }

      const createdQuestionIds: mongoose.Types.ObjectId[] = [];

      for (const q of questions) {
        let questionId: mongoose.Types.ObjectId;

        if (q.questionId && isValidObjectId(String(q.questionId))) {
          questionId = new mongoose.Types.ObjectId(String(q.questionId));
        } else if (q._id && isValidObjectId(String(q._id))) {
          questionId = new mongoose.Types.ObjectId(String(q._id));
        } else {
          const cardId = q.grammarCardId ? String(q.grammarCardId) : undefined;
          const existing = await Question.findOne({
            questionText: String(q.questionText || "").trim(),
            ...(cardId && isValidObjectId(cardId) ? { grammarCardId: new mongoose.Types.ObjectId(cardId) } : {})
          });

          if (existing) {
            questionId = existing._id as mongoose.Types.ObjectId;
          } else {
            const questionDoc = await Question.create({
              questionText: String(q.questionText || "").trim(),
              correctAnswer: q.correctAnswer,
              answer1: q.answer1,
              answer2: q.answer2,
              answer3: q.answer3,
              answer4: q.answer4,
              explanation: q.explanation,
              grammarCardId: cardId && isValidObjectId(cardId) ? new mongoose.Types.ObjectId(cardId) : undefined
            });
            questionId = questionDoc._id as mongoose.Types.ObjectId;
          }
        }
        createdQuestionIds.push(questionId);
      }

      // 2. Tạo Quiz với questions nhúng (schema quiz.model)
      const quiz = await Quiz.create({
        title,
        courseId: new mongoose.Types.ObjectId(courseId),
        totalQuestions: createdQuestionIds.length,
        durationMinutes: durationMinutes || 15,
        dueDate: parsedDueDate,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(userId),
        questions: createdQuestionIds.map((questionId, index) => ({
          questionId,
          questionOrder: index + 1,
        })),
      });

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

  // ─── ADMIN: XÓA HÀNG LOẠT THẺ NGỮ PHÁP ──────────────────────────────────────────
  async deleteGrammarCardsBatch(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: "Danh sách ID không hợp lệ." });
      }

      // Kiểm tra định dạng ObjectId
      const invalidIds = ids.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: "Có ID thẻ ngữ pháp không hợp lệ." });
      }

      const result = await GrammarCard.deleteMany({ _id: { $in: ids } });

      res.json({
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} thẻ ngữ pháp.`,
        deletedCount: result.deletedCount
      });
    } catch (err: any) {
      console.error("[GrammarController] deleteGrammarCardsBatch error:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa loạt thẻ ngữ pháp." });
    }
  }
}

export default new GrammarController();
