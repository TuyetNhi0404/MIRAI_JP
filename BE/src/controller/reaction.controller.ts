import { Request, Response } from "express";
import mongoose from "mongoose";
import Reaction from "../model/forum/Reaction";
import Thread from "../model/forum/Thread";

export async function upsertReaction(req: Request, res: Response) {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const {
    threadId,
    replyId = null,
    type,
  } = req.body as {
    threadId: number;
    replyId?: number | null;
    type?: "like" | "heart" | "sad" | null;
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filter = { userId, threadId, replyId: replyId ?? null };
    const prev = await Reaction.findOne(filter).session(session);

    if (prev && (!type || prev.type === type)) {
      await Reaction.deleteOne({ _id: prev._id }).session(session);

      await decrementCounter(threadId, replyId, prev.type, session);
      await session.commitTransaction();
      return res.json({ ok: true, action: "removed" });
    }

    if (prev && prev.type !== type) {
      const oldType = prev.type;
      await Reaction.updateOne({ _id: prev._id }, { $set: { type } }).session(session);
      await decrementCounter(threadId, replyId, oldType, session);
      if (type) await incrementCounter(threadId, replyId, type, session);
      await session.commitTransaction();
      return res.json({ ok: true, action: "changed" });
    }

    if (!prev && type) {
      await Reaction.create([{ userId, threadId, replyId: replyId ?? null, type }], { session });
      await incrementCounter(threadId, replyId, type, session);
      await session.commitTransaction();
      return res.json({ ok: true, action: "created" });
    }

    await session.commitTransaction();
    return res.json({ ok: true, action: "noop" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
}

async function incrementCounter(
  threadId: number,
  replyId: number | null,
  type: string,
  session: mongoose.ClientSession
) {
  if (replyId !== null) {
    // thread document contains replies array with replyId and reactions
    await Thread.updateOne(
      { threadId, "replies.replyId": replyId },
      { $inc: { ["replies.$.reactions." + type]: 1 } },
      { session }
    );
  } else {
    await Thread.updateOne({ threadId }, { $inc: { ["reactions." + type]: 1 } }, { session });
  }
}

async function decrementCounter(
  threadId: number,
  replyId: number | null,
  type: string,
  session: mongoose.ClientSession
) {
  if (replyId !== null) {
    await Thread.updateOne(
      { threadId, "replies.replyId": replyId },
      { $inc: { ["replies.$.reactions." + type]: -1 } },
      { session }
    );
  } else {
    await Thread.updateOne({ threadId }, { $inc: { ["reactions." + type]: -1 } }, { session });
  }
}
