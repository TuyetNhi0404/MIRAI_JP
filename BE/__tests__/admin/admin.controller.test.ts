import { Request, Response } from "express";
import adminController from "../../src/controller/admin.controller";
import adminService from "../../src/service/admin.service";
import { get } from "http";

// 🧠 Mock service được import trực tiếp
jest.mock("../../src/service/admin.service", () => ({
  getAllUsers: jest.fn(),
  createUserWithRole: jest.fn(),
}));

describe("AdminController.getAll", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      query: { role: "teacher", page: "1", limit: "5" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with user list", async () => {
    (adminService.getAllUsers as jest.Mock).mockResolvedValue({
      total: 2,
      page: 1,
      limit: 5,
      totalPages: 1,
      users: [{ id: "1" }, { id: "2" }],
    });

    await adminController.getAll(req as Request, res as Response);

    expect(adminService.getAllUsers).toHaveBeenCalledWith({
      role: "teacher",
      page: 1,
      limit: 5,
    });
    expect(res.json).toHaveBeenCalledWith({
      total: 2,
      page: 1,
      limit: 5,
      totalPages: 1,
      users: [{ id: "1" }, { id: "2" }],
    });
  });

  it("should return 500 on service error", async () => {
    (adminService.getAllUsers as jest.Mock).mockRejectedValue(new Error("Database error"));

    await adminController.getAll(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Database error" });
  });
});

describe("AdminController.createUser", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        name: "Tú",
        email: "test@example.com",
        role: "teacher",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 201 and created user when success", async () => {
    (adminService.createUserWithRole as jest.Mock).mockResolvedValue({
      id: "1",
      name: "Tú",
      email: "test@example.com",
      role: "teacher",
    });

    await adminController.createUser(req as Request, res as Response);

    expect(adminService.createUserWithRole).toHaveBeenCalledWith({
      name: "Tú",
      email: "test@example.com",
      role: "teacher",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tạo người dùng thành công",
      user: {
        id: "1",
        name: "Tú",
        email: "test@example.com",
        role: "teacher",
      },
    });
  });

  it("should return 400 if service throws an error", async () => {
    (adminService.createUserWithRole as jest.Mock).mockRejectedValue(new Error("Email đã tồn tại"));

    await adminController.createUser(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email đã tồn tại" });
  });
});
