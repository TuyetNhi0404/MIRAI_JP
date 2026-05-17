import { Router } from "express";
import { createLesson, getLessons } from "../controller/lesson.controller";

const router = Router();

router.get("/", getLessons);
router.post("/", createLesson);

export default router;
