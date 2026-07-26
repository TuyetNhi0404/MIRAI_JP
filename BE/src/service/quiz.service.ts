import { Quiz, QuizAttempt, IQuiz } from "../model/quiz.model";
import mongoose, { FilterQuery } from "mongoose";
import { Question } from "../model/question.model";

import { UserAnswer } from "../model/userAnswer.model";
import { Course } from "../model/course.model";
import { StatisticsService } from "./statistics.service";

class QuizService {
  private async deactivateExpiredQuizzes(filter: FilterQuery<IQuiz> = {}): Promise<void> {
    const now = new Date();
    await Quiz.updateMany(
      {
        ...filter,
        isActive: true,
        dueDate: { $ne: null, $lte: now },
      },
      { $set: { isActive: false } }
    );
  }
  // Helper method: Kiểm tra student có thuộc course hay không
  private async checkStudentInCourse(studentId: string, courseId: mongoose.Types.ObjectId | any): Promise<void> {
    // Xử lý cả trường hợp courseId là ObjectId hoặc object đã populate
    const courseIdValue = courseId?._id ? courseId._id : courseId;
    const courseObjectId = courseIdValue instanceof mongoose.Types.ObjectId
      ? courseIdValue
      : new mongoose.Types.ObjectId(courseIdValue);

    const course = await Course.findById(courseObjectId).select("members").lean();
    if (!course) {
      throw new Error("Course not found.");
    }
    const courseMember = course.members?.find(
      (m) => m.userId.toString() === studentId.toString() && m.role === "student" && !m.deletedAt
    );

    if (!courseMember) {
      throw new Error("You are not enrolled in this course. Please register for the course before attempting the quiz.");
    }
  }

  // Helper method: Lấy studentId từ userId và courseId trong bảng CourseMember
  async getStudentIdByUserId(userId: string, courseId: string): Promise<mongoose.Types.ObjectId | null> {
    const course = await Course.findById(courseId).select("members").lean();
    if (!course) return null;
    const courseMember = course.members?.find(
      (m) => m.userId.toString() === userId.toString() && m.role === "student" && !m.deletedAt
    );

    return courseMember ? (courseMember.userId as unknown as mongoose.Types.ObjectId) : null;
  }

  // Helper method: Lấy danh sách studentIds (userIds) từ một course
  async getStudentIdsByCourse(courseId: string): Promise<mongoose.Types.ObjectId[]> {
    const course = await Course.findById(courseId).select("members").lean();
    if (!course) return [];

    return (course.members || [])
      .filter(m => m.role === "student" && !m.deletedAt)
      .map(m => m.userId as unknown as mongoose.Types.ObjectId);
  }

  // Helper method: Lấy danh sách courseIds mà user tham gia với vai trò student
  async getCourseIdsByStudentId(userId: string): Promise<mongoose.Types.ObjectId[]> {
    const courses = await Course.find({ "members.userId": new mongoose.Types.ObjectId(userId), "members.role": "student", "members.deletedAt": null }).select("_id").lean();
    return courses.map((c) => c._id as mongoose.Types.ObjectId);
  }

  // Helper method: Lấy CourseMember record dựa vào userId (để lấy studentId)
  async getCourseMembersByUserId(userId: string, courseId?: string) {
    if (courseId) {
      const course = await Course.findById(courseId).select("members").lean();
      if (!course) return [];
      return (course.members || []).filter(
        (m) => m.userId.toString() === userId.toString() && m.role === "student" && !m.deletedAt
      );
    }
    const courses = await Course.find({ "members.userId": new mongoose.Types.ObjectId(userId), "members.role": "student", "members.deletedAt": null }).select("members").lean();
    const members: any[] = [];
    courses.forEach(c => {
      const m = c.members?.find(mem => mem.userId.toString() === userId.toString() && mem.role === "student" && !mem.deletedAt);
      if (m) members.push({ ...m, courseId: c._id });
    });
    return members;
  }

