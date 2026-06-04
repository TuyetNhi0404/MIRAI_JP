import mongoose from "mongoose";
import dns from "dns";

export async function connect(): Promise<void> {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(" MONGO_URI is not defined in environment variables");
    }

    // Set custom DNS resolvers to bypass local network DNS failures for mongodb+srv
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    await mongoose.connect(process.env.MONGO_URI);
    console.log(" Connected to MongoDB");
  } catch (error) {
    console.error(" MongoDB connection error:", error);
  }
}
