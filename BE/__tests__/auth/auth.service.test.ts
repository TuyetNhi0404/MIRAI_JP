import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { User } from "../../src/model/user.model";

// Mocks
jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerify,
    })),
  };
});
jest.mock("jsonwebtoken");
jest.mock("bcrypt");
jest.mock("../../src/model/user.model");
const mockVerify = jest.fn();

import authService from "../../src/service/auth.service";

const mockUser = {
  id: "123",
  email: "test@example.com",
  name: "Tester",
  password: "hashed123",
  role: "user",
  avatar: "avatar.png",
  save: jest.fn(),
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "secret";
    process.env.REFRESH_SECRET = "refresh_secret";
    process.env.GOOGLE_CLIENT_ID = "google123";
  });

  // 🧠 generateToken
  it("should generate a JWT token", () => {
    (jwt.sign as jest.Mock).mockReturnValue("fakeToken");
    const result = authService.generateToken({ id: "1", role: "user" });
    expect(result).toBe("fakeToken");
    expect(jwt.sign).toHaveBeenCalledWith({ id: "1", role: "user" }, "secret", {
      expiresIn: "15m",
    });
  });

  // 🧠 register
  it("should register new user successfully", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed123");
    (User.create as jest.Mock).mockResolvedValue({
      id: "123",
      email: "test@example.com",
    });

    const result = await authService.register({
      email: "test@example.com",
      password: "123456",
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    expect(result.user.email).toBe("test@example.com");
  });

  it("should throw error if email already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      authService.register({ email: "test@example.com", password: "123456" })
    ).rejects.toThrow("Email đã tồn tại");
  });

  // 🧠 login
  it("should login successfully with correct password", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue("token123");

    const result = await authService.login({
      email: "test@example.com",
      password: "123456",
    });

    expect(result.accessToken).toBe("token123");
    expect(result.refreshToken).toBe("token123");
    expect(result.user.email).toBe("test@example.com");
  });

  it("should throw error if password is wrong", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({ email: "test@example.com", password: "wrong" })
    ).rejects.toThrow("Sai mật khẩu");
  });

  it("should throw error if user not found", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.login({ email: "none@example.com", password: "123456" })
    ).rejects.toThrow("Không tìm thấy tài khoản");
  });

  // 🧠 refreshToken
  it("should generate new tokens when refresh token is valid", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: "123", role: "user" });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue("newToken");

    const result = await authService.refreshToken("validToken");

    expect(result.accessToken).toBe("newToken");
    expect(result.refreshToken).toBe("newToken");
  });

  it("should throw error if refresh token invalid", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid");
    });

    await expect(authService.refreshToken("badToken")).rejects.toThrow(
      "Invalid or expired refresh token"
    );
  });

  // 🧠 googleLogin
  it("should login with Google successfully", async () => {
    mockVerify.mockResolvedValueOnce({
      getPayload: () => ({
        email: "google@example.com",
        picture: "avatar.png",
      }),
    });

    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue({
      ...mockUser,
      email: "google@example.com",
    });

    (jwt.sign as jest.Mock).mockReturnValue("googleToken");

    const result = await authService.googleLogin("fakeGoogleToken");

    expect(result.user.email).toBe("google@example.com");
    expect(result.accessToken).toBe("googleToken");
  });

  it("should throw error if Google payload invalid", async () => {
    mockVerify.mockResolvedValueOnce({
      getPayload: () => null,
    });

    await expect(authService.googleLogin("fake")).rejects.toThrow("Google payload invalid");
  });

  // 🧠 logout
  it("should clear cookies on logout", async () => {
    const res = { clearCookie: jest.fn() } as any;

    const result = await authService.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith("accessToken", { path: "/" });
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", { path: "/" });
    expect(result.message).toBe("Logout success");
  });
});
