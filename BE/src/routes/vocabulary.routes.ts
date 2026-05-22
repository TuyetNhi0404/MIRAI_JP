import { Router } from "express";
import multer from "multer";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  getVocabularies,
  getVocabularyById,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  exportVocabularyExcel,
  importVocabularyExcel,
  getTopics,
  getLevels,
  getVocabStats,
} from "../controller/vocabulary.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── PUBLIC (học sinh cũng có thể đọc) ──────────────────────────────────────
router.get("/", getVocabularies);
router.get("/topics", getTopics);
router.get("/levels", getLevels);
router.get("/stats", verifyToken, authorizeRoles("admin"), getVocabStats);
router.get("/export", verifyToken, authorizeRoles("admin"), exportVocabularyExcel);
router.get("/:id", getVocabularyById);

// ─── ADMIN ONLY ───────────────────────────────────────────────────────────────
router.post("/import", verifyToken, authorizeRoles("admin"), upload.single("file"), importVocabularyExcel);
router.post("/", verifyToken, authorizeRoles("admin"), createVocabulary);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateVocabulary);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteVocabulary);

export default router;
