import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthPayload extends JwtPayload {
  id: string;
  role?: string;
}

// 🔹 Mở rộng interface Request để có thể gắn userId vào req
declare module "express-serve-static-core" {
  interface Request {
    id?: string;
    role?: string;
    user?: {
      id: string;
      role?: string;
    };
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken as string | undefined;

  if (!token) {
    res.status(401).json({ message: "Không có token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    req.id = decoded.id;
    req.role = decoded.role;
    // Thêm req.user để tương thích với yêu cầu
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

export const authorizeRoles = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
