import type { Server } from "http";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { subscribeGrammarProgress } from "../service/grammarProgress.service";

function parseToken(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const fromQuery = url.searchParams.get("token");
    if (fromQuery) return fromQuery;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7);
  } catch {
    /* ignore */
  }
  return null;
}

function verifyWsToken(token: string): boolean {
  try {
    jwt.verify(token, process.env.JWT_SECRET || "");
    return true;
  } catch {
    return false;
  }
}

export function attachGrammarWebSocketUpgrade(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const pathname = req.url?.split("?")[0];
    if (pathname !== "/api/grammar/ws") return;

    const token = parseToken(req);
    if (!token || !verifyWsToken(token)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const documentId = url.searchParams.get("documentId");
      if (!documentId) {
        ws.close(1008, "documentId required");
        return;
      }
      subscribeGrammarProgress(documentId, ws);
      ws.send(JSON.stringify({ type: "grammar-progress", documentId, processingStage: "connected", progress: 0 }));
    });
  });
}
