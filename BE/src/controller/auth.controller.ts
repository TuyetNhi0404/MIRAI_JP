import { Request, Response } from "express";
import { User } from "../model/user.model";
import authService from "../service/auth.service";

class AuthController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body, res);

      const userDoc = user as any;

      userDoc.lastLogin = new Date();
      await User.findByIdAndUpdate(userDoc.id, { lastLogin: new Date() });

      authService.saveToken(res, accessToken);
      authService.saveRefreshToken(res, refreshToken);

      return res.json({
        user,
        message: "Login success",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async googleLogin(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body as { token: string };
      const { user, accessToken, refreshToken } = await authService.googleLogin(token);

      const userDoc = user as any;

      userDoc.lastLogin = new Date();
      await User.findByIdAndUpdate(userDoc.id, { lastLogin: new Date() });

      authService.saveToken(res, accessToken);
      authService.saveRefreshToken(res, refreshToken);

      return res.json({
        user,
        message: "Login success",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(400).json({ message: err.message });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const oldRefreshToken = (req.cookies.refreshToken || req.body.refreshToken) as string | undefined;
      const { accessToken, refreshToken } = await authService.refreshToken(
        oldRefreshToken as string
      );

      authService.saveToken(res, accessToken);
      authService.saveRefreshToken(res, refreshToken);

      return res.json({ accessToken });
    } catch (err: any) {
      return res.status(401).json({ message: err.message });
    }
  }

  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const result = await authService.logout(res);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }
}

export default new AuthController();
