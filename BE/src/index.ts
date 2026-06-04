import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./config/cloudinary";
import { connect } from "./config/db.config";
import routes from "./routes";
import {
  registerSpeakingPracticeRoutes,
  attachSpeakingWebSocketUpgrade,
} from "./routes/speaking-practice.routes";
import { attachGrammarWebSocketUpgrade } from "./routes/grammar.ws";

// Import các route FE riêng
import assignmentRoutes from "./routes/FE/assignment.routes";
import accountsRouter from "./routes/FE/accounts.routes";
import forumRoutes from "./routes/FE/forum.routes";
const app: Application = express();
app.set("trust proxy", 1);

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

// ✅ 1. Cấu hình CORS (đặt trước mọi middleware khác)
app.use(
  cors({
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ 2. Cookie (cần trước speaking proxy để verify JWT từ cookie)
app.use(cookieParser());

// ✅ Speaking proxy TRƯỚC body parser — tránh hỏng multipart upload
registerSpeakingPracticeRoutes(app);

// ✅ 3. Middleware xử lý body (các route khác)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ 4. Kết nối Database + Redis probe (bỏ qua khi test)
async function initBackgroundJobs(): Promise<void> {
  const { ensureRedisReady } = await import("./config/redis.config");
  await ensureRedisReady();
  const { startGrammarWorker } = await import("./workers/grammar.worker");
  startGrammarWorker();
  await import("./config/cron");
  console.log(" Cron jobs initialized");
}

if (process.env.NODE_ENV !== "test") {
  connect();
}

// ✅ 5. Đăng ký routes FE cụ thể
app.use("/api/assignments", assignmentRoutes);
app.use("/api/accounts", accountsRouter);
app.use("/api/forum", forumRoutes);
// app.use("/api/accounts", accountsRouter);

// ✅ 6. Đăng ký routes backend tổng hợp
routes(app);

// ✅ 7. Khởi động server (sau khi probe Redis xong)
async function startServer(): Promise<void> {
  await initBackgroundJobs();
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  attachSpeakingWebSocketUpgrade(server);
  attachGrammarWebSocketUpgrade(server);
  server.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
    if (process.env.ENABLE_SPEAKING_PRACTICE === "true") {
      console.log(` Speaking practice proxy → ${process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000"}`);
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch(err => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });
}

export default app;
