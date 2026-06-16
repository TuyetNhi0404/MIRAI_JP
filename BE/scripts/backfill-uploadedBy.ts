
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import GrammarDocument from "../src/model/grammarDocument.model";
import User from "../src/model/user.model";

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is required");

  await mongoose.connect(uri);

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!admin) {
    console.error("No admin user found — cannot backfill uploadedBy.");
    process.exit(1);
  }

  const result = await GrammarDocument.updateMany(
    { $or: [{ uploadedBy: { $exists: false } }, { uploadedBy: null }] },
    { $set: { uploadedBy: admin._id, scope: "shared" } }
  );

  console.log(`Backfill complete: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
