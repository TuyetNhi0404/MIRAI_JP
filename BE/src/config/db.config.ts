import mongoose from "mongoose";

export async function connect(): Promise<void> {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("⚠️ MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
