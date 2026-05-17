import { Request, Response } from "express";
import quizService from "../service/quiz.service";
import NotificationService from "../service/notification.service";
import mongoose from "mongoose";

class QuizController {
  // Tạo quiz mới (teacher/admin)
  async createQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const {
        title,
        description,
        courseId,
        lessonId,
        chapterId,
        chapterIds,
        useAllChapters,
        totalQuestions,
        durationMinutes,
        createdBy,
        dueDate,
      } = req.body;

      let dueDateValue: Date | undefined;
      if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({ message: "Invalid due date" });
        }
        if (parsedDueDate.getTime() <= Date.now()) {
          return res.status(400).json({ message: "Due date must be greater than the current time" });
        }
        dueDateValue = parsedDueDate;
      }

      const normalizedChapterIds: string[] = Array.isArray(chapterIds)
        ? chapterIds
          .map((id: string) => (typeof id === "string" ? id.trim() : ""))
          .filter((id: string) => id.length > 0)
        : typeof chapterIds === "string"
          ? chapterIds.split(",").map((id: string) => id.trim()).filter(Boolean)
          : [];

      const singleChapterId =
        typeof chapterId === "string" && chapterId.trim().length > 0 ? chapterId.trim() : undefined;

      const useAll =
        typeof useAllChapters === "string"
          ? useAllChapters.toLowerCase() === "true"
          : Boolean(useAllChapters);

      const hasAnyChapter = useAll || Boolean(singleChapterId) || normalizedChapterIds.length > 0;

      if (!title || !courseId || !hasAnyChapter || !totalQuestions) {
        return res.status(400).json({ message: "Required information is missing" });
      }

      // Sử dụng createdBy từ body hoặc default
      const creatorId = createdBy || "64f1a2b3c4d5e6f7g8h9i0j1"; // Default user ID

      const quiz = await quizService.createQuiz(
        {
          title,
          description,
          courseId,
          lessonId,
          chapterId: singleChapterId,
          chapterIds: normalizedChapterIds,
          useAllChapters: useAll,
          totalQuestions,
          durationMinutes,
          dueDate: dueDateValue,
        },
        creatorId
      );

      // 🔔 Notify students about new quiz
      try {
        await NotificationService.notifyNewQuiz({
          courseId,
          quizId: (quiz._id as mongoose.Types.ObjectId).toString(),
          quizTitle: title,
          dueDate: dueDateValue,
        });
      } catch (notifErr) {
        console.error("⚠️ Error sending new quiz notification:", notifErr);
      }

      return res.status(201).json({
        message: "Quiz created successfully",
        quiz,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Lấy danh sách quiz theo course
  async getQuizzesByCourse(req: Request, res: Response): Promise<Response> {
    try {
      const { courseId } = req.params;
      if (!courseId) return res.status(400).json({ message: "courseId is required" });
      const quizzes = await quizService.getQuizzesByCourse(courseId as string);

      return res.json({
        message: "Get quiz list successfully",
        quizzes,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async getQuizQuestions(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) {
        return res.status(400).json({ message: "quizId is required" });
      }

      const { includeCorrectAnswers } = req.query;
      const includeAnswers =
        includeCorrectAnswers === undefined ? true : includeCorrectAnswers === "true";

      // Tất cả teacher đều có thể xem câu hỏi quiz
      // Không cần truyền createdBy vì đã được authorize ở route middleware
      const data = await quizService.getQuizQuestions(quizId as string, {
        includeCorrectAnswers: includeAnswers,
      });

      return res.json({
        message: "Get quiz questions list successfully",
        ...data,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Danh sách quiz với filter tùy chọn
  async getQuizzes(req: Request, res: Response): Promise<Response> {
    try {
      const { courseId, chapterId } = req.query;
      const quizzes = await quizService.getQuizzes({
        courseId: typeof courseId === "string" ? courseId : undefined,
        chapterId: typeof chapterId === "string" ? chapterId : undefined,
      });
      return res.json({ message: "Get quiz list successfully", quizzes });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Lấy danh sách quiz của các course mà student đã tham gia
  async getStudentQuizzes(req: Request, res: Response): Promise<Response> {
    try {
      // Lấy studentId từ JWT token (đã được verify qua middleware)
      const studentId = req.id;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const quizzes = await quizService.getQuizzesForStudent(studentId);
      return res.json({
        message: "Get quiz list successfully",
        quizzes,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Student bắt đầu làm quiz
  async startQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const { studentId } = req.query;

      // Sử dụng studentId từ query hoặc default
      const userId = (studentId as string) || "64f1a2b3c4d5e6f7g8h9i0j2"; // Default student ID

      const quiz = await quizService.startQuiz(quizId as string, userId);

      return res.json({ message: "Start quiz successfully", quiz });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Student nộp bài quiz
  async submitQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const { answers, timeSpent, studentId } = req.body;

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Invalid answers" });
      }

      if (timeSpent === undefined || timeSpent < 0) {
        return res.status(400).json({ message: "Invalid time spent" });
      }

      // Sử dụng studentId từ body hoặc default
      const userId = studentId || "64f1a2b3c4d5e6f7g8h9i0j2"; // Default student ID

      const result = await quizService.submitQuiz(quizId as string, userId, answers, timeSpent);

      return res.json({
        message: "Quiz submitted successfully",
        result,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Lấy lịch sử làm quiz của student
  async getStudentQuizHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { courseId, studentId } = req.query;

      // Sử dụng studentId từ query hoặc default
      const userId = (studentId as string) || "64f1a2b3c4d5e6f7g8h9i0j2"; // Default student ID

      const history = await quizService.getStudentQuizHistory(userId, courseId as string);

      return res.json({
        message: "Get quiz history successfully",
        history,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Lấy kết quả chi tiết của một attempt
  async getAttemptResult(req: Request, res: Response): Promise<Response> {
    try {
      const { attemptId } = req.params;
      if (!attemptId) return res.status(400).json({ message: "attemptId is required" });
      const { studentId } = req.query;

      // Sử dụng studentId từ query hoặc default
      const userId = (studentId as string) || "64f1a2b3c4d5e6f7g8h9i0j2"; // Default student ID

      const result = await quizService.getAttemptResult(attemptId as string, userId);

      return res.json({
        message: "Get quiz result successfully",
        result,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Lấy thống kê quiz cho teacher
  async getQuizStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const { createdBy } = req.query;

      // Sử dụng createdBy từ query hoặc default
      const creatorId = (createdBy as string) || "64f1a2b3c4d5e6f7g8h9i0j1"; // Default teacher ID

      const statistics = await quizService.getQuizStatistics(quizId as string, creatorId);

      return res.json({
        message: "Get quiz statistics successfully",
        statistics,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Cập nhật quiz (teacher/admin)
  async updateQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const { createdBy, chapterIds, useAllChapters, ...rest } = req.body;

      let normalizedChapterIds: string[] | null | undefined;
      if (Array.isArray(chapterIds)) {
        normalizedChapterIds = chapterIds.map((id: string) => id.trim()).filter(Boolean);
      } else if (typeof chapterIds === "string") {
        normalizedChapterIds = chapterIds.split(",").map((id: string) => id.trim()).filter(Boolean);
      } else if (chapterIds === null) {
        normalizedChapterIds = null;
      }

      let normalizedUseAll: boolean | undefined;
      if (typeof useAllChapters === "boolean") {
        normalizedUseAll = useAllChapters;
      } else if (typeof useAllChapters === "string") {
        normalizedUseAll = useAllChapters.toLowerCase() === "true";
      }

      // Sử dụng createdBy từ body hoặc default
      const creatorId = createdBy || "64f1a2b3c4d5e6f7g8h9i0j1"; // Default teacher ID

      const trimmedChapterId =
        typeof rest.chapterId === "string" ? rest.chapterId.trim() : rest.chapterId;

      if (rest.dueDate !== undefined) {
        if (rest.dueDate === null || rest.dueDate === "") {
          rest.dueDate = null;
        } else {
          const parsedDueDate = new Date(rest.dueDate);
          if (isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ message: "Invalid due date" });
          }
          if (parsedDueDate.getTime() <= Date.now()) {
            return res.status(400).json({ message: "Due date must be greater than the current time" });
          }
          rest.dueDate = parsedDueDate;
        }
      }

      const quiz = await quizService.updateQuiz(
        quizId as string,
        {
          ...rest,
          chapterId: trimmedChapterId === "" ? null : trimmedChapterId,
          chapterIds: normalizedChapterIds,
          useAllChapters: normalizedUseAll,
        },
        creatorId
      );

      return res.json({
        message: "Quiz updated successfully",
        quiz,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Xóa quiz (teacher/admin)
  async deleteQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const { createdBy } = req.query;

      // Sử dụng createdBy từ query hoặc default
      const creatorId = (createdBy as string) || "64f1a2b3c4d5e6f7g8h9i0j1"; // Default teacher ID

      const result = await quizService.deleteQuiz(quizId as string, creatorId);

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // Lấy thông tin quiz (không có đáp án)
  async getQuizInfo(req: Request, res: Response): Promise<Response> {
    try {
      const { quizId } = req.params;
      if (!quizId) return res.status(400).json({ message: "quizId is required" });
      const quiz = await quizService.getQuizById(quizId as string, { requireActive: false });

      // Trả về thông tin quiz mà không có correctAnswer
      const quizInfo = {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        dueDate: quiz.dueDate,
        questionsCount: quiz.totalQuestions,
      };

      return res.json({
        message: "Get quiz info successfully",
        quiz: quizInfo,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}

export default new QuizController();
