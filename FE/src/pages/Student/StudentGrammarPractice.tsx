import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Paper,
  IconButton,
} from "@mui/material";
import {
  BookOpen,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Languages,
} from "lucide-react";
import { grammarService, type IGrammarCard } from "../../services/grammar.service";

const LEVEL_COLORS: Record<string, string> = {
  N1: "#7B1FA2",
  N2: "#1565C0",
  N3: "#2E7D32",
  N4: "#F57F17",
  N5: "#B90000",
};

const StudentGrammarPractice: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeLevels, setActiveLevels] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<IGrammarCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<IGrammarCard[]>([]);
  const [selectedLevelTab, setSelectedLevelTab] = useState(0);

  // Flashcard states
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [learnedCards, setLearnedCards] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("mirai_learned_grammar");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await grammarService.getStudentPracticeCards();
        if (res.success) {
          setActiveLevels(res.levels);
          setAllCards(res.cards);
        }
      } catch (err) {
        console.error("Lỗi tải bài học ngữ pháp của học sinh:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter cards when level tab changes
  useEffect(() => {
    if (activeLevels.length > 0) {
      const activeLvl = activeLevels[selectedLevelTab];
      const filtered = allCards.filter((card) => card.level === activeLvl);
      setFilteredCards(filtered);
    } else {
      setFilteredCards([]);
    }
  }, [selectedLevelTab, activeLevels, allCards]);

  const handleFlipCard = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleToggleLearned = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation(); // Ngăn flip thẻ khi nhấn nút
    const updated = {
      ...learnedCards,
      [cardId]: !learnedCards[cardId],
    };
    setLearnedCards(updated);
    localStorage.setItem("mirai_learned_grammar", JSON.stringify(updated));
  };

  const countLearnedInCurrentLevel = () => {
    if (filteredCards.length === 0) return 0;
    return filteredCards.filter(c => learnedCards[c._id]).length;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "85vh", bgcolor: "#fcfcfc" }}>
      {/* Header section */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: "14px",
            bgcolor: "#B9000015",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={24} color="#B90000" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#1a1a1a">
            Luyện tập Ngữ pháp
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Danh sách cấu trúc ngữ pháp được biên soạn riêng theo trình độ khóa học bạn tham gia.
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
          <CircularProgress sx={{ color: "#B90000" }} />
        </Box>
      ) : activeLevels.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid #f0f0f0", borderRadius: "16px" }}>
          <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
            Chưa đăng ký khóa học nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vui lòng đăng ký tham gia các khóa học JLPT tại MIRAI để mở khóa lộ trình học ngữ pháp tương ứng.
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Level Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={selectedLevelTab}
              onChange={(_, v) => setSelectedLevelTab(v)}
              textColor="inherit"
              sx={{
                "& .MuiTabs-indicator": { bgcolor: LEVEL_COLORS[activeLevels[selectedLevelTab]] || "#B90000" },
              }}
            >
              {activeLevels.map((lvl) => (
                <Tab
                  key={lvl}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={lvl}
                        size="small"
                        sx={{
                          bgcolor: LEVEL_COLORS[lvl] + "20",
                          color: LEVEL_COLORS[lvl],
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      />
                      <Typography fontWeight={700} fontSize={14}>
                        Lớp {lvl}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {/* Level Progress Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 4,
              borderRadius: "12px",
              border: "1px solid #eef0f2",
              bgcolor: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Tiến độ học tập cấp độ {activeLevels[selectedLevelTab]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã thuộc {countLearnedInCurrentLevel()} / {filteredCards.length} cấu trúc ngữ pháp
              </Typography>
            </Box>
            {filteredCards.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontWeight={800} color="#2e7d32">
                  {Math.round((countLearnedInCurrentLevel() / filteredCards.length) * 100)}% Hoàn thành
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed #ccc", borderRadius: "12px" }}>
              <Typography color="text.secondary">
                Trung tâm chưa cập nhật thẻ ngữ pháp cho trình độ {activeLevels[selectedLevelTab]}.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredCards.map((card) => {
                const isFlipped = !!flippedCards[card._id];
                const isLearned = !!learnedCards[card._id];

                return (
                  <Grid item xs={12} sm={6} md={4} key={card._id}>
                    {/* Modern Glassmorphic Card Container with flip effect */}
                    <Box
                      onClick={() => handleFlipCard(card._id)}
                      sx={{
                        perspective: "1000px",
                        cursor: "pointer",
                        height: 280,
                        position: "relative",
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          position: "relative",
                          transition: "transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          transformStyle: "preserve-3d",
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        {/* ─── CARD FRONT ────────────────────────────────────── */}
                        <Card
                          elevation={0}
                          sx={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            backfaceVisibility: "hidden",
                            border: `1px solid ${isLearned ? "#2e7d32" : "#eef0f2"}`,
                            borderRadius: "16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                            background: isLearned
                              ? "linear-gradient(135deg, #fff 70%, #f1faf2 100%)"
                              : "linear-gradient(135deg, #fff 80%, #fafafa 100%)",
                          }}
                        >
                          <CardContent sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                              <Chip
                                label={card.level}
                                size="small"
                                sx={{
                                  bgcolor: LEVEL_COLORS[card.level] + "15",
                                  color: LEVEL_COLORS[card.level],
                                  fontWeight: 800,
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleToggleLearned(e, card._id)}
                                sx={{
                                  color: isLearned ? "#2e7d32" : "#ccc",
                                  "&:hover": { color: "#2e7d32" },
                                }}
                              >
                                {isLearned ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                              </IconButton>
                            </Box>

                            <Box sx={{ my: "auto", textAlign: "center" }}>
                              <Typography variant="h5" fontWeight={800} color="#111" gutterBottom sx={{ letterSpacing: "-0.5px" }}>
                                {card.title}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#666", bgcolor: "#f5f5f5", py: 0.5, px: 1.5, borderRadius: "6px", display: "inline-block", mt: 1 }}>
                                {card.structure}
                              </Typography>
                            </Box>

                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                              <Typography variant="body2" fontWeight={700} color="#B90000">
                                {card.meaningVi}
                              </Typography>
                              <Button
                                size="small"
                                endIcon={<ArrowRight size={14} />}
                                sx={{ color: "#888", textTransform: "none", fontSize: 12 }}
                              >
                                Xem chi tiết
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>

                        {/* ─── CARD BACK ─────────────────────────────────────── */}
                        <Card
                          elevation={0}
                          sx={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                            border: "1px solid #eef0f2",
                            borderRadius: "16px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                            display: "flex",
                            flexDirection: "column",
                            bgcolor: "#fafafa",
                          }}
                        >
                          <CardContent sx={{ p: 3, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Languages size={16} color="#B90000" />
                              <Typography variant="subtitle2" fontWeight={800} color="#B90000">
                                Giải thích Ngữ pháp:
                              </Typography>
                            </Box>
                            <Typography fontSize={13} color="#333" sx={{ lineHeight: 1.5, bgcolor: "#fff", p: 1.5, borderRadius: "8px", border: "1px solid #f0f0f0" }}>
                              {card.explanation}
                            </Typography>

                            {card.examples && card.examples.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#333" sx={{ mb: 1, fontSize: 12 }}>
                                  Ví dụ mẫu:
                                </Typography>
                                <Box sx={{ pl: 1.5, borderLeft: "2px solid #B90000" }}>
                                  <Typography fontSize={13} fontWeight={700} color="#111">
                                    {card.examples[0].japanese}
                                  </Typography>
                                  <Typography fontSize={11} color="text.secondary">
                                    {card.examples[0].furigana}
                                  </Typography>
                                  <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.5 }}>
                                    {card.examples[0].vietnamese}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            <Typography variant="caption" align="center" color="text.secondary" sx={{ mt: "auto", pt: 1, fontSize: 10 }}>
                              Nhấp để quay lại mặt trước
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StudentGrammarPractice;
