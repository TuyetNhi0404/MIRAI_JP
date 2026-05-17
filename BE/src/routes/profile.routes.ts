// src/routes/profile.routes.ts
import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import profileController from "../controller/profile.controller";
import multer from "multer";

// CẤU HÌNH MULTER (Upload file lên bộ nhớ RAM)
const storage = multer.memoryStorage();
export const upload = multer({ storage });

const router = express.Router();
router.use(verifyToken);
router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);
router.put("/avatar", upload.single("file"), profileController.updateAvatar);
router.delete("/avatar", profileController.deleteAvatar);

export default router;
