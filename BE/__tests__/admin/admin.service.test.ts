import adminService from "../../src/service/admin.service";
import { User } from "../../src/model/user.model";

interface MockUserModel {
  new (): { save: jest.Mock };
  findOne: jest.Mock;
  find: jest.Mock;
  select: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  countDocuments: jest.Mock;
}

// 🧩 Mock User model — hoạt động cả cho `new User()` và các static method
jest.mock("../../src/model/user.model", () => {
  const mockUserConstructor = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true),
  })) as unknown as MockUserModel;

  mockUserConstructor.findOne = jest.fn();
  mockUserConstructor.find = jest.fn().mockReturnThis();
  mockUserConstructor.select = jest.fn().mockReturnThis();
  mockUserConstructor.skip = jest.fn().mockReturnThis();
  mockUserConstructor.limit = jest.fn().mockReturnThis();
  mockUserConstructor.sort = jest.fn().mockResolvedValue([]);
  mockUserConstructor.countDocuments = jest.fn();

  return { User: mockUserConstructor };
});

describe("AdminService.getAllUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated users with filter by role", async () => {
    const mockUsers = [
      { id: "1", email: "a@example.com", role: "teacher" },
      { id: "2", email: "b@example.com", role: "teacher" },
    ];

    (User.find as any).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValueOnce(mockUsers),
    });

    (User.countDocuments as jest.Mock).mockResolvedValue(2);

    const result = await adminService.getAllUsers({
      role: "teacher",
      page: 1,
      limit: 10,
    });

    expect(User.find).toHaveBeenCalledWith({ role: "teacher" });
    expect(User.countDocuments).toHaveBeenCalledWith({ role: "teacher" });
    expect(result.total).toBe(2);
    expect(result.users).toEqual(mockUsers);
    expect(result.totalPages).toBe(1);
  });

  it("should return empty list if no users found", async () => {
    (User.find as any).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValueOnce([]),
    });

    (User.countDocuments as jest.Mock).mockResolvedValue(0);

    const result = await adminService.getAllUsers({ page: 2, limit: 5 });

    expect(User.find).toHaveBeenCalledWith({});
    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

describe("AdminService.createUserWithRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a user successfully", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const result = await adminService.createUserWithRole({
      name: "Tú",
      email: "test@example.com",
      role: "teacher",
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(result).toHaveProperty("save");
  });

  it("should throw error if role is invalid", async () => {
    await expect(
      adminService.createUserWithRole({
        name: "Invalid",
        email: "invalid@example.com",
        role: "manager" as any,
      })
    ).rejects.toThrow("Role không hợp lệ");
  });

  it("should throw error if email already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ email: "exists@example.com" });

    await expect(
      adminService.createUserWithRole({
        name: "Dup",
        email: "exists@example.com",
        role: "student",
      })
    ).rejects.toThrow("Email đã tồn tại");
  });
});
