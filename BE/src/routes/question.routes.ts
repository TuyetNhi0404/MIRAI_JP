import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import questionController from "../controller/question.controller";
import {verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.get("/chapter/:chapterId", authorizeRoles("teacher"), questionController.listByChapter);
router.get("/chapters", authorizeRoles("teacher"), questionController.listByChapters);
router.get("/grammar-questions", authorizeRoles("teacher"), questionController.listGrammarQuestions);
router.post("/", authorizeRoles("teacher"), questionController.create);
router.put("/:id", authorizeRoles("teacher"), questionController.update);
router.delete("/:id", authorizeRoles("teacher"), questionController.remove);
router.post("/upload", authorizeRoles("teacher"), upload.single("file"), questionController.uploadExcel);

export default router;


