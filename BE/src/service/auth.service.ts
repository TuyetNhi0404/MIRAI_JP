import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { User } from "../model/user.model";
import { RefreshToken } from "../model/refreshToken.model";
import { UserRole, UserStatus } from "../enum/user.enum";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface JwtUserPayload {
  id: string;
  role: string;
}

class AuthService {
  generateToken(payload: JwtUserPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "1d",
    });
  }

  generateRefreshToken(payload: JwtUserPayload): string {
    return jwt.sign(payload, process.env.REFRESH_SECRET as string, {
      expiresIn: "7d",
    });
  }

  saveToken(res: Response, accessToken: string): void {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  saveRefreshToken(res: Response, refreshToken: string): void {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new Error("No refresh token provided");
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET as string) as JwtPayload;
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    // Check if token exists in RefreshToken collection (Active Tokens check)
    const existingTokenDoc = await RefreshToken.findOne({ token: refreshToken });

    if (!existingTokenDoc) {
      // Refresh token reuse / compromise detected! Revoke all tokens for this user
      if (decoded?.id) {
        await RefreshToken.deleteMany({ userId: decoded.id });
      }
      throw new Error("Refresh token has been revoked or already used");
    }

    // Delete used old refresh token (Rotation)
    await RefreshToken.deleteOne({ _id: existingTokenDoc._id });

    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found");

    if (user.status === UserStatus.LOCKED) {
      throw new Error("Your account has been locked. Please contact the admin.");
    }

    const newAccessToken = this.generateToken({
      id: user.id.toString(),
      role: decoded.role || user.role,
    });
    const newRefreshToken = this.generateRefreshToken({
      id: user.id.toString(),
      role: decoded.role || user.role,
    });

    // Save newly issued rotated refresh token to DB
    await RefreshToken.create({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async register({ email, password }: { email: string; password: string }) {
    const existing = await User.findOne({ email });
    if (existing) throw new Error("Email already exists");

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: email,
      email,
      password: hashed,
    });

    return {
      user: {
        _id: newUser.id,
        email: newUser.email,
      },
    };
  }

  async login({ email, password }: { email: string; password: string }, res?: Response) {
    const user = await User.findOne({ email });
    if (!user || !user.password) throw new Error("Account not found");

    if (user.status === UserStatus.LOCKED) {
      throw new Error("Your account has been locked. Please contact the admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Incorrect password");

    const accessToken = this.generateToken({
      id: user.id.toString(),
      role: user.role,
    });
    const refreshToken = this.generateRefreshToken({
      id: user.id.toString(),
      role: user.role,
    });

    // Save refresh token to DB
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        _id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  async googleLogin(googleToken: string) {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error("Google payload invalid");

    const { email } = payload;

    let user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      throw new Error("Your account has not been granted access. Please register an account.");
    }

    if (user.status === UserStatus.LOCKED) {
      throw new Error("Your account has been locked. Please contact the admin.");
    }

    const accessToken = this.generateToken({
      id: user.id.toString(),
      role: user.role,
    });
    const refreshToken = this.generateRefreshToken({
      id: user.id.toString(),
      role: user.role,
    });

    // Save refresh token to DB
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        _id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(res: Response, refreshToken?: string) {
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    return { message: "Logout success" };
  }
}

export default new AuthService();