// Mock API test tạm thời cho forum
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

// ✅ Nếu bạn dùng TypeScript, thêm dòng sau:
const __dirname = path.resolve();

const app = express();
const FRONTEND_URL = "http://localhost:5173";
const forumPath = path.join(__dirname, "data", "forum.json");

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());

// ✅ file mock data (đặt trong cùng thư mục src/data/forum.json)
const dataPath = path.join(__dirname, "data", "forum.json");

// ✅ đọc dữ liệu
function readData() {
  try {
    if (!fs.existsSync(dataPath)) {
      return { threads: [] };
    }
    const raw = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("readData error:", err);
    return { threads: [] };
  }
}

// ✅ ghi dữ liệu
function writeData(json: any) {
  try {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(dataPath, JSON.stringify(json, null, 2), "utf-8");
  } catch (err) {
    console.error("writeData error:", err);
  }
}

// ✅ logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ get all threads
app.get("/api/forum/threads", (req, res) => {
  const data = readData();
  res.json(data.threads);
});

// ✅ get thread by id
app.get("/api/forum/threads/:id", (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const thread = data.threads.find((t: any) => Number(t.threadId) === id);
  if (!thread) return res.status(404).json({ message: "Not found" });
  res.json(thread);
});

// ✅ create thread
app.post("/api/forum/threads", (req, res) => {
  const data = readData();
  const body = req.body;

  const newThread = {
    threadId: Date.now(),
    courseId: body.courseId || 1,
    title: body.title || "Untitled",
    content: body.content || "",
    createdBy: body.createdBy || 0,
    author: body.author || "Guest",
    createdAt: new Date().toISOString(),
    reactions: { like: 0, heart: 0, sad: 0 },
    replies: [],
  };

  data.threads.unshift(newThread);
  writeData(data);
  res.status(201).json(newThread);
});

// ✅ add reply
app.post("/api/forum/threads/:id/replies", (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const thread = data.threads.find((t: any) => Number(t.threadId) === id);
  if (!thread) return res.status(404).json({ message: "Not found" });

  const reply = {
    replyId: Date.now(),
    threadId: id,
    content: req.body.content,
    author: req.body.author || "Guest",
    createdAt: new Date().toISOString(),
    reactions: req.body.reactions ?? { like: 0, heart: 0, sad: 0 },
  };

  thread.replies.push(reply);
  writeData(data);
  res.status(201).json(reply);
});

// ✅ add reaction
app.post("/api/forum/threads/:id/reactions", (req, res) => {
  const id = Number(req.params.id);
  const { type } = req.body;
  const data = readData();
  const thread = data.threads.find((t: any) => Number(t.threadId) === id);
  if (!thread) return res.status(404).json({ message: "Not found" });

  if (!thread.reactions) thread.reactions = {};
  if (!thread.reactions[type]) thread.reactions[type] = 0;
  thread.reactions[type] += 1;
  writeData(data);
  res.json(thread.reactions);
});

// ✅ start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Mock API running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for ${FRONTEND_URL}`);
});
