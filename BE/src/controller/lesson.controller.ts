import { Request, Response } from "express";
import { LessonService } from "../service/lesson.service";

export const createLesson = async (req: Request, res: Response) => {
  try {
    const result = await LessonService.create(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLessons = async (_req: Request, res: Response) => {
  try {
    const courses = await LessonService.getAll();
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
