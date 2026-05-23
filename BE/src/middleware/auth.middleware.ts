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
  const cookieToken = req.cookies?.accessToken as string | undefined;
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : undefined;

  // Thử decode token theo thứ tự ưu tiên: Header trước (mới nhất), sau đó Cookie
  const tokensToTry = [headerToken, cookieToken].filter(Boolean) as string[];

  for (const token of tokensToTry) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
      req.id = decoded.id;
      req.role = decoded.role;
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };
      next();
      return;
    } catch (err) {
      // Token này không hợp lệ, thử token tiếp theo
      continue;
    }
  }

  // Không có token hợp lệ nào
  if (tokensToTry.length === 0) {
    res.status(401).json({ message: "Không có token" });
  } else {
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
