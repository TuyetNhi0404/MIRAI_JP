import { Router } from "express";
import GrammarNoteController from "../controller/grammarNote.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyToken, authorizeRoles("student", "teacher", "admin"));

router.get("/", GrammarNoteController.list);
router.post("/", GrammarNoteController.create);
router.patch("/:id/status", GrammarNoteController.updateStatus);
router.patch("/:id", GrammarNoteController.update);
router.delete("/:id", GrammarNoteController.remove);

export default router;
