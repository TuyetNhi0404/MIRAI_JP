// backend/src/routes/assignments.routes.ts
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// ✅ Sửa đường dẫn - trỏ đúng vào thư mục src
const dataFile = path.join(__dirname, "../../data/assignments.json");
// Hoặc có thể dùng:
// const dataFile = path.resolve(process.cwd(), "src/data/assignments.json");

const readData = () => {
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ File không tồn tại: ${dataFile}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
};

const writeData = (data: any) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

// GET /api/assignments
router.get("/", (req, res) => {
  try {
    console.log(`📥 GET /api/assignments`);
    console.log(`📂 Reading from: ${dataFile}`);

    let assignments = readData();

    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";

    if (search) {
      assignments = assignments.filter((a: any) =>
        a.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status && status !== "all") {
      assignments = assignments.filter((a: any) => a.status.toLowerCase() === status.toLowerCase());
    }

    console.log(`✅ Returning ${assignments.length} assignments`);
    res.json(assignments);
  } catch (err: any) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Lỗi khi đọc file assignments", error: err.message });
  }
});

// POST /api/assignments
router.post("/", (req, res) => {
  try {
    console.log("📥 POST /api/assignments", req.body);
    const data = readData();
    const newAssignment = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: req.body.attachments || [],
    };
    data.push(newAssignment);
    writeData(data);
    console.log("✅ Created assignment:", newAssignment.id);
    res.status(201).json(newAssignment);
  } catch (err: any) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Lỗi khi thêm assignment", error: err.message });
  }
});

// PUT /api/assignments/:id
router.put("/:id", (req, res) => {
  try {
    console.log(`📥 PUT /api/assignments/${req.params.id}`);
    const data = readData();
    const index = data.findIndex((a: any) => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Assignment không tồn tại" });
    }

    const updated = {
      ...data[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    data[index] = updated;
    writeData(data);
    console.log("✅ Updated assignment:", req.params.id);
    res.json(updated);
  } catch (err: any) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật assignment", error: err.message });
  }
});

// DELETE /api/assignments/:id
router.delete("/:id", (req, res) => {
  try {
    console.log(`📥 DELETE /api/assignments/${req.params.id}`);
    const data = readData();
    const filtered = data.filter((a: any) => a.id !== req.params.id);

    if (data.length === filtered.length) {
      return res.status(404).json({ message: "Assignment không tồn tại" });
    }

    writeData(filtered);
    console.log("✅ Deleted assignment:", req.params.id);
    res.json({ message: "Assignment deleted successfully" });
  } catch (err: any) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Lỗi khi xóa assignment", error: err.message });
  }
});

export default router;
