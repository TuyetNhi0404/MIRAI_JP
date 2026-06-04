import { useEffect, useRef } from "react";
import { getWsOrigin } from "../utils/apiBase";

interface GrammarProgressMessage {
  type: string;
  documentId: string;
  processingStage: string;
  progress: number;
  status?: string;
}


export function useGrammarDocumentProgress(
  documentId: string | null | undefined,
  onProgress?: (msg: GrammarProgressMessage) => void
): void {
  const callbackRef = useRef(onProgress);
  callbackRef.current = onProgress;

  useEffect(() => {
    if (!documentId) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const ws = new WebSocket(
      `${getWsOrigin()}/api/grammar/ws?documentId=${encodeURIComponent(documentId)}&token=${encodeURIComponent(token)}`
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GrammarProgressMessage;
        callbackRef.current?.(data);
      } catch {
        /* ignore malformed */
      }
    };

    return () => ws.close();
  }, [documentId]);
}
