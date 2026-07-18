import { Request, Response, NextFunction, Application } from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import type { IncomingMessage, Server } from "http";
import type { Socket } from "net";
import jwt, { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.middleware";

const SPEAKING_TARGET =
  process.env.SPEAKING_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_KEY =
  process.env.SPEAKING_INTERNAL_KEY || "mirai-speaking-dev-key";

function isSpeakingEnabled(): boolean {
  return process.env.ENABLE_SPEAKING_PRACTICE === "true";
}

function injectTokenFromQuery(req: Request): void {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const token = url.searchParams.get("token");
    if (token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
}

function speakingAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isSpeakingEnabled()) {
    console.warn("[speaking] rejected — ENABLE_SPEAKING_PRACTICE is not true");
    res.status(503).json({
      message:
        "Tính năng luyện giọng AI chưa được bật (ENABLE_SPEAKING_PRACTICE).",
    });
    return;
  }

  injectTokenFromQuery(req);
  verifyToken(req, res, () => {
    console.log(`[speaking] ${req.method} ${req.url} → user ${req.id}`);
    next();
  });
}

function setProxyUserHeaders(proxyReq: import("http").ClientRequest, req: Request): void {
  if (req.id) {
    proxyReq.setHeader("x-user-id", req.id);
    proxyReq.setHeader("x-user-role", req.role || "student");
  }
  proxyReq.setHeader("x-speaking-internal-key", INTERNAL_KEY);
}

const proxyOptions: Options = {
  target: SPEAKING_TARGET,
  changeOrigin: true,
  ws: true,
  pathRewrite: { "^/api/speaking": "" },
  on: {
    proxyReq: (proxyReq, req) => {
      setProxyUserHeaders(proxyReq, req as Request);
    },
    error: (err, req, res) => {
      console.error(
        `[speaking] proxy error ${req.method} ${req.url}:`,
        err instanceof Error ? err.message : err,
      );
      if (res && "writeHead" in res && !res.headersSent) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message:
              "Dịch vụ luyện giọng AI không khả dụng. Chạy uvicorn tại port 8000.",
          }),
        );
      }
    },
  },
};

export const speakingPracticeProxy = createProxyMiddleware(proxyOptions);

export function registerSpeakingPracticeRoutes(app: Application): void {
  if (!isSpeakingEnabled()) {
    return;
  }
  app.use("/api/speaking", speakingAuth, speakingPracticeProxy);
}

interface AuthPayload extends JwtPayload {
  id: string;
  role?: string;
}

function getTokenFromUpgrade(req: IncomingMessage): string | undefined {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.split(" ")[1];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match?.[1];
}

function verifyUpgrade(req: IncomingMessage): AuthPayload | null {
  const token = getTokenFromUpgrade(req);
  if (!token) return null;
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as AuthPayload;
  } catch {
    return null;
  }
}

export function attachSpeakingWebSocketUpgrade(server: Server): void {
  if (!isSpeakingEnabled()) {
    return;
  }

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/api/speaking")) {
      return;
    }

    if (!isSpeakingEnabled()) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }

    const decoded = verifyUpgrade(req);
    if (!decoded?.id) {
      // Fallback: allow token via ?token= query param (used by the mobile WS client)
      try {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const token = url.searchParams.get("token");
        if (token) {
          req.headers.authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore
      }
      const retry = verifyUpgrade(req);
      if (!retry?.id) {
        console.warn("[speaking] WS upgrade rejected: invalid token");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      req.headers["x-user-id"] = retry.id;
      req.headers["x-user-role"] = retry.role || "student";
    } else {
      req.headers["x-user-id"] = decoded.id;
      req.headers["x-user-role"] = decoded.role || "student";
    }
    req.headers["x-speaking-internal-key"] = INTERNAL_KEY;

    console.log(`[speaking] WS upgrade → user ${req.headers["x-user-id"]}`);
    speakingPracticeProxy.upgrade?.(req, socket as Socket, head);
  });
}
