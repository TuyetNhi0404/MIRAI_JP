import React, { useState } from "react";
import { Box, IconButton } from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

interface Course {
  _id: string;
  name: string;
  description?: string;
  managerName?: string;
  image?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
  enrolledCount?: number;
}

interface CoursesSectionProps {
  courses: Course[];
  isMobile: boolean;
  isTablet: boolean;
  onOpenForm: (course: Course | null) => void;
}

const CoursesSection: React.FC<CoursesSectionProps> = ({
  courses,
  isMobile,
  isTablet,
  onOpenForm,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Default professional courses if database courses are empty
  const defaultCourses: Course[] = [
    {
      _id: "c1",
      name: "Khóa học N5 - Nền tảng Nhật ngữ",
      description: "Học chữ cái Hiragana, Katakana, Kanji cơ bản & các mẫu câu giao tiếp đời sống hàng ngày.",
      capacity: 25,
      enrolledCount: 18,
    },
    {
      _id: "c2",
      name: "Khóa học N4 - Sơ cấp nâng cao",
      description: "Củng cố phản xạ nghe nói trôi chảy các chủ đề cơ bản, đọc hiểu đoạn văn ngắn và hội thoại thường nhật.",
      capacity: 25,
      enrolledCount: 22,
    },
    {
      _id: "c3",
      name: "Khóa học N3 - Luyện thi JLPT",
      description: "Xây dựng tư duy ngữ pháp chuyên sâu, giải đề thi thử JLPT N3 và nâng cao kỹ năng nghe tin tức Nhật.",
      capacity: 20,
      enrolledCount: 19,
    },
    {
      _id: "c4",
      name: "Khóa học Tiếng Nhật Thương mại",
      description: "Tiếng Nhật chuyên sâu công sở, kỹ năng viết email, giao tiếp chuẩn mực kính ngữ Keigo với đối tác.",
      capacity: 15,
      enrolledCount: 10,
    },
    {
      _id: "c5",
      name: "Khóa học Kaiwa Giao tiếp",
      description: "Luyện phát âm chuẩn Tokyo, thảo luận chủ đề tự do hoàn toàn với giáo viên bản xứ.",
      capacity: 12,
      enrolledCount: 8,
    },
  ];

  const activeCourses = courses.length > 0 ? courses : defaultCourses;

  const nextCourses = () => {
    if (activeCourses.length <= (isMobile ? 1 : isTablet ? 2 : 4)) return;
    setCurrentIndex((prev) => (prev + 1) % activeCourses.length);
  };

  const prevCourses = () => {
    if (activeCourses.length <= (isMobile ? 1 : isTablet ? 2 : 4)) return;
    setCurrentIndex((prev) => (prev - 1 + activeCourses.length) % activeCourses.length);
  };

  const coursesPerView = isMobile ? 1 : isTablet ? 2 : 4;
  const displayedCourses =
    activeCourses.length <= coursesPerView
      ? activeCourses
      : Array.from({ length: coursesPerView }, (_, i) => {
          return activeCourses[(currentIndex + i) % activeCourses.length];
        });

  return (
    <section id="courses" className="relative bg-[#FFFDF9] pb-8 md:pb-24 border-t border-[#F0E8DD] overflow-hidden">
      {/* Decorative vertical Kanji number for section */}
      <div className="absolute left-6 top-10 text-xs font-serif font-bold tracking-widest text-[#B90000]/40 writing-mode-vertical">
        第六章 // 授業
      </div>

      <div className="relative w-full bg-[#FFFDF9] text-center px-5 py-16 text-[#1A1A1A] mb-16 z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90000] block" />
          <span className="text-[11px] font-extrabold text-[#B90000] uppercase tracking-widest">Chương trình đào tạo</span>
        </div>
        <h2 className="text-3xl md:text-5xl mb-4 font-bold font-serif text-[#1A1A1A]">
          Khóa đào tạo chuyên sâu
        </h2>
        <p className="text-sm md:text-base text-[#666] tracking-wider font-semibold max-w-xl mx-auto">
          Các khóa học chuẩn đầu ra JLPT thiết lập bài bản trên hệ thống quản lý học tập MIRAI LMS.
        </p>
      </div>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={isMobile ? 1 : 2}
        mb={1.5}
        px={isMobile ? 1 : 0}
        sx={{ relative: true, zIndex: 10 }}
      >
        {!isMobile && (
          <IconButton
            onClick={prevCourses}
            sx={{
              color: "white",
              backgroundColor: "rgba(185, 0, 0, 0.85)",
              "&:hover": { backgroundColor: "rgba(185, 0, 0, 0.95)" },
              transform: isTablet ? "translateX(20px)" : "translateX(50px)",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(185,0,0,0.15)",
            }}
          >
            <ArrowBackIos className="!ml-2" />
          </IconButton>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
                ? "repeat(2, 1fr)"
                : "repeat(4, 1fr)",
            gap: isMobile ? "20px" : "30px",
            maxWidth: "1400px",
            margin: "0 auto",
            flex: "1",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {displayedCourses.map((course, index) => {
            // Safe image index modulo 4
            const imageSrc = `/img/course${(index % 4) + 1}.png`;

            // Detect JLPT level for badge
            let levelBadge = "";
            if (course.name.toLowerCase().includes("n5")) levelBadge = "N5";
            else if (course.name.toLowerCase().includes("n4")) levelBadge = "N4";
            else if (course.name.toLowerCase().includes("n3")) levelBadge = "N3";
            else if (course.name.toLowerCase().includes("n2")) levelBadge = "N2";
            else if (course.name.toLowerCase().includes("n1")) levelBadge = "N1";
            else levelBadge = "日"; // Default Japanese character (Nichi)

            return (
              <Box
                key={course._id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  textAlign: "center",
                  backgroundColor: "white",
                  borderRadius: "24px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(31,34,56,0.015)",
                  border: "1px solid #F0E8DD",
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  cursor: "pointer",
                  height: "100%",
                  position: "relative",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0 15px 40px rgba(185,0,0,0.06)",
                    borderColor: "rgba(185,0,0,0.2)",
                  },
                }}
              >
                {/* Hanko Stamp level badge */}
                {levelBadge && (
                  <div className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full border border-[#B90000] bg-white/95 text-[#B90000] font-serif font-black flex items-center justify-center text-xs shadow-sm select-none rotate-[-8deg]">
                    {levelBadge}
                  </div>
                )}

                <img
                  src={imageSrc}
                  alt={course.name}
                  width={320}
                  height={200}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: isMobile ? "180px" : "200px",
                    objectFit: "cover",
                    borderBottom: "1px solid #F0E8DD",
                  }}
                />

                <Box
                  sx={{
                    padding: isMobile ? "20px" : "24px",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        marginBottom: "10px",
                        fontWeight: "bold",
                        color: "#1A1A1A",
                        fontFamily: "var(--font-serif)",
                      }}
                    >
                      {course.name}
                    </h3>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        lineHeight: "1.65",
                        marginBottom: "20px",
                      }}
                    >
                      {course.description ? course.description : "No description available."}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-400 border-t border-slate-100 pt-4">
                    <span>Sĩ số: {course.capacity || 25} học viên</span>
                    <span>Lớp: Online/Offline</span>
                  </div>
                </Box>

                <Box sx={{ padding: isMobile ? "0px 20px 20px" : "0px 24px 24px" }}>
                  <button
                    className="japan-btn-primary w-full"
                    onClick={() => onOpenForm(course)}
                  >
                    Đăng ký tư vấn lộ trình
                  </button>
                </Box>
              </Box>
            );
          })}
        </Box>

        {!isMobile && (
          <IconButton
            onClick={nextCourses}
            sx={{
              color: "white",
              backgroundColor: "rgba(185, 0, 0, 0.85)",
              "&:hover": { backgroundColor: "rgba(185, 0, 0, 0.95)" },
              transform: isTablet ? "translateX(-20px)" : "translateX(-50px)",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(185,0,0,0.15)",
            }}
          >
            <ArrowForwardIos />
          </IconButton>
        )}
      </Box>

      {/* Mobile Navigation Dots */}
      {isMobile && activeCourses.length > 1 && (
        <Box display="flex" justifyContent="center" gap={1} mt={3}>
          {Array.from({ length: activeCourses.length }).map((_, idx) => (
            <Box
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: currentIndex === idx ? "#B90000" : "rgba(185,0,0,0.15)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Box>
      )}
    </section>
  );
};

export default React.memo(CoursesSection);
