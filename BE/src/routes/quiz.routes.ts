import { Router } from "express";
import quizController from "../controller/quiz.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

router.get("/student/my-quizzes", authorizeRoles("student", "teacher"), quizController.getStudentQuizzes);
router.get("/", authorizeRoles("teacher"), quizController.getQuizzes);
router.get("/course/:courseId", authorizeRoles("teacher"), quizController.getQuizzesByCourse);
router.get("/:quizId/info", authorizeRoles("teacher"), quizController.getQuizInfo);
router.get("/:quizId/questions", authorizeRoles("teacher"), quizController.getQuizQuestions);
router.get("/:quizId/start", authorizeRoles("student","teacher"), quizController.startQuiz);
router.post("/:quizId/submit", authorizeRoles("student","teacher"), quizController.submitQuiz);
router.get("/history", authorizeRoles("student","teacher"), quizController.getStudentQuizHistory);
router.get("/attempt/:attemptId/result", authorizeRoles("student","teacher"), quizController.getAttemptResult);

router.post("/", authorizeRoles("teacher"), quizController.createQuiz);
router.put("/:quizId", authorizeRoles("teacher"), quizController.updateQuiz);
router.delete("/:quizId", authorizeRoles("teacher"), quizController.deleteQuiz);
router.get("/:quizId/statistics", authorizeRoles("teacher"), quizController.getQuizStatistics);

export default router;
