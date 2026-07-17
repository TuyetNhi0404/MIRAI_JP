import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  MessageSquare,
  Mic,
  Sparkles,
  Zap,
  ClipboardList,
  GraduationCap,
  Activity,
  Lightbulb,
  ChevronRight,
  Volume2,
  Check,
} from "lucide-react";
import AudioWaveSphere3D from "../../components/AI_animated/AudioWaveSphere3D";
import { TranslatableMessageBubble } from "./TranslatableMessageBubble";
import { CoachSuggestionBubble } from "./CoachSuggestionBubble";
import { NotePracticeDialog } from "./NotePracticeDialog";
import { useSpeakingPractice } from "./useSpeakingPractice";
import type { InteractionMode } from "./useSpeakingPractice";
import { useAutoTurnCoach } from "./useAutoTurnCoach";
import { useGrammarNotes } from "./useGrammarNotes";
import type { GrammarNote } from "./types";
import { LEVELS, sp } from "./speakingPracticeTheme";
import { panelSx, RecordButton, SegmentedControl } from "./SpeakingPracticeUI";

const ORB_SIZE_DESKTOP = 168;
const ORB_SIZE_MOBILE = 132;

const SpeakingPracticePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    enabled,
    sessionId,
    messages,
    level,
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
    audioLevel,
    onLevelChange,
    onRecordPointerDown,
    onRecordPointerUp,
    onRecordPointerLeave,
  } = useSpeakingPractice();

  const grammarNotes = useGrammarNotes(enabled);
  const autoCoach = useAutoTurnCoach(enabled, messages, level, sessionId, grammarNotes);

  const [snack, setSnack] = useState<string | null>(null);
  const [practiceNote, setPracticeNote] = useState<GrammarNote | null>(null);
  const [activeCoachTurnId, setActiveCoachTurnId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingVisible]);

  const lastUserTurn = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.sender === "user" && !m.partial && m.turnId) return m;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    setActiveCoachTurnId(lastUserTurn?.turnId ?? null);
  }, [lastUserTurn]);

  const activeCoachEntry = activeCoachTurnId ? autoCoach.getEntry(activeCoachTurnId) : null;

  const recentNotes = useMemo(
    () =>
      grammarNotes.notes
        .filter(
          (n) =>
            n.corrected &&
            n.corrected.trim() !== n.original.trim() &&
            n.status !== "mastered",
        )
        .slice(0, 3),
    [grammarNotes.notes],
  );

  const totalNotes = grammarNotes.notes.filter(
    (n) =>
      n.corrected &&
      n.corrected.trim() !== n.original.trim() &&
      n.status !== "mastered",
  ).length;

  const masteredNotes = grammarNotes.notes.filter(
    (n) =>
      n.corrected &&
      n.corrected.trim() !== n.original.trim() &&
      n.status === "mastered",
  ).length;

  if (!enabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ borderRadius: `${sp.radiusMd}px` }}>
          Bật <code>VITE_ENABLE_SPEAKING_PRACTICE=true</code> và service Python để dùng luyện giọng.
        </Alert>
      </Box>
    );
  }

  const circleActive = isUserSpeaking || isRecording;
  const orbSize = isMobile ? ORB_SIZE_MOBILE : ORB_SIZE_DESKTOP;

  const orbStatusLabel = isRecording
    ? mode === "request"
      ? "Đang ghi âm, thả tay khi xong"
      : "Đang lắng nghe bạn"
    : isUserSpeaking
      ? "Mirai đang nghe"
      : sessionActive
        ? "Phiên đang bật"
        : "Sẵn sàng luyện nói";

  const modeIcon =
    mode === "stream" && sessionActive ? <Zap size={16} strokeWidth={2.4} /> : <Mic size={16} strokeWidth={2.4} />;

  const sessionStateMeta: { color: string; bg: string; label: string } = sessionActive
    ? { color: sp.success, bg: sp.successSoft, label: "Trực tuyến" }
    : isRecording
      ? { color: sp.danger, bg: sp.dangerSoft, label: "Ghi âm" }
      : { color: sp.textSoft, bg: sp.surfaceMuted, label: "Chờ" };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100vh - 160px)", sm: "calc(100vh - 180px)" },
        minHeight: 540,
        maxWidth: 1180,
        mx: "auto",
        width: "100%",
        gap: 1.5,
      }}
    >
      {/* HERO HEADER */}
      <Box
        sx={{
          ...panelSx({ elevated: true }),
          px: { xs: 1.75, sm: 2.5 },
          py: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: `linear-gradient(135deg, ${sp.brandMid} 0%, ${sp.brand} 100%)`,
              boxShadow: sp.shadowBrand,
            }}
          >
            <Sparkles size={20} color="#fff" strokeWidth={2.2} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  color: sp.text,
                  fontSize: { xs: "1.05rem", sm: "1.2rem" },
                  lineHeight: 1.2,
                  letterSpacing: -0.2,
                }}
              >
                Trợ lý luyện nói
              </Typography>
              <Chip
                size="small"
                label={sessionStateMeta.label}
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  bgcolor: sessionStateMeta.bg,
                  color: sessionStateMeta.color,
                  border: "none",
                  "& .MuiChip-label": { px: 0.85 },
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: sp.textSoft, lineHeight: 1.4 }}>
              Hội thoại tự do, Mirai gợi ý sửa ngay khi bạn nói sai
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
          <FormControl size="small" variant="standard">
            <Select
              value={level}
              onChange={(e) => onLevelChange(e.target.value)}
              disableUnderline
              aria-label="Cấp độ JLPT"
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: sp.text,
                bgcolor: sp.surfaceMuted,
                borderRadius: `${sp.radiusSm}px`,
                px: 1,
                py: 0.25,
                border: `1px solid ${sp.hairline}`,
                "& .MuiSelect-select": { py: 0.55, pr: 2.5 },
                "&:hover": { bgcolor: sp.surfaceMuted },
                "&:focus": { bgcolor: sp.surfaceMuted },
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
      </Box>

      {(serviceUnavailable || lastError) && (
        <Alert severity="warning" sx={{ flexShrink: 0, borderRadius: `${sp.radiusMd}px` }}>
          {lastError ??
            (serviceUnavailable
              ? "Không kết nối được speaking service. Kiểm tra uvicorn :8000, BE :5000, ENABLE_SPEAKING_PRACTICE=true."
              : "")}
        </Alert>
      )}

      {/* MAIN GRID */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 360px" },
          gap: 1.5,
        }}
      >
        {/* LEFT: CHAT COLUMN */}
        <Box
          sx={{
            ...panelSx(),
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${sp.hairline}`, flexShrink: 0 }}
          >
            <MessageSquare size={14} color={sp.textSoft} />
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: sp.text, letterSpacing: 0.1 }}>
              Hội thoại
            </Typography>
            <Chip
              size="small"
              label={messages.length}
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: sp.surfaceMuted,
                color: sp.textMuted,
                ml: 0.25,
                "& .MuiChip-label": { px: 0.85 },
              }}
            />
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Activity size={11} color={circleActive ? sp.danger : sp.textFaint} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: circleActive ? sp.danger : sp.textSoft }}>
                {orbStatusLabel}
              </Typography>
            </Stack>
          </Stack>

          <Box
            component="section"
            aria-label="Hội thoại"
            aria-live="polite"
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 1.5, sm: 2 },
              py: 1.75,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              scrollBehavior: "smooth",
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(15, 23, 42, 0.12)", borderRadius: 3 },
            }}
          >
            {messages.length <= 1 && (
              <Box
                sx={{
                  alignSelf: "center",
                  textAlign: "center",
                  py: 4,
                  px: 2,
                  maxWidth: 320,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.25,
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: sp.brandTint,
                    border: `1px solid ${sp.brandBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Volume2 size={22} color={sp.brand} strokeWidth={2.2} />
                </Box>
                <Stack spacing={0.5} alignItems="center">
                  <Typography
                    sx={{ color: sp.text, fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.4 }}
                  >
                    Sẵn sàng luyện nói
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: sp.textSoft, lineHeight: 1.55, fontSize: "0.78rem" }}
                  >
                    Nhấn nút mic bên dưới để bắt đầu.
                    {"\n"}
                    Di chuột lên tin nhắn tiếng Nhật để xem nghĩa tiếng Việt.
                  </Typography>
                </Stack>
              </Box>
            )}

            {messages.map((msg) => (
              <Box
                key={msg.id}
                className="mira-msg-enter"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "82%",
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
                  px: 1.5,
                  py: 1,
                  bgcolor: sp.surfaceMuted,
                  borderRadius: `${sp.radiusMd}px`,
                  border: `1px solid ${sp.hairline}`,
                }}
              >
                <CircularProgress size={12} sx={{ color: sp.brand }} thickness={5} />
                <Typography variant="caption" sx={{ color: sp.textMuted, fontWeight: 500, fontSize: "0.75rem" }}>
                  Mirai đang suy nghĩ
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box
            component="footer"
            sx={{
              flexShrink: 0,
              borderTop: `1px solid ${sp.hairline}`,
              bgcolor: sp.surfaceSunken,
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <SegmentedControl
                aria-label="Chế độ tương tác"
                value={mode}
                onChange={setMode}
                size="sm"
                options={[
                  { value: "request" as InteractionMode, label: "Nhấn giữ", icon: <Mic size={12} /> },
                  { value: "stream" as InteractionMode, label: "Liên tục", icon: <Zap size={12} /> },
                ]}
              />
              <Typography sx={{ fontSize: "0.7rem", color: sp.textSoft, maxWidth: 360, lineHeight: 1.45 }}>
                Di chuột để dịch · Gợi ý sửa hiện ngay dưới câu của bạn
              </Typography>
            </Stack>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              {loading && (
                <Box sx={{ width: "100%", maxWidth: 340 }}>
                  <LinearProgress
                    sx={{
                      height: 3,
                      borderRadius: 2,
                      bgcolor: "rgba(185, 0, 0, 0.08)",
                      "& .MuiLinearProgress-bar": { bgcolor: sp.brand },
                    }}
                  />
                  {loadingText && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", textAlign: "center", mt: 0.5, color: sp.textSoft, fontSize: "0.7rem" }}
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
              />
            </Box>
          </Box>
        </Box>

        {/* RIGHT: SIDE PANEL (tablet+ only) */}
        {!isTablet && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {/* MIRAI HERO */}
            <Box
              sx={{
                ...panelSx(),
                position: "relative",
                overflow: "hidden",
                p: 0,
                flexShrink: 0,
                background: circleActive
                  ? `linear-gradient(180deg, ${sp.brandTint} 0%, ${sp.surface} 70%)`
                  : `linear-gradient(180deg, ${sp.surfaceSunken} 0%, ${sp.surface} 70%)`,
                transition: sp.transition,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "62%",
                  transform: "translate(-50%, -50%)",
                  width: orbSize + 56,
                  height: orbSize + 56,
                  borderRadius: "50%",
                  background: circleActive
                    ? `radial-gradient(circle, ${sp.brand}26 0%, ${sp.brandAccent}14 38%, transparent 70%)`
                    : `radial-gradient(circle, ${sp.brand}0F 0%, transparent 65%)`,
                  filter: "blur(6px)",
                  pointerEvents: "none",
                  transition: "background 0.4s ease",
                }}
              />
              <Box sx={{ position: "relative", p: 2, pb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <GraduationCap size={14} color={sp.brand} />
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: sp.text, letterSpacing: 0.4, textTransform: "uppercase" }}>
                      Mirai
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.85,
                      py: 0.35,
                      borderRadius: `${sp.radiusPill}px`,
                      bgcolor: circleActive ? sp.brandTint : sp.surfaceMuted,
                      border: `1px solid ${circleActive ? sp.brandBorder : sp.hairline}`,
                      transition: sp.transition,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: circleActive ? sp.brand : sp.textFaint,
                        boxShadow: circleActive ? `0 0 0 3px ${sp.brandTint}` : "none",
                        animation: circleActive
                          ? "mira-ring-pulse 1.6s ease-out infinite"
                          : "none",
                        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        color: circleActive ? sp.brand : sp.textSoft,
                        letterSpacing: 0.1,
                      }}
                    >
                      {circleActive ? "Đang hoạt động" : "Sẵn sàng"}
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    position: "relative",
                    mx: "auto",
                    my: 0.5,
                    width: orbSize + 12,
                    height: orbSize + 12,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      inset: 4,
                      borderRadius: "50%",
                      background: circleActive
                        ? `radial-gradient(circle, ${sp.brandTintStrong} 0%, transparent 60%)`
                        : `radial-gradient(circle, ${sp.surfaceMuted} 0%, transparent 65%)`,
                      transition: "background 0.4s ease",
                    }}
                  />
                  <Box sx={{ position: "relative" }}>
                    <AudioWaveSphere3D
                      isSpeaking={circleActive}
                      isResponding={loading}
                      audioLevel={audioLevel}
                      size={orbSize}
                      colorTop={sp.brandLight}
                      colorMid={sp.brandSoft}
                      colorBottom={sp.brand}
                      tone="light"
                    />
                  </Box>
                </Box>

                <Typography
                  sx={{
                    textAlign: "center",
                    fontWeight: 600,
                    color: circleActive ? sp.brand : sp.textMuted,
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                    transition: sp.transition,
                    minHeight: 22,
                  }}
                >
                  {orbStatusLabel}
                </Typography>

                <Stack
                  direction="row"
                  spacing={0.75}
                  justifyContent="center"
                  sx={{ mt: 1 }}
                >
                  <SessionChip
                    icon={<GraduationCap size={11} />}
                    label={`Cấp ${level}`}
                  />
                  <SessionChip
                    icon={mode === "stream" ? <Zap size={11} /> : <Mic size={11} />}
                    label={mode === "stream" ? "Liên tục" : "Nhấn giữ"}
                    tone={mode === "stream" ? "brand" : "neutral"}
                  />
                  <SessionChip
                    icon={<MessageSquare size={11} />}
                    label={`${messages.length}`}
                  />
                </Stack>
              </Box>
            </Box>

            {/* COACH REVIEW */}
            <Box sx={{ ...panelSx(), p: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${sp.hairline}` }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Lightbulb size={13} color={sp.warn} />
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: sp.text, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    Coach ngữ pháp
                  </Typography>
                </Stack>
                {activeCoachEntry?.loading && <CircularProgress size={11} sx={{ color: sp.brand }} thickness={5} />}
              </Stack>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 1.75 }}>
                {activeCoachEntry?.loading ? (
                  <Stack spacing={0.85} sx={{ py: 0.5 }}>
                    <CoachSkeleton />
                    <CoachSkeleton width="82%" />
                    <CoachSkeleton width="44%" />
                  </Stack>
                ) : activeCoachEntry?.review ? (
                  <CoachReviewContent
                    review={activeCoachEntry.review}
                    onViewErrors={() => setSnack("Mở tab Lỗi gặp phải để xem chi tiết")}
                  />
                ) : (
                  <CoachEmpty />
                )}
              </Box>
            </Box>

            {/* RECENT ERRORS PREVIEW */}
            <Box sx={{ ...panelSx(), p: 2, flexShrink: 0, maxHeight: 220, display: "flex", flexDirection: "column" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                <ClipboardList size={14} color={sp.textSoft} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: sp.text, letterSpacing: 0.1 }}>
                  Lỗi gặp phải
                </Typography>
                {totalNotes > 0 && (
                  <Chip
                    size="small"
                    label={totalNotes}
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: sp.brandTint,
                      color: sp.brand,
                      border: "none",
                      "& .MuiChip-label": { px: 0.85 },
                    }}
                  />
                )}
                {masteredNotes > 0 && (
                  <Stack
                    direction="row"
                    spacing={0.4}
                    alignItems="center"
                    sx={{ ml: "auto", color: sp.success }}
                  >
                    <Check size={11} strokeWidth={2.6} />
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, lineHeight: 1 }}>
                      {masteredNotes} đã thuần
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {recentNotes.length === 0 ? (
                  <Stack spacing={0.5} alignItems="center" sx={{ py: 1.5 }}>
                    <Check size={18} color={sp.success} strokeWidth={2.2} />
                    <Typography sx={{ color: sp.success, fontSize: "0.78rem", fontWeight: 600 }}>
                      {totalNotes === 0 && masteredNotes === 0
                        ? "Chưa có lỗi nào."
                        : "Tuyệt vời! Bạn đã luyện xong tất cả lỗi."}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.75}>
                    {recentNotes.map((n) => (
                      <Box
                        key={n._id}
                        sx={{
                          position: "relative",
                          px: 1.1,
                          py: 0.85,
                          pr: 4.5,
                          borderRadius: 1.25,
                          border: `1px solid ${sp.hairline}`,
                          bgcolor: sp.surfaceSunken,
                          cursor: "pointer",
                          transition: sp.transition,
                          "&:hover": {
                            borderColor: sp.brandBorder,
                            bgcolor: sp.brandTint,
                          },
                          "&:hover .master-btn": {
                            opacity: 1,
                          },
                        }}
                        onClick={() => setPracticeNote(n)}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontFamily: '"Noto Sans JP", sans-serif',
                            color: sp.text,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.corrected}
                        </Typography>
                        {n.explanationVi && (
                          <Typography sx={{ fontSize: "0.65rem", color: sp.textSoft, mt: 0.25, lineHeight: 1.4 }}>
                            {n.explanationVi}
                          </Typography>
                        )}
                        <Tooltip title="Đã luyện xong" placement="left" arrow>
                          <IconButton
                            className="master-btn"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              void grammarNotes.setStatus(n._id, "mastered");
                              setSnack("Đã đánh dấu thuần lỗi này");
                            }}
                            sx={{
                              position: "absolute",
                              right: 4,
                              top: "50%",
                              transform: "translateY(-50%)",
                              opacity: 0.35,
                              transition: sp.transition,
                              color: sp.success,
                              p: 0.5,
                              "&:hover": {
                                bgcolor: sp.successSoft,
                                opacity: 1,
                              },
                            }}
                          >
                            <Check size={14} strokeWidth={2.6} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          </Box>
        )}
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

function CoachReviewContent({
  review,
  onViewErrors,
}: {
  review: import("./types").CoachReview;
  onViewErrors?: () => void;
}) {
  const original = review.original.trim();
  const corrected = (review.suggestion ?? "").trim();
  const hasFix = corrected && corrected !== original;
  const severity =
    review.severity === "important"
      ? { color: sp.danger, bg: sp.dangerSoft, label: "Lỗi nặng" }
      : review.severity === "should_fix"
        ? { color: sp.warn, bg: sp.warnSoft, label: "Nên sửa" }
        : { color: sp.success, bg: sp.successSoft, label: "Tốt rồi" };

  if (!hasFix) {
    return (
      <Box sx={{ py: 1.5, textAlign: "center" }}>
        <Sparkles size={20} color={sp.success} style={{ marginBottom: 4 }} />
        <Typography sx={{ color: sp.success, fontWeight: 600, fontSize: "0.82rem" }}>
          Câu này chuẩn rồi
        </Typography>
        <Typography sx={{ color: sp.textSoft, fontSize: "0.7rem", mt: 0.5 }}>
          Mirai không phát hiện lỗi ngữ pháp.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Chip
        size="small"
        label={severity.label}
        sx={{
          alignSelf: "flex-start",
          height: 20,
          fontSize: "0.65rem",
          fontWeight: 600,
          bgcolor: severity.bg,
          color: severity.color,
          border: "none",
        }}
      />
      <Box>
        <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: sp.textSoft, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.25 }}>
          Bạn nói
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: "0.85rem",
            color: sp.textMuted,
            lineHeight: 1.5,
            textDecoration: "line-through",
            textDecorationColor: sp.textFaint,
          }}
        >
          {review.original}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: sp.brand, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.25 }}>
          Nên nói
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: "0.92rem",
            color: sp.text,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {review.suggestion}
        </Typography>
      </Box>
      {review.explanation && (
        <Box>
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: sp.textSoft, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.25 }}>
            Giải thích
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: sp.textMuted, lineHeight: 1.5 }}>
            {review.explanation}
          </Typography>
        </Box>
      )}
      {onViewErrors && (
        <Box
          component="button"
          type="button"
          onClick={onViewErrors}
          sx={{
            mt: 0.5,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            border: "none",
            bgcolor: "transparent",
            color: sp.brand,
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            p: 0,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Mở sổ lỗi <ChevronRight size={12} />
        </Box>
      )}
    </Stack>
  );
}

function SessionChip({
  icon,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "brand";
}) {
  const isBrand = tone === "brand";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.95,
        py: 0.45,
        borderRadius: `${sp.radiusPill}px`,
        bgcolor: isBrand ? sp.brandTint : sp.surfaceMuted,
        color: isBrand ? sp.brand : sp.text,
        border: `1px solid ${isBrand ? sp.brandBorder : sp.hairline}`,
        transition: sp.transition,
      }}
    >
      <Box sx={{ display: "inline-flex", opacity: 0.85 }}>{icon}</Box>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: 0.1, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

function CoachSkeleton({ width = "100%" }: { width?: string | number }) {
  return (
    <Box
      sx={{
        height: 10,
        width,
        borderRadius: 6,
        background: `linear-gradient(90deg, ${sp.surfaceMuted} 0%, ${sp.surfaceSunken} 50%, ${sp.surfaceMuted} 100%)`,
        backgroundSize: "200% 100%",
        animation: "mira-shimmer 1.4s ease-in-out infinite",
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        "@keyframes mira-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      }}
    />
  );
}

function CoachEmpty() {
  const hints = [
    "Nói một câu tiếng Nhật để Mirai gợi ý sửa.",
    "Mỗi lượt Mirai tự động đánh giá cấu trúc câu.",
    "Lỗi quan trọng sẽ được lưu vào sổ để luyện lại.",
  ];
  return (
    <Stack spacing={1.5} sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: sp.textSoft }}>
        <Sparkles size={14} color={sp.brand} />
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: sp.textMuted }}>
          Chưa có gợi ý nào
        </Typography>
      </Stack>
      <Stack spacing={0.85}>
        {hints.map((h) => (
          <Stack key={h} direction="row" spacing={0.85} alignItems="flex-start">
            <Box
              sx={{
                mt: "5px",
                width: 4,
                height: 4,
                borderRadius: "50%",
                bgcolor: sp.brand,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: "0.74rem", color: sp.textSoft, lineHeight: 1.5 }}>
              {h}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

export default SpeakingPracticePage;
