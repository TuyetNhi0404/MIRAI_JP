import {
  Alert,
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { Mic, Zap } from "lucide-react";
import { useSpeakingPractice } from "./useSpeakingPractice";
import type { InteractionMode } from "./useSpeakingPractice";

const LEVELS = [
  { value: "N5", label: "N5 (Beginner)" },
  { value: "N4", label: "N4 (Elementary)" },
  { value: "N3", label: "N3 (Intermediate)" },
  { value: "N2", label: "N2 (Upper-Int)" },
  { value: "N1", label: "N1 (Advanced)" },
];

const SpeakingPracticePage = () => {
  const {
    enabled,
    messages,
    level,
    score,
    mode,
    setMode,
    loading,
    loadingText,
    recordLabel,
    sessionActive,
    isRecording,
    isUserSpeaking,
    typingVisible,
    recordDisabled,
    serviceUnavailable,
    lastError,
    onLevelChange,
    onRecordPointerDown,
    onRecordPointerUp,
    onRecordPointerLeave,
  } = useSpeakingPractice();

  if (!enabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Bật <code>VITE_ENABLE_SPEAKING_PRACTICE=true</code> và service Python để dùng
          luyện giọng.
        </Alert>
      </Box>
    );
  }

  const recordBtnClass = [
    sessionActive ? "session-active" : "",
    isRecording && mode === "stream" ? "recording" : "",
    isUserSpeaking ? "user-speaking" : "",
    isRecording && mode === "request" ? "recording" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 140px)",
        py: 2,
        px: 1,
        bgcolor: "#FFF5F7",
      }}
    >
      <Box
        className="speaking-app"
        sx={{
          width: "100%",
          maxWidth: 440,
          height: { xs: "calc(100vh - 160px)", sm: "94vh" },
          maxHeight: 720,
          bgcolor: "#fff",
          borderRadius: "28px",
          boxShadow: "0 10px 40px rgba(255, 123, 156, 0.06)",
          border: "1px solid rgba(255, 123, 156, 0.1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            textAlign: "center",
            py: 2,
            px: 2.5,
            borderBottom: "1px solid rgba(255, 123, 156, 0.15)",
          }}
        >
          <Typography
            sx={{ fontSize: "1.35rem", fontWeight: 700, color: "#FF5E85" }}
          >
            AI Japanese Tutor
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#636E72", mt: 0.5 }}>
            Personalized Japanese Speaking Coach
          </Typography>
        </Box>

        {/* Status bar */}
        <Box
          sx={{
            bgcolor: "#FFFDFE",
            px: 2.25,
            py: 1.5,
            borderBottom: "1px solid rgba(255, 123, 156, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          {(serviceUnavailable || lastError) && (
            <Alert severity="warning" sx={{ py: 0 }}>
              {lastError ||
                "Service chưa chạy — chạy uvicorn port 8000 và restart BE (ENABLE_SPEAKING_PRACTICE=true)."}
            </Alert>
          )}

          {/* Mode toggle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 0.5,
              borderBottom: "1px dashed rgba(255, 123, 156, 0.1)",
            }}
          >
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#636E72" }}>
              Mode:
            </Typography>
            <Box
              sx={{
                display: "flex",
                bgcolor: "#F8F9FA",
                p: "3px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              {(
                [
                  { value: "request" as InteractionMode, label: "Hold to talk" },
                  { value: "stream" as InteractionMode, label: "Streaming ⚡" },
                ] as const
              ).map((opt) => (
                <Box
                  key={opt.value}
                  component="button"
                  type="button"
                  onClick={() => setMode(opt.value)}
                  sx={{
                    border: "none",
                    cursor: "pointer",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    bgcolor: mode === opt.value ? "#FF7B9C" : "transparent",
                    color: mode === opt.value ? "#fff" : "#636E72",
                    boxShadow:
                      mode === opt.value
                        ? "0 2px 8px rgba(255, 123, 156, 0.25)"
                        : "none",
                    transition: "all 0.25s ease",
                  }}
                >
                  {opt.label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Level */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <Typography sx={{ fontWeight: 500, color: "#636E72" }}>
              Set Start Level:
            </Typography>
            <FormControl size="small" variant="standard">
              <Select
                value={level}
                onChange={(e) => onLevelChange(e.target.value)}
                disableUnderline
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid rgba(255, 123, 156, 0.15)",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "#fff",
                }}
              >
                {LEVELS.map((lv) => (
                  <MenuItem key={lv.value} value={lv.value}>
                    {lv.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Stats */}
          <Box sx={{ display: "flex", gap: 1.25 }}>
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "#FFF0F3",
                px: 1.75,
                py: 1,
                borderRadius: "12px",
                border: "1px solid rgba(255, 123, 156, 0.08)",
              }}
            >
              <Typography sx={{ fontSize: "0.85rem", color: "#636E72" }}>
                Coach Level:
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#FF6288" }}>{level}</Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "#F0F6FF",
                px: 1.75,
                py: 1,
                borderRadius: "12px",
                border: "1px solid rgba(74, 144, 226, 0.1)",
              }}
            >
              <Typography sx={{ fontSize: "0.85rem", color: "#636E72" }}>
                Score:
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#4A90E2" }}>{score}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Chat */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 2.5,
            overflow: "hidden",
            bgcolor: "#FAFAFB",
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pb: 2.5,
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: "flex",
                  maxWidth: "85%",
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.3s ease forwards",
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(8px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Box
                  sx={{
                    px: 2.25,
                    py: 1.5,
                    borderRadius: "18px",
                    fontSize: "0.95rem",
                    lineHeight: 1.45,
                    fontFamily: '"Noto Sans JP", "Inter", sans-serif',
                    ...(msg.sender === "user"
                      ? {
                          bgcolor: msg.partial ? "rgba(255,255,255,0.5)" : "#FFE4EA",
                          color: msg.partial ? "#636E72" : "#4A1521",
                          borderBottomRightRadius: "4px",
                          border: msg.partial
                            ? "1.5px dashed rgba(255, 123, 156, 0.45)"
                            : "1px solid rgba(255, 123, 156, 0.1)",
                          fontStyle: msg.partial ? "italic" : "normal",
                          opacity: msg.partial ? 0.85 : 1,
                        }
                      : {
                          bgcolor: "#fff",
                          color: "#2D3436",
                          borderBottomLeftRadius: "4px",
                          border: "1px solid rgba(0,0,0,0.04)",
                        }),
                  }}
                >
                  {msg.text}
                </Box>
              </Box>
            ))}

            {typingVisible && (
              <Box sx={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 2.5,
                    py: 1.75,
                    borderRadius: "18px",
                    bgcolor: "#fff",
                    border: "1px solid rgba(0,0,0,0.03)",
                  }}
                >
                  {[0, 0.2, 0.4].map((delay) => (
                    <Box
                      key={delay}
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: "#B2BEC3",
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: `${delay}s`,
                        "@keyframes bounce": {
                          "0%, 60%, 100%": { transform: "translateY(0)" },
                          "30%": { transform: "translateY(-5px)" },
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Controls */}
          <Box
            sx={{
              pt: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              borderTop: "1px solid rgba(0,0,0,0.03)",
            }}
          >
            <Box
              component="button"
              type="button"
              disabled={recordDisabled}
              className={recordBtnClass}
              onMouseDown={(e) => {
                e.preventDefault();
                void onRecordPointerDown();
              }}
              onMouseUp={onRecordPointerUp}
              onMouseLeave={onRecordPointerLeave}
              onTouchStart={(e) => {
                e.preventDefault();
                void onRecordPointerDown();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onRecordPointerUp();
              }}
              sx={{
                border: "none",
                borderRadius: "30px",
                px: 3.5,
                py: 1.75,
                fontSize: "1rem",
                fontWeight: 600,
                cursor: recordDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                color: "#fff",
                userSelect: "none",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                bgcolor: "#FF7B9C",
                boxShadow: "0 6px 20px rgba(255, 123, 156, 0.35)",
                opacity: recordDisabled ? 0.55 : 1,
                "&:active:not(:disabled)": {
                  transform: "scale(0.96)",
                  bgcolor: "#FF6288",
                },
                "&.session-active": {
                  bgcolor: "#3B3B3B",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
                },
                "&.session-active.recording, &.recording": {
                  bgcolor: "#FF5E85",
                  animation: "pulseSakura 1.5s infinite cubic-bezier(0.66, 0, 0, 1)",
                  "@keyframes pulseSakura": {
                    to: { boxShadow: "0 0 0 18px rgba(255, 94, 133, 0)" },
                  },
                },
                "&.user-speaking": {
                  bgcolor: "#2ED573",
                  animation: "pulseGreen 1.2s infinite cubic-bezier(0.66, 0, 0, 1)",
                  "@keyframes pulseGreen": {
                    to: { boxShadow: "0 0 0 18px rgba(46, 213, 115, 0)" },
                  },
                },
              }}
            >
              {mode === "stream" && sessionActive ? (
                <Zap size={20} />
              ) : (
                <Mic size={20} />
              )}
              <span>{recordLabel}</span>
            </Box>

            {loading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: "0.85rem",
                  color: "#636E72",
                }}
              >
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(0,0,0,0.06)",
                    borderTopColor: "#FF7B9C",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                  }}
                />
                <span>{loadingText}</span>
              </Box>
            )}

            <Typography
              variant="caption"
              sx={{ color: "#636E72", textAlign: "center", maxWidth: 320 }}
            >
              {mode === "request"
                ? "Giữ nút mic để nói, thả ra để gửi (STT → AI → TTS)."
                : "Bấm Start Session: nói tự do, im lặng ~0.8s để Mirai trả lời realtime."}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SpeakingPracticePage;
