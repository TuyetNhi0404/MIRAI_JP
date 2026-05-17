import { User } from "../model/user.model";

class AdminService {
  async getAllUsers({
    role,
    status,
    search,
    page = 1,
    limit = 10,
  }: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  async createUserWithRole({
    name,
    email,
    role,
  }: {
    name: string;
    email: string;
    role: "admin" | "teacher" | "student";
  }) {
    if (!["admin", "teacher", "student"].includes(role)) throw new Error("Invalid role");

    const existing = await User.findOne({ email });
    if (existing) throw new Error("Email đã tồn tại");

    const newUser = new User({
      name,
      email,
      role,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();
    return newUser;
  }

  async lockUser(id: string) {
    const user = await User.findById(id);
    if (!user) throw new Error("User not found");
    if (user.status === "locked") throw new Error("User is locked");

    user.status = "locked";
    await user.save();
    return { message: "Đã khóa user", user };
  }

  async unlockUser(id: string) {
    const user = await User.findById(id);
    if (!user) throw new Error("Can't find user");
    if (user.status === "active") throw new Error("User is already active");

    user.status = "active";
    await user.save();
    return { message: "User has been unlocked", user };
  }

  async getUserLastLogin() {
    const users = await User.find().select("name email role lastLogin").sort({ lastLogin: -1 });
    return users;
  }

  async getTeachers() {
    const teachers = await User.find({ role: "teacher", status: "active" }).select(
      "_id name email"
    );

    return teachers;
  }
}
export default new AdminService();
