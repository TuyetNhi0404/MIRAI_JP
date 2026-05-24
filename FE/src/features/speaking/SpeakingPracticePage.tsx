import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Snackbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Mic, Zap } from "lucide-react";
import SpeakingCircle from "../../components/AI_animated/SpeakingCircle";
import { TranslatableMessageBubble } from "./TranslatableMessageBubble";
import { CoachSuggestionBubble } from "./CoachSuggestionBubble";
import { GrammarNotesTab } from "./GrammarNotesTab";
import { NotePracticeDialog } from "./NotePracticeDialog";
import { useSpeakingPractice } from "./useSpeakingPractice";
import type { InteractionMode } from "./useSpeakingPractice";
import { useAutoTurnCoach } from "./useAutoTurnCoach";
import { useGrammarNotes } from "./useGrammarNotes";
import type { GrammarNote } from "./types";

const LEVELS = [
  { value: "N5", label: "N5 (Beginner)" },
  { value: "N4", label: "N4 (Elementary)" },
  { value: "N3", label: "N3 (Intermediate)" },
  { value: "N2", label: "N2 (Upper-Int)" },
  { value: "N1", label: "N1 (Advanced)" },
];

const BRAND = "#c83c3c";
const AI_CIRCLE = "#fa9d9d";
const ORB_GAP = 2;
const ORB_RING = 0.6;

type MainTab = "chat" | "notes";

const SpeakingPracticePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    enabled,
    sessionId,
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

  const grammarNotes = useGrammarNotes(enabled);
  const autoCoach = useAutoTurnCoach(enabled, messages, level, sessionId, grammarNotes);

  const [mainTab, setMainTab] = useState<MainTab>("chat");
  const [snack, setSnack] = useState<string | null>(null);
  const [practiceNote, setPracticeNote] = useState<GrammarNote | null>(null);

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
      <Box sx={{ textAlign: "center", mb: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
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
          Free talk — Mirai tự gợi ý sửa khi bạn nói sai
        </Typography>
      </Box>

      {(serviceUnavailable || lastError) && (
        <Alert severity="warning" sx={{ mb: 1, flexShrink: 0, borderRadius: 2 }}>
          {lastError ??
            (serviceUnavailable
              ? "Không kết nối được speaking service — kiểm tra uvicorn :8000, BE :5000, ENABLE_SPEAKING_PRACTICE=true."
              : "")}
        </Alert>
      )}

      {/* Tabs: Hội thoại | Lỗi gặp phải */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          mb: 1,
          flexShrink: 0,
          bgcolor: "#F8F9FA",
          p: "3px",
          borderRadius: 1.25,
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {(
          [
            { id: "chat" as MainTab, label: "Hội thoại" },
            { id: "notes" as MainTab, label: "Lỗi gặp phải" },
          ] as const
        ).map((tab) => (
          <Box
            key={tab.id}
            component="button"
            type="button"
            onClick={() => setMainTab(tab.id)}
            sx={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              py: 0.65,
              borderRadius: 1,
              fontSize: "0.78rem",
              fontWeight: 600,
              bgcolor: mainTab === tab.id ? BRAND : "transparent",
              color: mainTab === tab.id ? "#fff" : "text.secondary",
            }}
          >
            {tab.id === "notes" ? (
              <Badge
                badgeContent={grammarNotes.issueCount || undefined}
                color="error"
                sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", minWidth: 16, height: 16 } }}
              >
                <span style={{ paddingRight: grammarNotes.issueCount ? 8 : 0 }}>{tab.label}</span>
              </Badge>
            ) : (
              tab.label
            )}
          </Box>
        ))}
      </Box>

      {mainTab === "notes" ? (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 0.5 }}>
          <GrammarNotesTab
            notes={grammarNotes.notes.filter(
              (n) => n.corrected && n.corrected.trim() !== n.original.trim(),
            )}
            loading={grammarNotes.loading}
            error={grammarNotes.error}
            onStatusChange={(id, status) => void grammarNotes.setStatus(id, status)}
            onDelete={(id) => void grammarNotes.removeNote(id)}
            onPractice={(note) => setPracticeNote(note)}
          />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
              py: { xs: 0.5, sm: 1 },
            }}
          >
            <Box
              sx={{
                position: "relative",
                boxSizing: "content-box",
                width: circleSize,
                height: circleSize,
                padding: `${ORB_GAP}px`,
                borderRadius: "50%",
                border: `${ORB_RING}px solid`,
                borderColor: circleActive
                  ? "rgba(255, 176, 176, 0.55)"
                  : "rgba(255, 176, 176, 0.35)",
                bgcolor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SpeakingCircle isSpeaking={circleActive} size={circleSize} color={AI_CIRCLE} />
              {isRecording && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#EF4444",
                    border: "2px solid #fff",
                  }}
                />
              )}
            </Box>
          </Box>

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
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "85%",
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <TranslatableMessageBubble
                  text={msg.text}
                  variant={msg.sender === "user" ? "user" : "system"}
                  partial={msg.partial}
                />
                {msg.sender === "user" && !msg.partial && msg.turnId && (
                  <CoachSuggestionBubble
                    loading={autoCoach.getEntry(msg.turnId)?.loading}
                    review={autoCoach.getEntry(msg.turnId)?.review}
                    error={autoCoach.getEntry(msg.turnId)?.error}
                    onViewErrors={() => setMainTab("notes")}
                  />
                )}
              </Box>
            ))}

            {typingVisible && (
              <Box sx={{ alignSelf: "flex-start", px: 2, py: 1.5, bgcolor: "#F8F9FA", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Mirai đang suy nghĩ...
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}

      <Box
        component="footer"
        sx={{ flexShrink: 0, pt: 1.5, pb: 0.5, display: "flex", flexDirection: "column", gap: 1 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "inline-flex", bgcolor: "#F8F9FA", p: "3px", borderRadius: 1.25, border: "1px solid rgba(0,0,0,0.05)" }}>
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
                  bgcolor: mode === opt.value ? BRAND : "transparent",
                  color: mode === opt.value ? "#fff" : "text.secondary",
                }}
              >
                {opt.value === "stream" && <Zap size={14} />}
                {opt.label}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" variant="standard">
              <Select value={level} onChange={(e) => onLevelChange(e.target.value)} disableUnderline sx={{ fontSize: "0.78rem", fontWeight: 600, color: BRAND }}>
                {LEVELS.map((lv) => (
                  <MenuItem key={lv.value} value={lv.value}>
                    {lv.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip label={`Score: ${score}`} size="small" sx={{ fontWeight: 600, color: BRAND, bgcolor: "#FFF0F0" }} />
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
              bgcolor: BRAND,
              opacity: recordDisabled ? 0.55 : 1,
              width: "100%",
              maxWidth: 320,
              justifyContent: "center",
            }}
          >
            {mode === "stream" && sessionActive ? <Zap size={18} /> : <Mic size={18} />}
            <span>{recordLabel}</span>
          </Box>
          {loading && <Typography variant="caption">{loadingText}</Typography>}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            Hover tin nhắn để dịch · Sai ngữ pháp sẽ có gợi ý sửa ngay bên dưới
          </Typography>
        </Box>
      </Box>

      <NotePracticeDialog
        note={practiceNote}
        open={!!practiceNote}
        onClose={() => setPracticeNote(null)}
        onMastered={(id) => {
          void grammarNotes.setStatus(id, "mastered");
          setSnack("Chúc mừng! Đã đánh dấu thuần.");
        }}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default SpeakingPracticePage;
