import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// 📂 Đảm bảo luôn tìm đúng file dù chạy ở src hay dist
const ROOT_DIR = path.resolve(process.cwd(), "src/data");
const DATA_PATH = path.join(ROOT_DIR, "forum.json");

// Nếu chưa có thư mục thì tự tạo
if (!fs.existsSync(ROOT_DIR)) {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
  console.log("📁 Created data directory:", ROOT_DIR);
}

// Nếu chưa có file thì tạo mới
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ threads: [] }, null, 2), "utf-8");
  console.log("🆕 Created new forum.json at:", DATA_PATH);
} else {
  console.log("📁 Using existing forum.json at:", DATA_PATH);
}

function readThreadsData() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.error("❌ File not found at:", DATA_PATH);
      return [];
    }
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);

    // ✅ cập nhật chỗ này để đọc đúng cấu trúc { "threads": [...] }
    if (data && Array.isArray(data.threads)) {
      return data.threads;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    console.error("💥 Error reading file:", err);
    return [];
  }
}

function writeThreadsData(threads: any[]) {
  // ✅ ghi lại theo dạng { threads: [...] }
  const newData = { threads };
  fs.writeFileSync(DATA_PATH, JSON.stringify(newData, null, 2), "utf-8");
}

router.get("/threads", (req: Request, res: Response) => {
  try {
    const threads = readThreadsData();
    res.json(threads);
  } catch (err) {
    console.error("Error reading threads:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/** Ghi lại dữ liệu vào file */

/** GET /api/forum/threads/:id – lấy chi tiết 1 thread */
router.get("/threads/:id", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const threads = readThreadsData();
    const thread = threads.find((t: any) => Number(t.threadId) === id);
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json(thread);
  } catch (err) {
    console.error("Error reading thread by id:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** GET /api/forum/course/:courseId – lấy thread theo course */
router.get("/course/:courseId", (req: Request, res: Response) => {
  try {
    const courseId = Number(req.params.courseId);
    const threads = readThreadsData().filter((t: any) => Number(t.courseId) === courseId);
    res.json(threads);
  } catch (err) {
    console.error("Error filtering by courseId:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** POST /api/forum/threads/:id/replies – thêm reply vào thread */
router.post("/threads/:id/replies", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { content, createdBy, author } = req.body;
    const threads = readThreadsData();
    const thread = threads.find((t: any) => t.threadId === id);

    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const newReplyId = Math.max(0, ...thread.replies.map((r: any) => r.replyId)) + 1;

    const newReply = {
      replyId: newReplyId,
      threadId: id,
      content,
      createdBy,
      author,
      createdAt: new Date().toISOString(),
    };

    thread.replies.push(newReply);
    writeThreadsData(threads);

    res.status(201).json(newReply);
  } catch (err) {
    console.error("Error adding reply:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** PATCH /api/forum/threads/:id/reaction – cập nhật reaction */
router.patch("/threads/:id/reaction", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { type } = req.body; // "like", "heart", "sad"
    const threads = readThreadsData();
    const thread = threads.find((t: any) => t.threadId === id);

    if (!thread) return res.status(404).json({ message: "Thread not found" });

    if (type in thread.reactions) {
      thread.reactions[type]++;
    } else {
      thread.reactions[type] = 1;
    }

    writeThreadsData(threads);
    res.json(thread.reactions);
  } catch (err) {
    console.error("Error updating reaction:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** DELETE /api/forum/threads/:id – xóa 1 thread */
router.delete("/threads/:id", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const threads = readThreadsData();
    const index = threads.findIndex((t: any) => Number(t.threadId) === id);

    if (index === -1) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Xóa phần tử trong mảng
    const deletedThread = threads.splice(index, 1)[0];

    // Ghi lại file
    writeThreadsData(threads);

    res.json({
      message: "Thread deleted successfully",
      deletedThread,
    });
  } catch (err) {
    console.error("Error deleting thread:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/** DELETE /api/forum/threads/:threadId/replies/:replyId – xóa 1 reply trong thread */
router.delete("/threads/:threadId/replies/:replyId", (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const replyId = Number(req.params.replyId);

    const threads = readThreadsData();
    const thread = threads.find((t: any) => Number(t.threadId) === threadId);

    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const replyIndex = thread.replies.findIndex((r: any) => Number(r.replyId) === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ message: "Reply not found" });
    }

    const deletedReply = thread.replies.splice(replyIndex, 1)[0];

    writeThreadsData(threads);

    res.json({
      message: "Reply deleted successfully",
      deletedReply,
    });
  } catch (err) {
    console.error("Error deleting reply:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/** POST /api/forum/threads – tạo mới 1 thread */
router.post("/threads", (req: Request, res: Response) => {
  try {
    const { courseId, title, content, createdBy, author } = req.body;
    const threads = readThreadsData();

    const newThreadId = Math.max(0, ...threads.map((t: any) => t.threadId)) + 1;

    const newThread = {
      threadId: newThreadId,
      courseId,
      title,
      content,
      createdBy,
      author,
      createdAt: new Date().toISOString(),
      replies: [],
      reactions: { like: 0, heart: 0, sad: 0 },
    };

    threads.push(newThread);
    writeThreadsData(threads);

    res.status(201).json(newThread);
  } catch (err) {
    console.error("Error creating thread:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/** PATCH /api/forum/threads/:id – cập nhật bài viết (chỉ người tạo được sửa) */
router.patch("/threads/:id", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { title, content, updatedBy } = req.body; // updatedBy = email người đang đăng nhập

    if (!title && !content) {
      return res.status(400).json({ message: "Missing update content" });
    }

    const threads = readThreadsData();
    const thread = threads.find((t: any) => Number(t.threadId) === id);

    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Kiểm tra quyền: chỉ người tạo mới được sửa
    if (thread.createdBy !== updatedBy) {
      return res.status(403).json({ message: "You are not allowed to edit this thread" });
    }

    // Cập nhật nội dung
    if (title) thread.title = title;
    if (content) thread.content = content;
    thread.updatedAt = new Date().toISOString();

    writeThreadsData(threads);

    res.json({
      message: "Thread updated successfully",
      updatedThread: thread,
    });
  } catch (err) {
    console.error("Error updating thread:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/** PATCH /api/forum/threads/:threadId/replies/:replyId/reaction – cập nhật reaction cho reply */
router.patch("/threads/:threadId/replies/:replyId/reaction", (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const replyId = Number(req.params.replyId);
    const { type } = req.body; // "like", "heart", "sad"...

    const threads = readThreadsData();
    const thread = threads.find((t: any) => Number(t.threadId) === threadId);

    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const reply = thread.replies.find((r: any) => Number(r.replyId) === replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    // Nếu chưa có field reactions thì khởi tạo
    if (!reply.reactions) {
      reply.reactions = { like: 0, heart: 0, sad: 0 };
    }

    // Cập nhật reaction
    if (type in reply.reactions) {
      reply.reactions[type]++;
    } else {
      reply.reactions[type] = 1;
    }

    writeThreadsData(threads);

    res.json({
      message: "Reaction updated successfully",
      reactions: reply.reactions,
    });
  } catch (err) {
    console.error("Error updating reply reaction:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
