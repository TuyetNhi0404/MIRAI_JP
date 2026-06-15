import { Router } from "express";
import multer from "multer";
import GrammarController from "../controller/grammar.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
// Phase 5: giới hạn size PDF 20MB để chống teacher upload file quá lớn
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Chỉ chấp nhận file PDF hoặc DOCX."));
  },
});

// Cấu hình định tuyến bảo mật qua token
router.use(verifyToken);

// ─── UPLOAD & OCR ROUTES (Phase 5: admin + teacher) ─────────────────────────
router.post(
  "/upload",
  authorizeRoles("admin", "teacher"),
  upload.single("file"),
  GrammarController.uploadDocument
);
router.get(
  "/documents",
  authorizeRoles("admin", "teacher"),
  GrammarController.getDocuments
);
// Phase 5: status endpoint cho FE poll progress
router.get(
  "/documents/:id/status",
  authorizeRoles("admin", "teacher"),
  GrammarController.getDocumentStatus
);
router.delete(
  "/documents/:id",
  authorizeRoles("admin", "teacher"),
  GrammarController.deleteDocument
);

// ─── CARD CRUD & RAG AUTO-GENERATE (Phase 5: admin + teacher) ──────────────
router.post(
  "/cards/generate-draft",
  authorizeRoles("admin", "teacher"),
  GrammarController.generateDraftCards
);
router.get(
  "/cards",
  authorizeRoles("admin", "teacher"),
  GrammarController.getGrammarCards
);
router.post(
  "/cards",
  authorizeRoles("admin", "teacher"),
  GrammarController.createGrammarCard
);
router.put(
  "/cards/:id",
  authorizeRoles("admin", "teacher"),
  GrammarController.updateGrammarCard
);
router.post(
  "/cards/batch-delete",
  authorizeRoles("admin"),
  GrammarController.deleteGrammarCardsBatch
);
router.delete(
  "/cards/:id",
  authorizeRoles("admin"),
  GrammarController.deleteGrammarCard
);

// ─── STUDENT LEARNING ROUTES ────────────────────────────────────────────────
router.get(
  "/student/practice",
  authorizeRoles("student"),
  GrammarController.getStudentPracticeCards
);

// ─── TEACHER QUIZ CREATION & TRACKING ROUTES ────────────────────────────────
router.post(
  "/teacher/quiz/generate-questions",
  authorizeRoles("teacher"),
  GrammarController.teacherGenerateQuestions
);
router.post(
  "/teacher/quiz/create",
  authorizeRoles("teacher"),
  GrammarController.teacherCreateQuiz
);
router.get(
  "/teacher/quiz/:quizId/attempts",
  authorizeRoles("teacher"),
  GrammarController.getQuizAttempts
);

router.get(
  "/ops/metrics",
  authorizeRoles("admin"),
  GrammarController.getOpsMetrics
);

export default router;
