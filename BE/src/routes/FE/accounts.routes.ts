import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const dataFile = path.join(__dirname, "../../data/accounts.json");

// Hàm tiện ích đọc & ghi file JSON
const readData = () => JSON.parse(fs.readFileSync(dataFile, "utf-8"));
const writeData = (data: any) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// ✅ GET /api/users
router.get("/", (req, res) => {
  try {
    const rawData = fs.readFileSync(dataFile, "utf-8");
    let users = JSON.parse(rawData);

    const search = (req.query.search as string) || "";
    const role = (req.query.role as string) || "";
    const status = (req.query.status as string) || "";

    // Lọc theo từ khóa
    if (search) {
      users = users.filter(
        (u: any) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Lọc theo role
    if (role) {
      users = users.filter((u: any) => u.role.toLowerCase() === role.toLowerCase());
    }

    // Lọc theo status
    if (status) {
      users = users.filter((u: any) => u.status.toLowerCase() === status.toLowerCase());
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi đọc file users", error: err });
  }
});

// ✅ GET /api/users/:id
router.get("/:id", (req, res) => {
  try {
    const data = readData();
    const user = data.find((u: any) => u.userId === Number.parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User không tồn tại" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy user", error: err });
  }
});

// ✅ POST /api/users (thêm mới)
router.post("/", (req, res) => {
  try {
    const data = readData();
    const newUser = {
      userId: Math.max(...data.map((u: any) => u.userId), 0) + 1,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    data.push(newUser);
    writeData(data);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm user", error: err });
  }
});

// ✅ PUT /api/users/:id (cập nhật - khóa/mở tài khoản)
router.put("/:id", (req, res) => {
  try {
    const data = readData();
    const index = data.findIndex((u: any) => u.userId === Number.parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: "User không tồn tại" });

    const updated = {
      ...data[index],
      ...req.body,
    };
    data[index] = updated;
    writeData(data);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật user", error: err });
  }
});

// ✅ DELETE /api/users/:id (xóa)
router.delete("/:id", (req, res) => {
  try {
    const data = readData();
    const newData = data.filter((u: any) => u.userId !== Number.parseInt(req.params.id));
    writeData(newData);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa user", error: err });
  }
});

export default router;
