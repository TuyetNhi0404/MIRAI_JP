import { Request, Response } from "express";
import chapterService from "../service/chapter.service";

class ChapterController {
  async create(req: Request, res: Response) {
    try {
      const chapter = await chapterService.createChapter(req.body);
      return res.status(201).json({ message: "Chapter created", chapter });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  }

  async list(_req: Request, res: Response) {
    const chapters = await chapterService.listChapters();
    return res.json({ chapters });
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: "id is required" });
      const updated = await chapterService.updateChapter(id as string, req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Chapter updated", chapter: updated });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  }

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "id is required" });
    await chapterService.deleteChapter(id as string);
    return res.json({ message: "Chapter deleted" });
  }
}

export default new ChapterController();


