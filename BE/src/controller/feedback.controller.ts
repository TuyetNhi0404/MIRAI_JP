import { Request, Response } from "express";
import Feedback from "../model/feedback.model";

class FeedbackController {
  // Student gửi câu hỏi
  async createFeedback(req: Request, res: Response) {
    try {
      const { courseId, message } = req.body;
      const studentId = (req as any).user.id; // lấy từ token

      const feedback = await Feedback.create({ courseId, studentId, message });
      res.status(201).json({ success: true, feedback });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Teacher phản hồi lại
  async replyFeedback(req: Request, res: Response) {
    try {
      const { reply } = req.body;
      const teacherId = (req as any).user.id;

      const feedback = await Feedback.findByIdAndUpdate(
        req.params.id,
        { reply, teacherId },
        { new: true }
      );

      if (!feedback) {
        return res.status(404).json({ success: false, message: "Question not found" });
      }

      res.json({ success: true, feedback });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Teacher xem danh sách feedback
  async getFeedbacksByCourse(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const feedbacks = await Feedback.find({ courseId })
        .populate("studentId", "name email")
        .sort({ createdAt: -1 });

      res.json({ success: true, feedbacks });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new FeedbackController();
