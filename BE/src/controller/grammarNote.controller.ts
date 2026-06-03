import { Request, Response } from "express";
import GrammarNote, { GrammarNoteStatus } from "../model/grammarNote.model";

class GrammarNoteController {
  async list(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const notes = await GrammarNote.find({ userId })
        .sort({ createdAt: -1 })
        .limit(200);
      res.json({ success: true, notes });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const {
        turnId,
        sessionId,
        original,
        corrected,
        explanationVi,
        tags,
        severity,
        level,
        aiReplyContext,
        status,
      } = req.body;

      if (!original || typeof original !== "string" || !original.trim()) {
        return res.status(400).json({ success: false, message: "original is required" });
      }

      const note = await GrammarNote.create({
        userId,
        turnId,
        sessionId,
        original: original.trim(),
        corrected: corrected?.trim() || undefined,
        explanationVi: explanationVi?.trim() || undefined,
        tags: Array.isArray(tags) ? tags : [],
        severity,
        level,
        aiReplyContext,
        status: status || "new",
      });

      res.status(201).json({ success: true, note });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const { status } = req.body as { status?: GrammarNoteStatus };
      if (!status || !["new", "reviewing", "mastered"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const note = await GrammarNote.findOneAndUpdate(
        { _id: req.params.id, userId },
        { status },
        { new: true },
      );

      if (!note) {
        return res.status(404).json({ success: false, message: "Note not found" });
      }

      res.json({ success: true, note });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { corrected, explanationVi, tags, severity } = req.body;
      const update: Record<string, unknown> = {};
      if (corrected !== undefined) update.corrected = corrected;
      if (explanationVi !== undefined) update.explanationVi = explanationVi;
      if (tags !== undefined) update.tags = tags;
      if (severity !== undefined) update.severity = severity;

      const note = await GrammarNote.findOneAndUpdate(
        { _id: req.params.id, userId },
        update,
        { new: true },
      );

      if (!note) {
        return res.status(404).json({ success: false, message: "Note not found" });
      }

      res.json({ success: true, note });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const userId = req.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const note = await GrammarNote.findOneAndDelete({
        _id: req.params.id,
        userId,
      });

      if (!note) {
        return res.status(404).json({ success: false, message: "Note not found" });
      }

      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new GrammarNoteController();
