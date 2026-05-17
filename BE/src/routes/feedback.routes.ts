import { Router } from "express";
import FeedbackController from "../controller/feedback.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Sinh viên gửi câu hỏi
router.post("/", authorizeRoles("student"), FeedbackController.createFeedback);

// Giáo viên phản hồi
router.post("/:id/reply", authorizeRoles("teacher"), FeedbackController.replyFeedback);

// Giáo viên xem danh sách câu hỏi theo course
router.get(
  "/course/:courseId",

  authorizeRoles("teacher"),
  FeedbackController.getFeedbacksByCourse
);

export default router;
