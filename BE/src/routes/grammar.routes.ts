import { Router } from "express";
import multer from "multer";
import GrammarController from "../controller/grammar.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Cấu hình định tuyến bảo mật qua token
router.use(verifyToken);

// ─── ADMIN UPLOAD & OCR ROUTES ───────────────────────────────────────────────
router.post("/upload", authorizeRoles("admin"), upload.single("file"), GrammarController.uploadDocument);
router.get("/documents", authorizeRoles("admin", "teacher"), GrammarController.getDocuments);
router.delete("/documents/:id", authorizeRoles("admin"), GrammarController.deleteDocument);

// ─── ADMIN CARD CRUD & RAG AUTO-GENERATE ──────────────────────────────────────
router.post("/cards/generate-draft", authorizeRoles("admin"), GrammarController.generateDraftCards);
router.get("/cards", authorizeRoles("admin", "teacher"), GrammarController.getGrammarCards);
router.post("/cards", authorizeRoles("admin"), GrammarController.createGrammarCard);
router.put("/cards/:id", authorizeRoles("admin"), GrammarController.updateGrammarCard);
router.delete("/cards/:id", authorizeRoles("admin"), GrammarController.deleteGrammarCard);

// ─── STUDENT LEARNING ROUTES ─────────────────────────────────────────────────
router.get("/student/practice", authorizeRoles("student"), GrammarController.getStudentPracticeCards);

// ─── TEACHER QUIZ CREATION & TRACKING ROUTES ─────────────────────────────────
router.post("/teacher/quiz/generate-questions", authorizeRoles("teacher"), GrammarController.teacherGenerateQuestions);
router.post("/teacher/quiz/create", authorizeRoles("teacher"), GrammarController.teacherCreateQuiz);
router.get("/teacher/quiz/:quizId/attempts", authorizeRoles("teacher"), GrammarController.getQuizAttempts);

export default router;
