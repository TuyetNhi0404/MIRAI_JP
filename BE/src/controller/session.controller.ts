import { Request, Response } from "express";
import { Session } from "../model/session.model";

// CREATE
export const createSession = async (req: Request, res: Response) => {
  try {
    const { sessionName, startTime, endTime } = req.body;
    if (!sessionName || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required information." });
    }

    const session = await Session.create({
      sessionName,
      startTime,
      endTime,
    });

    res.status(201).json({ message: "Session created successfully.", data: session });
  } catch (error) {
    res.status(500).json({ message: "Server error while creating session.", error });
  }
};

// GET ALL
export const getAllSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await Session.find().sort({ startTime: 1 });
    res.status(200).json({ message: "Successfully retrieved session list.", data: sessions });
  } catch (error) {
    res.status(500).json({ message: "Server error while retrieving sessions." });
  }
};

// UPDATE
export const updateSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    const session = await Session.findByIdAndUpdate(sessionId, updates, { new: true });
    if (!session) return res.status(404).json({ message: "Session not found." });

    res.status(200).json({ message: "Session updated successfully.", data: session });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating session." });
  }
};

// DELETE
export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findByIdAndDelete(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found for deletion." });

    res.status(200).json({ message: "Session deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting session." });
  }
};
