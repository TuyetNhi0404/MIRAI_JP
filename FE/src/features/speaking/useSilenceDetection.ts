import { useCallback, useRef } from "react";

const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION = 800;

export type SilenceDetectionParams = {
  isSessionActiveRef: React.MutableRefObject<boolean>;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  isSpeakingRef: React.MutableRefObject<boolean>;
  silenceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  onSilenceTimeout: () => void;
  setIsUserSpeaking: (v: boolean) => void;
  setRecordLabel: (v: string) => void;
  setAudioLevel: (v: number) => void;
};

export function useSilenceDetection(p: SilenceDetectionParams) {
  const rafRef = useRef(0);

  const start = useCallback(
    async (stream: MediaStream) => {
      if (p.audioContextRef.current) await p.audioContextRef.current.close();
      const ctx = new AudioContext();
      p.audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      const data = new Float32Array(analyser.frequencyBinCount);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let smoothedLevel = 0;

      const check = () => {
        if (!p.isSessionActiveRef.current) {
          p.setAudioLevel(0);
          return;
        }
        analyser.getFloatTimeDomainData(data);
        analyser.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);

        let freqSum = 0;
        const half = Math.floor(freqData.length * 0.5);
        for (let i = 0; i < half; i++) freqSum += freqData[i];
        const freqAvg = freqSum / half / 255;

        const target = Math.min(1, Math.max(rms * 6, freqAvg));
        smoothedLevel += (target - smoothedLevel) * 0.18;
        p.setAudioLevel(smoothedLevel);

        const mr = p.mediaRecorderRef.current;
        if (rms > SILENCE_THRESHOLD) {
          if (!p.isSpeakingRef.current && mr?.state === "recording") {
            p.isSpeakingRef.current = true;
            p.setIsUserSpeaking(true);
            p.setRecordLabel("Đang lắng nghe...");
          }
          if (p.silenceTimeoutRef.current) {
            clearTimeout(p.silenceTimeoutRef.current);
            p.silenceTimeoutRef.current = null;
          }
        } else if (
          p.isSpeakingRef.current &&
          mr?.state === "recording" &&
          !p.silenceTimeoutRef.current
        ) {
          p.silenceTimeoutRef.current = setTimeout(p.onSilenceTimeout, SILENCE_DURATION);
        }

        rafRef.current = requestAnimationFrame(check);
      };

      rafRef.current = requestAnimationFrame(check);
    },
    [p],
  );

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (p.silenceTimeoutRef.current) {
      clearTimeout(p.silenceTimeoutRef.current);
      p.silenceTimeoutRef.current = null;
    }
    if (p.audioContextRef.current) {
      void p.audioContextRef.current.close();
      p.audioContextRef.current = null;
    }
    p.setAudioLevel(0);
  }, [p]);

  return { start, stop };
}
