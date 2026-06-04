import type WebSocket from "ws";

export interface GrammarProgressPayload {
  documentId: string;
  processingStage: string;
  progress: number;
  status?: string;
  chunkCount?: number;
}

const STAGE_PROGRESS: Record<string, number> = {
  queued: 5,
  ocr: 25,
  embed: 55,
  extract: 85,
  done: 100,
  failed: 0,
};

const subscribers = new Map<string, Set<WebSocket>>();

export function progressForStage(stage: string): number {
  return STAGE_PROGRESS[stage] ?? 0;
}

export function subscribeGrammarProgress(documentId: string, ws: WebSocket): void {
  if (!subscribers.has(documentId)) subscribers.set(documentId, new Set());
  subscribers.get(documentId)!.add(ws);
  ws.on("close", () => {
    subscribers.get(documentId)?.delete(ws);
  });
}

export function publishGrammarProgress(payload: GrammarProgressPayload): void {
  const message = JSON.stringify({ type: "grammar-progress", ...payload });
  const subs = subscribers.get(payload.documentId);
  if (!subs) return;
  for (const ws of subs) {
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

export async function notifyStage(
  documentId: string,
  processingStage: string,
  extra: Partial<GrammarProgressPayload> = {}
): Promise<void> {
  publishGrammarProgress({
    documentId,
    processingStage,
    progress: progressForStage(processingStage),
    ...extra,
  });
}
