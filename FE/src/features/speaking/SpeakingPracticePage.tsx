import {
  Alert,
  Box,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Mic, Zap } from "lucide-react";
import SpeakingCircle from "../../components/AI_animated/SpeakingCircle";
import { useSpeakingPractice } from "./useSpeakingPractice";
import type { InteractionMode } from "./useSpeakingPractice";

const LEVELS = [
  { value: "N5", label: "N5 (Beginner)" },
  { value: "N4", label: "N4 (Elementary)" },
  { value: "N3", label: "N3 (Intermediate)" },
  { value: "N2", label: "N2 (Upper-Int)" },
  { value: "N1", label: "N1 (Advanced)" },
];

const BRAND = "#c83c3c";
const AI_CIRCLE = "#ffb0b0";

const SpeakingPracticePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  const circleActive = isUserSpeaking || isRecording;
  const circleSize = isMobile ? 200 : 240;

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
        flexDirection: "column",
        height: { xs: "calc(100vh - 180px)", sm: "calc(100vh - 200px)" },
        minHeight: 520,
        maxWidth: 720,
        mx: "auto",
        width: "100%",
      }}
    >
      {/* Page header */}
      <Box sx={{ textAlign: "center", mb: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            background: "linear-gradient(45deg, #B90000, #ff4d4d)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.35rem", sm: "1.6rem" },
          }}
        >
          AI Japanese Tutor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Personalized Speaking Coach
        </Typography>
      </Box>

      {(serviceUnavailable || lastError) && (
        <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0, borderRadius: 2 }}>
          {lastError ||
            "Service chưa chạy — chạy uvicorn port 8000 và restart BE (ENABLE_SPEAKING_PRACTICE=true)."}
        </Alert>
      )}

      {/* Centered voice orb */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
          py: { xs: 1, sm: 2 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: circleSize + 24,
            height: circleSize + 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              bgcolor: circleActive ? "rgba(185,0,0,0.06)" : "rgba(185,0,0,0.03)",
              transform: circleActive ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.35s ease, background-color 0.35s ease",
            }}
          />
          <SpeakingCircle isSpeaking={circleActive} size={circleSize} color={AI_CIRCLE} />
          {isRecording && (
            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#EF4444",
                border: "2px solid #fff",
                animation: "micPulse 1.2s infinite",
                "@keyframes micPulse": {
                  "0%, 100%": { opacity: 1, transform: "scale(1)" },
                  "50%": { opacity: 0.5, transform: "scale(1.35)" },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Chat transcript */}
      <Box
        component="section"
        aria-label="Conversation"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: 0.5, sm: 1 },
          py: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          borderTop: "1px solid rgba(185,0,0,0.08)",
          borderBottom: "1px solid rgba(185,0,0,0.08)",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(185,0,0,0.18)",
            borderRadius: 3,
          },
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
                from: { opacity: 0, transform: "translateY(6px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderRadius: 2.5,
                fontSize: "0.9rem",
                lineHeight: 1.5,
                fontFamily: '"Noto Sans JP", "Inter", sans-serif',
                ...(msg.sender === "user"
                  ? {
                      bgcolor: msg.partial ? "rgba(255,240,240,0.6)" : "#FFF0F0",
                      color: msg.partial ? "text.secondary" : "#4A1515",
                      borderBottomRightRadius: 4,
                      border: msg.partial
                        ? "1.5px dashed rgba(185,0,0,0.35)"
                        : "1px solid rgba(185,0,0,0.1)",
                      fontStyle: msg.partial ? "italic" : "normal",
                      opacity: msg.partial ? 0.9 : 1,
                    }
                  : {
                      bgcolor: "#F8F9FA",
                      color: "text.primary",
                      borderBottomLeftRadius: 4,
                      border: "1px solid rgba(0,0,0,0.05)",
                    }),
              }}
            >
              {msg.text}
            </Box>
          </Box>
        ))}

        {typingVisible && (
          <Box sx={{ alignSelf: "flex-start" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2.25,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: "#F8F9FA",
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              {[0, 0.2, 0.4].map((delay) => (
                <Box
                  key={delay}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "rgba(185,0,0,0.35)",
                    animation: "bounce 1.4s infinite ease-in-out",
                    animationDelay: `${delay}s`,
                    "@keyframes bounce": {
                      "0%, 60%, 100%": { transform: "translateY(0)" },
                      "30%": { transform: "translateY(-4px)" },
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Bottom voice panel */}
      <Box
        component="footer"
        sx={{
          flexShrink: 0,
          pt: 2,
          pb: 0.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              bgcolor: "#F8F9FA",
              p: "3px",
              borderRadius: 1.25,
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            {(
              [
                { value: "request" as InteractionMode, label: "Hold" },
                { value: "stream" as InteractionMode, label: "Stream" },
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
                  py: 0.65,
                  borderRadius: 1,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: mode === opt.value ? BRAND : "transparent",
                  color: mode === opt.value ? "#fff" : "text.secondary",
                  boxShadow:
                    mode === opt.value ? "0 2px 8px rgba(185,0,0,0.22)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {opt.value === "stream" && <Zap size={14} />}
                {opt.label}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" variant="standard">
              <Select
                value={level}
                onChange={(e) => onLevelChange(e.target.value)}
                disableUnderline
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: BRAND,
                  border: "1px solid rgba(185,0,0,0.15)",
                  borderRadius: 1,
                  px: 1,
                  py: 0.35,
                  bgcolor: "#fff",
                  "& .MuiSelect-icon": { color: BRAND },
                }}
              >
                {LEVELS.map((lv) => (
                  <MenuItem key={lv.value} value={lv.value}>
                    {lv.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip
              label={`Score: ${score}`}
              size="small"
              sx={{
                fontWeight: 600,
                color: BRAND,
                bgcolor: "#FFF0F0",
                border: "1px solid rgba(185,0,0,0.12)",
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
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
              borderRadius: "50px",
              px: 4,
              py: 1.5,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: recordDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#fff",
              userSelect: "none",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: BRAND,
              boxShadow: "0 6px 20px rgba(185,0,0,0.28)",
              opacity: recordDisabled ? 0.55 : 1,
              width: "100%",
              maxWidth: 320,
              justifyContent: "center",
              "&:active:not(:disabled)": {
                transform: "scale(0.97)",
                bgcolor: "#990000",
              },
              "&.session-active": {
                bgcolor: "#3B3B3B",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
              },
              "&.session-active.recording, &.recording": {
                bgcolor: BRAND,
                animation: "pulseBrand 1.5s infinite cubic-bezier(0.66, 0, 0, 1)",
                "@keyframes pulseBrand": {
                  to: { boxShadow: "0 0 0 16px rgba(185,0,0,0)" },
                },
              },
              "&.user-speaking": {
                bgcolor: "#2ED573",
                animation: "pulseGreen 1.2s infinite cubic-bezier(0.66, 0, 0, 1)",
                "@keyframes pulseGreen": {
                  to: { boxShadow: "0 0 0 16px rgba(46, 213, 115, 0)" },
                },
              },
            }}
          >
            {mode === "stream" && sessionActive ? <Zap size={18} /> : <Mic size={18} />}
            <span>{recordLabel}</span>
          </Box>

          {loading && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.85rem",
                color: "text.secondary",
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(0,0,0,0.06)",
                  borderTopColor: BRAND,
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
            color="text.secondary"
            sx={{ textAlign: "center", maxWidth: 400, lineHeight: 1.45 }}
          >
            {mode === "request"
              ? "Giữ nút mic để nói, thả ra để gửi (STT → AI → TTS)."
              : "Bấm Start Session: nói tự do, im lặng ~0.8s để Mirai trả lời realtime."}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SpeakingPracticePage;
