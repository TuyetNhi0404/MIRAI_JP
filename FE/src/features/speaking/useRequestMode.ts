import speakingApi, { getSpeakingErrorMessage } from "./speakingApi";
import { speakingApiPath, speakingAudioUrl } from "./config";
import type { ChatMessagesApi } from "./useChatMessages";

export type RequestModeParams = {
  chat: ChatMessagesApi;
  setLoading: (v: boolean) => void;
  setLoadingText: (v: string) => void;
  setRecordDisabled: (v: boolean) => void;
  setRecordLabel: (v: string) => void;
  setIsRecording: (v: boolean) => void;
  setLevel: (v: string) => void;
  setScore: (v: number) => void;
  setServiceUnavailable: (v: boolean) => void;
  setLastError: (v: string | null) => void;
  onResumeListening: () => void;
};

export type RequestModeReturn = {
  send: (blob: Blob) => Promise<void>;
};

export function useRequestMode(p: RequestModeParams): RequestModeReturn {
  const send = async (blob: Blob) => {
    p.setLoading(true);
    p.setRecordDisabled(true);
    try {
      p.setLoadingText("Đang transcribe...");
      const sttForm = new FormData();
      sttForm.append("audio_file", blob, "recording.webm");
      const { data: sttData } = await speakingApi.post(speakingApiPath("/transcribe"), sttForm);
      const transcript = (sttData.transcript as string) || "";
      if (!transcript) {
        p.chat.appendMessage("すみません、聞き取れませんでした。もう一度お願いします！", "system");
        return;
      }
      const userMsgId = `${Date.now()}-${Math.random()}`;
      p.chat.setMessages((prev) => [
        ...prev,
        { id: userMsgId, text: transcript, sender: "user" as const, turnId: userMsgId },
      ]);

      p.setLoadingText("Đang suy nghĩ...");
      const { data: replyData } = await speakingApi.post(speakingApiPath("/reply"), { transcript });
      const { reply, audio_url, grammar_feedback, level: lv, score: sc } = replyData;
      if (lv) p.setLevel(lv);
      if (sc !== undefined) p.setScore(sc);
      if (grammar_feedback) p.chat.attachGrammarFeedback(userMsgId, grammar_feedback);
      if (reply) p.chat.appendMessage(reply, "system");
      if (audio_url) {
        p.setLoadingText("Đang tạo giọng nói...");
        const player = new Audio(speakingAudioUrl(audio_url));
        await new Promise<void>((res) => {
          player.onended = () => res();
          player.onerror = () => res();
          player.play().catch(() => res());
        });
      }
      p.setLastError(null);
    } catch (err) {
      const msg = getSpeakingErrorMessage(err);
      console.error("[speaking] request mode failed:", err);
      p.setServiceUnavailable(true);
      p.setLastError(msg);
      p.chat.appendMessage(msg, "system");
    } finally {
      p.setLoading(false);
      p.setRecordDisabled(false);
      p.setRecordLabel("Nhấn giữ để nói");
      p.setIsRecording(false);
      p.onResumeListening();
    }
  };

  return { send };
}
