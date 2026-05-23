import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./config/cloudinary";
import { connect } from "./config/db.config";
import routes from "./routes";

// Import các route FE riêng
import assignmentRoutes from "./routes/FE/assignment.routes";
import accountsRouter from "./routes/FE/accounts.routes";
import forumRoutes from "./routes/FE/forum.routes";
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

// ✅ 2. Middleware xử lý body & cookie
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ 3. Kết nối Database (bỏ qua khi test)
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

// ✅ 4. Đăng ký routes FE cụ thể
app.use("/api/assignments", assignmentRoutes);
app.use("/api/accounts", accountsRouter);
app.use("/api/forum", forumRoutes);
// app.use("/api/accounts", accountsRouter);

// ✅ 5. Đăng ký routes backend tổng hợp
routes(app);

// ✅ 6. Khởi động server
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
  });
}

export default app;