  // Tạo quiz mới từ ngân hàng câu hỏi theo chapter
  async createQuiz(quizData: any, createdBy: string) {
    const { chapterId, chapterIds, useAllChapters, totalQuestions } = quizData;

    if (!totalQuestions || totalQuestions <= 0) {
      throw new Error("Số lượng câu hỏi phải lớn hơn 0");
    }

    const useAll = Boolean(useAllChapters);

    const chapterIdInputs: string[] = [];
    if (chapterId) chapterIdInputs.push(chapterId);
    if (Array.isArray(chapterIds)) chapterIdInputs.push(...chapterIds);
    if (typeof chapterIds === "string") chapterIdInputs.push(chapterIds);

    const validChapterIds = Array.from(
      new Set(
        chapterIdInputs
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    if (!useAll && validChapterIds.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một chương hoặc chọn lấy từ tất cả các chương");
    }

    const chapterObjectIds = validChapterIds.map((id) => new mongoose.Types.ObjectId(id));

    const questionFilter = useAll
      ? {}
      : { chapterId: { $in: chapterObjectIds } };

    const questions = await Question.find(questionFilter);
    if (questions.length < totalQuestions) {
      throw new Error(`Không đủ câu hỏi trong các chương đã chọn. Hiện có: ${questions.length} câu, Yêu cầu: ${totalQuestions} câu`);
    }

    const selected = this.getRandomSubset(questions, totalQuestions);

    const quiz = await new Quiz({
      title: quizData.title,
      description: quizData.description,
      courseId: new mongoose.Types.ObjectId(quizData.courseId),
      lessonId: quizData.lessonId ? new mongoose.Types.ObjectId(quizData.lessonId) : undefined,
      chapterId: !useAll && chapterObjectIds.length === 1 ? chapterObjectIds[0] : undefined,
      chapterIds: useAll ? [] : chapterObjectIds,
      coversAllChapters: useAll,
      totalQuestions: totalQuestions,
      durationMinutes: quizData.durationMinutes,
      dueDate: quizData.dueDate,
      createdBy: new mongoose.Types.ObjectId(createdBy),
      questions: selected.map((q, idx) => ({
        questionId: q._id,
        questionOrder: idx + 1,
      })),
    }).save();

    return quiz;
  }

  private getRandomSubset<T>(items: T[], size: number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const current = copy[i];
      const swap = copy[j];
      if (current === undefined || swap === undefined) {
        continue;
      }
      copy[i] = swap;
      copy[j] = current;
    }
    return copy.slice(0, size);
  }

  // Lấy danh sách quiz theo course
  async getQuizzesByCourse(courseId: string) {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    await this.deactivateExpiredQuizzes({ courseId: courseObjectId });
    return await Quiz.find({
      courseId: courseObjectId,
      isActive: true,
    }).populate("createdBy", "name email");
  }

  // Lấy danh sách quiz của các course mà student đã tham gia
  async getQuizzesForStudent(studentId: string) {
    // Lấy danh sách course mà student đã tham gia
    const courses = await Course.find({
      "members.userId": new mongoose.Types.ObjectId(studentId),
      "members.role": "student",
      "members.deletedAt": null,
    }).select("_id").lean();

    if (courses.length === 0) {
      return [];
    }

    const courseIds = courses.map((c) => c._id);

    await this.deactivateExpiredQuizzes({ courseId: { $in: courseIds } });

    // Lấy tất cả quiz của những course đó
    const quizzes = await Quiz.find({
      courseId: { $in: courseIds },
      isActive: true,
    })
      .populate("courseId", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Kiểm tra quiz nào student đã làm chưa
    const quizIds = quizzes.map((q) => q._id);
    const attempts = await QuizAttempt.find({
      quizId: { $in: quizIds },
      studentId: new mongoose.Types.ObjectId(studentId),
    });

    const attemptMap = new Map(
      attempts.map((a) => [a.quizId.toString(), a])
    );

    // Trả về quiz kèm thông tin đã làm chưa
    return quizzes.map((quiz) => {
      const quizObj = quiz.toObject() as any;
      const attempt = attemptMap.get((quiz._id as mongoose.Types.ObjectId).toString());
      return {
        _id: quizObj._id,
        title: quizObj.title,
        description: quizObj.description,
        courseId: quizObj.courseId,
        courseName: (quizObj.courseId as any)?.name,
        totalQuestions: quizObj.totalQuestions,
        durationMinutes: quizObj.durationMinutes,
        dueDate: quizObj.dueDate,
        createdBy: quizObj.createdBy,
        createdAt: quizObj.createdAt || (quiz as any).createdAt,
        hasAttempted: !!attempt,
        attemptScore: attempt?.score,
        attemptPercentage: attempt?.percentage,
        attemptPassed: attempt?.passed,
        attemptCompletedAt: attempt?.completedAt,
      };
    });
  }

  // Danh sách quiz với filter tùy chọn (courseId/chapterId)
  async getQuizzes(filter: { courseId?: string; chapterId?: string }) {
    const query: any = {};
    if (filter.courseId) query.courseId = new mongoose.Types.ObjectId(filter.courseId);
    if (filter.chapterId) {
      const chapterObjectId = new mongoose.Types.ObjectId(filter.chapterId);
      query.$or = [
        { chapterId: chapterObjectId },
        { chapterIds: chapterObjectId },
        { coversAllChapters: true },
      ];
    }
    await this.deactivateExpiredQuizzes(query);

    return await Quiz.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
  }

  async getQuizQuestions(
    quizId: string,
    options?: { createdBy?: string; includeCorrectAnswers?: boolean }
  ) {
    const includeCorrectAnswers =
      options?.includeCorrectAnswers === undefined ? true : Boolean(options.includeCorrectAnswers);

    const quizObjectId = new mongoose.Types.ObjectId(quizId);
    await this.deactivateExpiredQuizzes({ _id: quizObjectId });

    const quiz = await Quiz.findById(quizObjectId);
    if (!quiz) {
      throw new Error("Quiz does not exist");
    }

    const mappings = (quiz.questions || []).sort((a, b) => a.questionOrder - b.questionOrder);
    const questionIds = mappings.map((m) => m.questionId);
    const populatedQuestions = await Question.find({ _id: { $in: questionIds } }).lean();
    const qMap = new Map(populatedQuestions.map(q => [q._id.toString(), q]));

    const questions = mappings.map((mapping) => {
      const question = qMap.get(mapping.questionId.toString()) as any;
      if (!question) return null;
      const base = {
        questionId: question._id,
        chapterId: question.chapterId,
        order: mapping.questionOrder,
        questionText: question.questionText,
        options: [question.answer1, question.answer2, question.answer3, question.answer4],
      };
      return includeCorrectAnswers
        ? { ...base, correctAnswer: question.correctAnswer }
        : base;
    }).filter(Boolean);

    return {
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        totalQuestions: quiz.totalQuestions,
        createdBy: quiz.createdBy,
        dueDate: quiz.dueDate,
      },
      questions,
    };
  }

  // Lấy quiz theo ID (metadata)
  async getQuizById(quizId: string, options?: { requireActive?: boolean }) {
    const quizObjectId = new mongoose.Types.ObjectId(quizId);
    await this.deactivateExpiredQuizzes({ _id: quizObjectId });

    const quiz = await Quiz.findById(quizObjectId).populate("courseId", "name");
    if (!quiz) throw new Error("Quiz does not exist");

    const isExpired = Boolean(quiz.dueDate && quiz.dueDate.getTime() <= Date.now());
    const requireActive = options?.requireActive !== false;

    if (requireActive && !quiz.isActive) {
      throw new Error(isExpired ? "Quiz has been closed due to expiration" : "Quiz has been deactivated");
    }
    return quiz;
  }

  // Student bắt đầu làm quiz: trả về danh sách câu hỏi (không có đáp án đúng)
  async startQuiz(quizId: string, studentId: string) {
    const quiz = await this.getQuizById(quizId);

    // Kiểm tra student có thuộc course của quiz hay không
    await this.checkStudentInCourse(studentId, quiz.courseId);

    // Kiểm tra xem học sinh đã làm quiz này chưa
    const existingAttempt = await QuizAttempt.findOne({
      quizId: quiz._id,
      studentId: new mongoose.Types.ObjectId(studentId),
    });

    if (existingAttempt) {
      throw new Error("You have already taken this quiz. Each student is allowed to take the quiz only once.");
    }

    const mappings = (quiz.questions || []).sort((a, b) => a.questionOrder - b.questionOrder);
    const questionIds = mappings.map((m) => m.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = new Map(
      questions.map((q) => [(q._id as mongoose.Types.ObjectId).toString(), q])
    );
    const items = mappings.map((m) => {
      const q = questionMap.get(m.questionId.toString());
      return {
        id: (q!._id as mongoose.Types.ObjectId).toString(),
        order: m.questionOrder,
        question: q!.questionText,
        options: [q!.answer1, q!.answer2, q!.answer3, q!.answer4],
      };
    });

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      dueDate: quiz.dueDate,
      questions: items,
    };
  }

  // Student nộp bài quiz
  async submitQuiz(quizId: string, studentId: string, answers: number[], timeSpent: number) {
    const quiz = await this.getQuizById(quizId);

    // Kiểm tra student có thuộc course của quiz hay không
    await this.checkStudentInCourse(studentId, quiz.courseId);

    // Kiểm tra xem học sinh đã nộp bài quiz này chưa
    const existingAttempt = await QuizAttempt.findOne({
      quizId: quiz._id,
      studentId: new mongoose.Types.ObjectId(studentId),
    });

    if (existingAttempt) {
      throw new Error("You have already submitted this quiz. Each student is allowed to submit the quiz only once.");
    }

    const mappings = (quiz.questions || []).sort((a, b) => a.questionOrder - b.questionOrder);
    const questionIds = mappings.map((m) => m.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map(
      questions.map((q) => [(q._id as mongoose.Types.ObjectId).toString(), q])
    );

    let correct = 0;
    const results = mappings.map((m, idx) => {
      const q = questionMap.get(m.questionId.toString())!;
      const selected = answers[idx]; // expect 1..4
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        order: m.questionOrder,
        questionId: (q._id as mongoose.Types.ObjectId).toString(),
        question: q.questionText,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    const percentage = Math.round((correct / mappings.length) * 100);
    const passed = percentage >= 70; // Ngưỡng cố định theo yêu cầu bỏ passingScore

    const attempt = await new QuizAttempt({
      quizId: quiz._id,
      studentId: new mongoose.Types.ObjectId(studentId),
      answers,
      score: correct,
      percentage,
      passed,
      timeSpent,
      completedAt: new Date(),
    }).save();

    // Save user answers
    await Promise.all(
      results.map((r) =>
        new UserAnswer({
          attemptId: attempt._id,
          questionId: new mongoose.Types.ObjectId(r.questionId),
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
        }).save()
      )
    );

    // ✅ Tự động tính lại điểm sau khi nộp quiz
    try {
      const courseId = quiz.courseId.toString();
      // Gọi hàm tính điểm tự động (không await để không chặn response)
      StatisticsService.refreshStudentScoresAsync(courseId, studentId).catch((err) => {
        console.error("Error refreshing scores after quiz submission:", err);
      });
    } catch (scoreErr) {
      console.error("Error refreshing scores:", scoreErr);
      // Không fail nếu tính điểm lỗi
    }

    return {
      attemptId: attempt._id,
      score: correct,
      totalQuestions: mappings.length,
      percentage,
      passed,
      results,
      timeSpent,
      completedAt: attempt.completedAt,
    };
  }

  // Lấy lịch sử làm quiz của student
  async getStudentQuizHistory(studentId: string, courseId?: string) {
    const filter: any = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (courseId) {
      const quizzes = await Quiz.find({ courseId: new mongoose.Types.ObjectId(courseId) });
      const quizIds = quizzes.map((q) => q._id);
      filter.quizId = { $in: quizIds };
    }

    return await QuizAttempt.find(filter)
      .populate("quizId", "title courseId")
      .populate("quizId.courseId", "name")
      .sort({ completedAt: -1 });
  }

  // Lấy kết quả chi tiết của một attempt
  async getAttemptResult(attemptId: string, studentId: string) {
    const attempt = await QuizAttempt.findOne({
      _id: new mongoose.Types.ObjectId(attemptId),
      studentId: new mongoose.Types.ObjectId(studentId),
    }).populate("quizId", "title courseId");

    if (!attempt) {
      throw new Error("Quiz result not found");
    }

    const quiz = attempt.quizId as any;

    // Kiểm tra student có thuộc course của quiz hay không
    if (quiz.courseId) {
      await this.checkStudentInCourse(studentId, quiz.courseId);
    } else {
      // Nếu không có courseId, lấy từ attempt
      const quizDoc = await Quiz.findById(quiz._id);
      if (quizDoc && quizDoc.courseId) {
        await this.checkStudentInCourse(studentId, quizDoc.courseId);
      }
    }
    const quizDocForQuestions = await Quiz.findById(quiz._id).lean();
    if (!quizDocForQuestions) throw new Error("Quiz not found");
    const mappings = (quizDocForQuestions.questions || []).sort((a, b) => a.questionOrder - b.questionOrder);
    const questionIds = mappings.map((m) => m.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const qMap = new Map(
      questions.map((q) => [(q._id as mongoose.Types.ObjectId).toString(), q])
    );
    const results = mappings.map((m, idx) => {
      const q = qMap.get(m.questionId.toString())!;
      const studentAnswer = attempt.answers[idx];
      const isCorrect = studentAnswer === q.correctAnswer;
      return {
        questionIndex: idx,
        question: q.questionText,
        options: [q.answer1, q.answer2, q.answer3, q.answer4],
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    return {
      attemptId: attempt._id,
      quizTitle: quiz.title,
      score: attempt.score,
      totalQuestions: mappings.length,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt,
      results: results,
    };
  }

  // Lấy thống kê quiz cho teacher
  async getQuizStatistics(quizId: string, _createdBy: string) {
    const quiz = await Quiz.findOne({
      _id: new mongoose.Types.ObjectId(quizId),
    });

    if (!quiz) {
      throw new Error("Quiz does not exist or you do not have access");
    }

    const attempts = await QuizAttempt.find({
      quizId: new mongoose.Types.ObjectId(quizId),
    }).populate("studentId", "name email");

    const statistics = {
      totalAttempts: attempts.length,
      averageScore:
        attempts.length > 0
          ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
          : 0,
      passRate:
        attempts.length > 0
          ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
          : 0,
      attempts: attempts.map((attempt) => ({
        studentName: (attempt.studentId as any).name,
        studentEmail: (attempt.studentId as any).email,
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        completedAt: attempt.completedAt,
      })),
    };

    return statistics;
  }

  // Cập nhật quiz (chỉ teacher/admin)
  async updateQuiz(quizId: string, updateData: any, createdBy: string) {
    // Chỉ cho phép cập nhật các trường theo model SQL
    const set: any = {};
    const unset: any = {};

    // Tìm quiz hiện tại để lấy thông tin chapter/totalQuestions cũ nếu không truyền mới
    const existingQuiz = await Quiz.findOne({
      _id: new mongoose.Types.ObjectId(quizId),
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    if (!existingQuiz) {
      throw new Error("Quiz does not exist or you do not have permission to edit it");
    }

    if (updateData.title !== undefined) set.title = updateData.title;
    if (updateData.description !== undefined) set.description = updateData.description;

    let targetUseAll = existingQuiz.coversAllChapters;
    if (updateData.useAllChapters !== undefined) {
      targetUseAll = Boolean(updateData.useAllChapters);
      set.coversAllChapters = targetUseAll;
      if (targetUseAll) {
        unset.chapterId = "";
        set.chapterIds = [];
      }
    }

    let targetChapterObjectIds: mongoose.Types.ObjectId[] = [];
    if (!targetUseAll) {
      if (updateData.chapterIds !== undefined) {
        if (updateData.chapterIds === null) {
          set.chapterIds = [];
        } else {
          const chapterIdInputs: string[] = Array.isArray(updateData.chapterIds)
            ? updateData.chapterIds
            : typeof updateData.chapterIds === "string"
              ? [updateData.chapterIds]
              : [];
          const validIds = Array.from(
            new Set(
              chapterIdInputs
                .map((id) => (typeof id === "string" ? id.trim() : ""))
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
            )
          );
          targetChapterObjectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
          set.chapterIds = targetChapterObjectIds;
        }
      } else if (updateData.chapterId !== undefined) {
        if (updateData.chapterId && mongoose.Types.ObjectId.isValid(updateData.chapterId)) {
          const singleId = new mongoose.Types.ObjectId(updateData.chapterId);
          set.chapterId = singleId;
          targetChapterObjectIds = [singleId];
        } else {
          unset.chapterId = "";
        }
      } else {
        // Giữ nguyên chapterIds hoặc chapterId từ quiz cũ
        if (existingQuiz.chapterIds && existingQuiz.chapterIds.length > 0) {
          targetChapterObjectIds = existingQuiz.chapterIds;
        } else if (existingQuiz.chapterId) {
          targetChapterObjectIds = [existingQuiz.chapterId];
        }
      }
    }

    const targetTotalQuestions = updateData.totalQuestions !== undefined
      ? updateData.totalQuestions
      : existingQuiz.totalQuestions;

    if (targetTotalQuestions <= 0) {
      throw new Error("Số lượng câu hỏi phải lớn hơn 0");
    }

    // Nếu có sự thay đổi về totalQuestions hoặc danh sách Chapter -> Kiểm tra số lượng và chọn lại câu hỏi
    const isTotalQuestionsChanged = updateData.totalQuestions !== undefined && updateData.totalQuestions !== existingQuiz.totalQuestions;
    const isChapterChanged = updateData.useAllChapters !== undefined || updateData.chapterIds !== undefined || updateData.chapterId !== undefined;

    if (isTotalQuestionsChanged || isChapterChanged) {
      const questionFilter = targetUseAll
        ? {}
        : { chapterId: { $in: targetChapterObjectIds } };

      const availableQuestions = await Question.find(questionFilter);
      if (availableQuestions.length < targetTotalQuestions) {
        throw new Error(
          `Không đủ câu hỏi trong các chương đã chọn. Hiện có: ${availableQuestions.length} câu, Yêu cầu: ${targetTotalQuestions} câu`
        );
      }

      const selected = this.getRandomSubset(availableQuestions, targetTotalQuestions);
      set.questions = selected.map((q, idx) => ({
        questionId: q._id,
        questionOrder: idx + 1,
      }));
      set.totalQuestions = targetTotalQuestions;
    } else if (updateData.totalQuestions !== undefined) {
      set.totalQuestions = updateData.totalQuestions;
    }

    if (updateData.durationMinutes !== undefined) set.durationMinutes = updateData.durationMinutes;
    if (updateData.isActive !== undefined) set.isActive = updateData.isActive;
    if (updateData.dueDate !== undefined) {
      if (updateData.dueDate === null) {
        unset.dueDate = "";
      } else {
        const dueDate = new Date(updateData.dueDate);
        if (isNaN(dueDate.getTime())) {
          throw new Error("Ngày hết hạn không hợp lệ");
        }
        if (dueDate.getTime() <= Date.now()) {
          throw new Error("Ngày hết hạn phải lớn hơn thời gian hiện tại");
        }
        set.dueDate = dueDate;
        if (updateData.isActive === undefined) {
          set.isActive = true;
        }
      }
    }

    const updateOps: any = {};
    if (Object.keys(set).length > 0) updateOps.$set = set;
    if (Object.keys(unset).length > 0) updateOps.$unset = unset;

    const quiz = await Quiz.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(quizId),
        createdBy: new mongoose.Types.ObjectId(createdBy),
      },
      updateOps,
      { new: true }
    );

    return quiz;
  }

  // Xóa quiz (chỉ teacher/admin)
  async deleteQuiz(quizId: string, createdBy: string) {
    const quiz = await Quiz.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(quizId),
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    if (!quiz) {
      throw new Error("Quiz does not exist or you do not have permission to delete it");
    }

    // Xóa tất cả attempts liên quan
    await QuizAttempt.deleteMany({ quizId: new mongoose.Types.ObjectId(quizId) });

    return { message: "Quiz deleted successfully" };
  }
}

export default new QuizService();
