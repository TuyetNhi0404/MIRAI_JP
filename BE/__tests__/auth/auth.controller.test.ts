import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import authController from "../../src/controller/auth.controller";
import authService from "../../src/service/auth.service";

// ✅ Mock toàn bộ service
jest.mock("../../src/service/auth.service");

const app = express();
app.use(express.json());
app.use(cookieParser());

// Đăng ký router
app.post("/register", (req, res) => authController.register(req, res));
app.post("/login", (req, res) => authController.login(req, res));
app.post("/google", (req, res) => authController.googleLogin(req, res));
app.post("/refresh-token", (req, res) => authController.refreshToken(req, res));
app.post("/logout", (req, res) => authController.logout(req, res));

describe("AuthController Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 🧠 Test Register
  it("POST /register → should return 201 and user data", async () => {
    (authService.register as jest.Mock).mockResolvedValueOnce({
      user: { id: "123", email: "test@example.com" },
    });

    const res = await request(app)
      .post("/register")
      .send({ email: "test@example.com", password: "123456" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(authService.register).toHaveBeenCalledTimes(1);
  });

  it("POST /register → should return 400 if email exists", async () => {
    (authService.register as jest.Mock).mockRejectedValueOnce(new Error("Email đã tồn tại"));

    const res = await request(app)
      .post("/register")
      .send({ email: "duplicate@example.com", password: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email đã tồn tại");
  });

  // 🧠 Test Login
  it("POST /login → should return 200 and tokens", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      user: { email: "user@example.com" },
      accessToken: "token123",
      refreshToken: "refresh456",
    });

    const res = await request(app)
      .post("/login")
      .send({ email: "user@example.com", password: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("token123");
    expect(res.body.refreshToken).toBe("refresh456");
    expect(res.body.message).toBe("Login success");
  });

  it("POST /login → should return 400 on wrong password", async () => {
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error("Sai mật khẩu"));

    const res = await request(app)
      .post("/login")
      .send({ email: "user@example.com", password: "wrong" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Sai mật khẩu");
  });

  // 🧠 Test Google Login
  it("POST /google → should return 200 on success", async () => {
    (authService.googleLogin as jest.Mock).mockResolvedValueOnce({
      user: { email: "google@example.com" },
      accessToken: "gToken",
      refreshToken: "gRefresh",
    });

    const res = await request(app).post("/google").send({ token: "fake-google-token" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("google@example.com");
  });

  it("POST /google → should return 400 on error", async () => {
    (authService.googleLogin as jest.Mock).mockRejectedValueOnce(
      new Error("Google payload invalid")
    );

    const res = await request(app).post("/google").send({ token: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Google payload invalid");
  });

  // 🧠 Test Refresh Token
  it("POST /refresh-token → should return 200 with new accessToken", async () => {
    (authService.refreshToken as jest.Mock).mockResolvedValueOnce({
      accessToken: "newAccess",
      refreshToken: "newRefresh",
    });

    const res = await request(app)
      .post("/refresh-token")
      .set("Cookie", ["refreshToken=fakeRefresh"]);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("newAccess");
  });

  it("POST /refresh-token → should return 401 on invalid refresh token", async () => {
    (authService.refreshToken as jest.Mock).mockRejectedValueOnce(new Error("Invalid token"));

    const res = await request(app).post("/refresh-token").set("Cookie", ["refreshToken=invalid"]);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid token");
  });

  // 🧠 Test Logout
  it("POST /logout → should return 200 on success", async () => {
    (authService.logout as jest.Mock).mockResolvedValueOnce({
      message: "Logout success",
    });

    const res = await request(app).post("/logout");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logout success");
  });
});
