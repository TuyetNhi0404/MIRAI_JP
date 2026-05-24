import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { MessageSquare, Mic, Sparkles, Zap, ClipboardList } from "lucide-react";
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
import { LEVELS, sp } from "./speakingPracticeTheme";
import { panelSx, RecordButton, SegmentedControl } from "./SpeakingPracticeUI";

type MainTab = "chat" | "notes";

const ORB_GAP = 3;
const ORB_RING = 1;

const SpeakingPracticePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mainTab !== "chat") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingVisible, mainTab]);

  if (!enabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ borderRadius: `${sp.radiusMd}px` }}>
          Bật <code>VITE_ENABLE_SPEAKING_PRACTICE=true</code> và service Python để dùng
          luyện giọng.
        </Alert>
      </Box>
    );
  }

  const circleActive = isUserSpeaking || isRecording;
  const circleSize = isMobile ? 168 : 200;

  const orbStatusLabel = isRecording
    ? mode === "request"
      ? "Đang ghi âm — thả tay khi xong"
      : "Đang lắng nghe bạn..."
    : isUserSpeaking
      ? "Mirai đang nghe..."
      : sessionActive
        ? "Phiên trò chuyện đang bật"
        : "Sẵn sàng luyện nói";

  const modeIcon =
    mode === "stream" && sessionActive ? <Zap size={20} strokeWidth={2.5} /> : <Mic size={20} strokeWidth={2.5} />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100vh - 200px)", sm: "calc(100vh - 220px)" },
        minHeight: 480,
        maxWidth: 760,
        mx: "auto",
        width: "100%",
        gap: 1.5,
      }}
    >
      {/* Page header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
        sx={{ flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: `linear-gradient(135deg, ${sp.brandMid} 0%, ${sp.brand} 100%)`,
              boxShadow: sp.shadowMd,
            }}
          >
            <Sparkles size={22} color="#fff" />
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                color: sp.brand,
                fontSize: { xs: "1.15rem", sm: "1.35rem" },
                lineHeight: 1.25,
              }}
            >
              Trợ lý luyện nói
            </Typography>
            <Typography variant="body2" sx={{ color: sp.textSoft, mt: 0.25, lineHeight: 1.45 }}>
              Hội thoại tự do — Mirai gợi ý sửa ngay khi bạn nói sai
            </Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          label={`Điểm ${score}`}
          sx={{
            fontWeight: 700,
            color: sp.brand,
            bgcolor: "#FFF0F0",
            border: `1px solid ${sp.border}`,
            flexShrink: 0,
          }}
        />
      </Stack>

      {(serviceUnavailable || lastError) && (
        <Alert severity="warning" sx={{ flexShrink: 0, borderRadius: `${sp.radiusMd}px` }}>
          {lastError ??
            (serviceUnavailable
              ? "Không kết nối được speaking service — kiểm tra uvicorn :8000, BE :5000, ENABLE_SPEAKING_PRACTICE=true."
              : "")}
        </Alert>
      )}

      {/* Main panel */}
      <Box
        sx={{
          ...panelSx(),
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: { xs: 1.25, sm: 1.75 }, pt: 1.25, pb: 1, flexShrink: 0 }}>
          <SegmentedControl
            aria-label="Chế độ xem"
            value={mainTab}
            onChange={setMainTab}
            options={[
              {
                value: "chat" as MainTab,
                label: "Hội thoại",
                icon: <MessageSquare size={14} />,
              },
              {
                value: "notes" as MainTab,
                label: (
                  <Badge
                    badgeContent={grammarNotes.issueCount || undefined}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.6rem",
                        minWidth: 15,
                        height: 15,
                        right: -6,
                        top: 2,
                      },
                    }}
                  >
                    <span style={{ paddingRight: grammarNotes.issueCount ? 6 : 0 }}>Lỗi gặp phải</span>
                  </Badge>
                ),
                icon: <ClipboardList size={14} />,
              },
            ]}
          />
        </Box>

        {mainTab === "notes" ? (
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 1.25, sm: 1.75 }, pb: 1.5 }}>
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
            {/* AI orb strip */}
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: { xs: 1, sm: 1.5 },
                px: 2,
                borderBottom: `1px solid ${sp.border}`,
                bgcolor: "rgba(255, 251, 251, 0.6)",
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
                    ? "rgba(250, 157, 157, 0.75)"
                    : "rgba(250, 157, 157, 0.4)",
                  transition: sp.transition,
                  boxShadow: circleActive ? sp.shadowMd : sp.shadowSm,
                }}
              >
                <SpeakingCircle isSpeaking={circleActive} size={circleSize} color={sp.orb} />
                {isRecording && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#EF4444",
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 2px rgba(239,68,68,0.3)",
                    }}
                    aria-hidden
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  color: circleActive ? sp.brand : sp.textSoft,
                  textAlign: "center",
                  transition: sp.transition,
                }}
                aria-live="polite"
              >
                {orbStatusLabel}
              </Typography>
            </Box>

            {/* Messages */}
            <Box
              component="section"
              aria-label="Hội thoại"
              aria-live="polite"
              aria-relevant="additions"
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                px: { xs: 1.25, sm: 1.75 },
                py: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                scrollBehavior: "smooth",
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "rgba(185,0,0,0.15)",
                  borderRadius: 3,
                },
              }}
            >
              {messages.length <= 1 && (
                <Box
                  sx={{
                    alignSelf: "center",
                    textAlign: "center",
                    py: 2,
                    px: 2,
                    maxWidth: 320,
                  }}
                >
                  <Typography variant="body2" sx={{ color: sp.textSoft, lineHeight: 1.6 }}>
                    Nhấn nút mic bên dưới để bắt đầu. Di chuột lên tin nhắn tiếng Nhật để xem nghĩa tiếng Việt.
                  </Typography>
                </Box>
              )}

              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "88%",
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
                <Box
                  sx={{
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    bgcolor: sp.surfaceMuted,
                    borderRadius: `${sp.radiusMd}px`,
                    border: `1px solid ${sp.border}`,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: sp.brand }} />
                  <Typography variant="caption" sx={{ color: sp.textSoft, fontWeight: 500 }}>
                    Mirai đang suy nghĩ...
                  </Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
          </>
        )}

        {/* Control dock */}
        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${sp.border}`,
            bgcolor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(8px)",
            px: { xs: 1.25, sm: 1.75 },
            py: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <SegmentedControl
              aria-label="Chế độ tương tác"
              value={mode}
              onChange={setMode}
              size="sm"
              options={[
                {
                  value: "request" as InteractionMode,
                  label: "Nhấn giữ",
                  icon: <Mic size={13} />,
                },
                {
                  value: "stream" as InteractionMode,
                  label: "Liên tục",
                  icon: <Zap size={13} />,
                },
              ]}
            />

            <FormControl size="small" variant="standard">
              <Select
                value={level}
                onChange={(e) => onLevelChange(e.target.value)}
                disableUnderline
                aria-label="Cấp độ JLPT"
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: sp.brand,
                  bgcolor: "#FFF0F0",
                  borderRadius: `${sp.radiusSm}px`,
                  px: 1,
                  py: 0.25,
                  border: `1px solid ${sp.border}`,
                  "& .MuiSelect-select": { py: 0.5, pr: 3 },
                  "&:focus": { bgcolor: "#FFF0F0" },
                }}
              >
                {LEVELS.map((lv) => (
                  <MenuItem key={lv.value} value={lv.value} sx={{ fontSize: "0.85rem" }}>
                    {lv.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            {loading && (
              <Box sx={{ width: "100%", maxWidth: 340 }}>
                <LinearProgress
                  sx={{
                    height: 3,
                    borderRadius: 2,
                    bgcolor: "rgba(185,0,0,0.08)",
                    "& .MuiLinearProgress-bar": { bgcolor: sp.brand },
                  }}
                />
                {loadingText && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", textAlign: "center", mt: 0.5, color: sp.textSoft }}
                  >
                    {loadingText}
                  </Typography>
                )}
              </Box>
            )}

            <RecordButton
              label={recordLabel}
              disabled={recordDisabled}
              isRecording={isRecording}
              isUserSpeaking={isUserSpeaking}
              sessionActive={sessionActive}
              modeIcon={modeIcon}
              onPointerDown={() => void onRecordPointerDown()}
              onPointerUp={onRecordPointerUp}
              onPointerLeave={onRecordPointerLeave}
            />

            <Typography
              variant="caption"
              sx={{ color: sp.textSoft, textAlign: "center", lineHeight: 1.5, maxWidth: 360 }}
            >
              Di chuột tin nhắn để dịch · Gợi ý sửa lỗi hiện ngay dưới câu của bạn
            </Typography>
          </Box>
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
