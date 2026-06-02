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

// Import các route FE riêng
import assignmentRoutes from "./routes/FE/assignment.routes";
import accountsRouter from "./routes/FE/accounts.routes";

const app: Application = express();

// ✅ 1. Cấu hình CORS (đặt trước mọi middleware khác)
app.use(
  cors({
    origin: "http://localhost:5173", // cho phép frontend React chạy local
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

// ✅ 4. Kết nối Database (bỏ qua khi test)
if (process.env.NODE_ENV !== "test") {
  connect();
  import("./config/cron")
    .then(() => {
      console.log(" Cron jobs initialized");
    })
    .catch((err) => {
      console.error(" Failed to initialize cron jobs:", err);
    });
}

// ✅ 5. Đăng ký routes FE cụ thể
app.use("/api/assignments", assignmentRoutes);
app.use("/api/accounts", accountsRouter);
// app.use("/api/accounts", accountsRouter);

// ✅ 6. Đăng ký routes backend tổng hợp
routes(app);

// ✅ 7. Khởi động server
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  attachSpeakingWebSocketUpgrade(server);
  server.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
    if (process.env.ENABLE_SPEAKING_PRACTICE === "true") {
      console.log(` Speaking practice proxy → ${process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000"}`);
    }
  });
}

export default app;
