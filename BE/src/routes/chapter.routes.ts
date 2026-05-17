import { Router } from "express";
import chapterController from "../controller/chapter.controller";

const router = Router();

router.get("/", chapterController.list);
router.post("/", chapterController.create);
router.put("/:id", chapterController.update);
router.delete("/:id", chapterController.remove);

export default router;


