import { Router } from "express";
import {
  createSession,
  getAllSessions,
  updateSession,
  deleteSession,
} from "../controller/session.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

router.post("/", authorizeRoles("admin"), createSession);
router.get("/", authorizeRoles("admin", "teacher", "student"), getAllSessions);
router.put("/:sessionId", authorizeRoles("admin"), updateSession);
router.delete("/:sessionId", authorizeRoles("admin"), deleteSession);

export default router;
