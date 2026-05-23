import { Request, Response } from "express";
import { VocabularyService } from "../service/vocabulary.service";

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export const getVocabularies = async (req: Request, res: Response) => {
  try {
    const { level, topic, search } = req.query as Record<string, string>;
    const data = await VocabularyService.getAll({ level, topic, search });
    res.json({ data, total: data.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET TOPICS ───────────────────────────────────────────────────────────────
export const getTopics = async (req: Request, res: Response) => {
  try {
    const { level } = req.query as { level?: string };
    const topics = await VocabularyService.getTopics(level);
    res.json({ topics });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET LEVELS ───────────────────────────────────────────────────────────────
export const getLevels = async (_req: Request, res: Response) => {
  try {
    const levels = await VocabularyService.getLevels();
    res.json({ levels });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET STATS ────────────────────────────────────────────────────────────────
export const getVocabStats = async (_req: Request, res: Response) => {
  try {
    const stats = await VocabularyService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
export const getVocabularyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Thiếu ID" });
      return;
    }
    const vocab = await VocabularyService.getById(id);
    if (!vocab) {
      res.status(404).json({ message: "Không tìm thấy từ vựng" });
      return;
    }
    res.json(vocab);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createVocabulary = async (req: Request, res: Response) => {
  try {
    const vocab = await VocabularyService.create(req.body);
    res.status(201).json(vocab);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateVocabulary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Thiếu ID" });
      return;
    }
    const vocab = await VocabularyService.update(id, req.body);
    if (!vocab) {
      res.status(404).json({ message: "Không tìm thấy từ vựng" });
      return;
    }
    res.json(vocab);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteVocabulary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Thiếu ID" });
      return;
    }
    const vocab = await VocabularyService.remove(id);
    if (!vocab) {
      res.status(404).json({ message: "Không tìm thấy từ vựng" });
      return;
    }
    res.json({ message: "Xóa từ vựng thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────
export const exportVocabularyExcel = async (req: Request, res: Response) => {
  try {
    const { level, topic } = req.query as Record<string, string>;
    const buffer = await VocabularyService.exportToExcel({ level, topic });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `vocabulary_${level || "all"}_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── IMPORT EXCEL ─────────────────────────────────────────────────────────────
export const importVocabularyExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Vui lòng tải lên file Excel" });
      return;
    }

    const result = await VocabularyService.importFromExcel(req.file.buffer);
    res.json({
      message: `Import thành công: ${result.created} từ mới, ${result.updated} từ cập nhật`,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
