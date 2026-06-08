import {
  Facebook,
  Instagram,
  Pin,
  Mail,
  BookOpen,
  School,
  Users as Groups,
} from "lucide-react";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import GoogleLogin from "../components/GoogleLogin";
import RegisterForm from "../components/enrollment/RegisterForm";
import { Modal, Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import { getApiBaseUrl } from "../utils/apiBase";

const MiraiJpCenter: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [showFullAbout, setShowFullAbout] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formStep, setFormStep] = useState<"manual" | "review">("manual");

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/courses/available`);
        const data = await res.json();
        if (data?.data) setCourses(data.data);
      } catch (err: unknown) {
        console.error(
          "Lỗi tải danh sách khóa học:",
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    };
    fetchCourses();
  }, []);

  const handleOpenForm = (course: Course | null) => {
    setSelectedCourse(course);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedCourse(null);
  };

  const nextCourses = () => {
    if (courses.length <= (isMobile ? 1 : isTablet ? 2 : 4)) return;
    setCurrentIndex((prev) => (prev + 1) % courses.length);
  };

  const prevCourses = () => {
    if (courses.length <= (isMobile ? 1 : isTablet ? 2 : 4)) return;
    setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length);
  };

  const coursesPerView = isMobile ? 1 : isTablet ? 2 : 4;
  const displayedCourses =
    courses.length <= coursesPerView
      ? courses
      : Array.from({ length: coursesPerView }, (_, i) => {
        return courses[(currentIndex + i) % courses.length];
      });

  const galleryImages = [
    "/img/im1.png",
    "/img/im2.png",
    "/img/im3.png",
    "/img/im4.png",
    "/img/im5.png",
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&family=Inter:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .seigaiha {
          background-color: #ffffff;
          background-image: radial-gradient(circle at 100% 150%, #B9000008 24%, white 25%),
            radial-gradient(circle at 0% 150%, #B9000008 24%, white 25%),
            radial-gradient(circle at 50% 100%, #B9000008 24%, white 25%),
            radial-gradient(circle at 100% 50%, #B9000008 24%, white 25%),
            radial-gradient(circle at 0% 50%, #B9000008 24%, white 25%),
            radial-gradient(circle at 50% 0%, #B9000008 24%, white 25%);
          background-size: 100px 50px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-text {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: "white",
          padding: isMobile ? "10px 20px" : "20px 80px",
          boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? "18px" : "24px",
              fontWeight: "900",
              color: "#B90000",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            MIRAI JAPANESE
          </h1>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
            <a
              href="#courses"
              style={{
                color: "#1A1A1A",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              KHÓA HỌC
            </a>
            <a
              href="#about"
              style={{
                color: "#1A1A1A",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              VỀ CHÚNG TÔI
            </a>
            <a
              href="#gallery"
              style={{
                color: "#1A1A1A",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              CỘNG ĐỒNG
            </a>
            <a
              href="#contact"
              style={{
                color: "#1A1A1A",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              TÀI NGUYÊN
            </a>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {!isMobile && <GoogleLogin />}
          <button
            onClick={() => handleOpenForm(null)}
            style={{
              backgroundColor: "#B90000",
              color: "white",
              border: "none",
              padding: isMobile ? "8px 15px" : "12px 25px",
              borderRadius: "30px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(185, 0, 0, 0.3)",
            }}
          >
            Tham gia ngay
          </button>
        </div>
      </nav>

      {!isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "white",
            padding: "20px 10px",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          }}
        >
          <a href="#" style={{ color: "#B90000", textDecoration: "none" }}>
            <Pin size={20} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61560247499806"
            style={{ color: "#B90000", textDecoration: "none" }}
          >
            <Facebook size={20} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61560247499806"
            style={{ color: "#B90000", textDecoration: "none" }}
          >
            <Instagram size={20} />
          </a>
        </div>
      )}

      {/* Hero Section */}
      <section
        id="home"
        className="seigaiha"
        style={{
          marginTop: "80px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          minHeight: "85vh",
          position: "relative",
          overflow: "hidden",
          alignItems: "center",
          padding: isMobile ? "40px 20px" : "0 80px",
        }}
      >
        <div
          style={{
            flex: isMobile ? "1" : "0 0 50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "#1A1A1A",
            zIndex: 2,
          }}
        >
          <div
            style={{
              border: "1px solid #B90000",
              color: "#B90000",
              padding: "5px 15px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "bold",
              width: "fit-content",
              marginBottom: "20px",
            }}
          >
            ● Khám phá tiềm năng của bạn
          </div>
          <h1
            style={{
              fontSize: isMobile ? "40px" : "72px",
              fontWeight: "900",
              lineHeight: "1.1",
              marginBottom: "25px",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Chinh Phục Tiếng Nhật <br /> Cùng{" "}
            <span style={{ color: "#B90000", fontStyle: "italic" }}>MIRAI</span>
          </h1>
          <p
            style={{
              fontSize: isMobile ? "16px" : "18px",
              marginBottom: "40px",
              lineHeight: "1.8",
              color: "#666",
              maxWidth: "500px",
            }}
          >
            Lộ trình học tập cá nhân hóa từ N5 đến N1, giúp bạn tự tin giao tiếp
            và du học. Khám phá kho tài liệu khổng lồ cùng phương pháp học hiện
            đại.
          </p>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <button
              onClick={() => handleOpenForm(null)}
              style={{
                backgroundColor: "#B90000",
                color: "white",
                border: "none",
                padding: "15px 35px",
                borderRadius: "5px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(185, 0, 0, 0.2)",
              }}
            >
              Bắt đầu hành trình
            </button>
            <a
              href="#about"
              style={{
                color: "#1A1A1A",
                textDecoration: "none",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              Tìm hiểu lộ trình <ArrowForwardIos style={{ fontSize: "14px" }} />
            </a>
          </div>
        </div>
        <div
          style={{
            flex: isMobile ? "1" : "0 0 50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            marginTop: isMobile ? "40px" : "0",
          }}
        >
          <img
            src="/img/mirai.png"
            alt="MIRAI Hero"
            style={{
              width: "100%",
              maxWidth: "600px",
              height: "auto",
              borderRadius: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              right: isMobile ? "0" : "-20px",
              backgroundColor: "white",
              padding: "15px 25px",
              borderRadius: "15px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#FFD700",
                fontSize: "20px",
                marginBottom: "5px",
              }}
            >
              ★★★★★
            </div>
            <div style={{ fontWeight: "bold", fontSize: "18px" }}>
              5,000+ Học viên
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Đã tin tưởng MIRAI
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section
        className="seigaiha"
        style={{
          padding: isMobile ? "60px 20px" : "100px 80px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? "32px" : "48px",
            fontWeight: "900",
            marginBottom: "60px",
            fontFamily: "'Playfair Display', serif",
            position: "relative",
            display: "inline-block",
          }}
        >
          Tại sao chọn MIRAI Japanese?
          <div
            style={{
              position: "absolute",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "60px",
              height: "3px",
              backgroundColor: "#B90000",
            }}
          ></div>
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "30px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {[
            {
              title: "Lộ trình bài bản",
              desc: "Giáo trình chuẩn Nhật Bản tối ưu hóa cho người Việt, cam kết đầu ra theo chuẩn JLPT.",
              icon: <BookOpen size={32} color="white" />,
              color: "#B90000",
            },
            {
              title: "Giảng viên bản ngữ",
              desc: "Đội ngũ Sensei tâm huyết, giàu kinh nghiệm sư phạm và am hiểu văn hóa sâu sắc.",
              icon: <School size={32} color="white" />,
              color: "#4A5568",
            },
            {
              title: "Cộng đồng học tập",
              desc: "Kết nối, trao đổi kiến thức và thực hành giao tiếp cùng hàng ngàn học viên mỗi ngày.",
              icon: <Groups size={32} color="white" />,
              color: "#EDF2F7",
              iconBg: "#FBD38D",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: "40px",
                backgroundColor: "white",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                textAlign: "left",
                transition: "transform 0.3s ease",
                cursor: "pointer",
                border: "1px solid #F0F0F0",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: item.color,
                  borderRadius: "15px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: "25px",
                  boxShadow: `0 10px 20px ${item.color}33`,
                }}
              >
                {item.icon}
              </div>
              <h3
                style={{
                  fontWeight: "bold",
                  fontSize: "20px",
                  marginBottom: "15px",
                }}
              >
                {item.title}
              </h3>
              <p style={{ color: "#666", lineHeight: "1.6", margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        style={{
          padding: isMobile ? "60px 20px" : "100px 80px",
          backgroundColor: "#F9F9F9",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            gap: isMobile ? "40px" : "80px",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              flex: isMobile ? "1" : "0 0 45%",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <img
              src="./img/cp.png"
              alt="About"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: isMobile ? "32px" : "48px",
                color: "#1A1A1A",
                marginBottom: "30px",
                fontWeight: "900",
                fontFamily: "'Playfair Display', serif",
                lineHeight: "1.2",
              }}
            >
              Về MIRAI JAPANESE
            </h2>
            <p
              style={{
                fontSize: isMobile ? "14px" : "16px",
                lineHeight: "1.8",
                color: "#666",
                marginBottom: "40px",
              }}
            >
              Hệ thống quản lý trung tâm dạy tiếng Nhật Mirai là một website hỗ
              trợ toàn diện cho hoạt động quản lý và giảng dạy tại trung tâm
              Nhật ngữ. Với giao diện hiện đại và thân thiện, Mirai giúp kết nối
              giữa quản trị viên, giảng viên và học viên trên cùng một nền tảng,
              từ đó tối ưu hóa quy trình vận hành và nâng cao chất lượng đào
              tạo. Hệ thống hỗ trợ quản lý khóa học, lớp học, lịch học, điểm
              danh, kết quả học tập cũng như theo dõi tiến độ của từng học viên
              một cách hiệu quả.
              {showFullAbout && (
                <span>
                  {" "}
                  Hệ thống cung cấp công cụ mạnh mẽ để quản lý lớp học, sắp xếp
                  lịch học, điểm danh tự động và theo dõi kết quả học tập của
                  từng học viên. Với Mirai, trung tâm có thể dễ dàng quản lý
                  thông tin học viên, giao bài tập, tổ chức kỳ thi và đưa ra
                  đánh giá chính xác. Các tính năng này giúp giảm tải công việc
                  hành chính, tiết kiệm thời gian và nâng cao hiệu quả giảng
                  dạy. Ngoài ra, hệ thống còn hỗ trợ báo cáo, thống kê và phân
                  tích dữ liệu để giúp quản trị viên đưa ra quyết định chiến
                  lược, tối ưu hóa hoạt động và phát triển trung tâm một cách
                  bền vững.
                </span>
              )}
            </p>
            <button
              onClick={() => setShowFullAbout(!showFullAbout)}
              style={{
                backgroundColor: "#B90000",
                color: "white",
                border: "none",
                padding: isMobile ? "12px 30px" : "15px 40px",
                fontSize: isMobile ? "12px" : "14px",
                cursor: "pointer",
                letterSpacing: "2px",
                transition: "all 0.3s ease",
                borderRadius: "5px",
              }}
            >
              {showFullAbout ? "Ẩn bớt" : "Đọc thêm"}
            </button>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section
        id="courses"
        style={{
          position: "relative",
          backgroundColor: "#FFFFFF",
          paddingBottom: isMobile ? "30px" : "80px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            backgroundColor: "#F9F9F9",
            textAlign: "center",
            padding: isMobile ? "40px 20px" : "60px 20px",
            color: "#1A1A1A",
            marginBottom: isMobile ? "40px" : "60px",
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? "32px" : "48px",
              marginBottom: "15px",
              fontWeight: "900",
              fontFamily: "'Playfair Display', serif",
              color: "#1A1A1A",
            }}
          >
            Khóa học của chúng tôi
          </h2>
          <div
            style={{
              width: "60px",
              height: "3px",
              backgroundColor: "#B90000",
              margin: "0 auto 15px",
            }}
          ></div>
          <p
            style={{
              fontSize: isMobile ? "14px" : "16px",
              color: "#666",
              letterSpacing: "1px",
              fontWeight: "500",
            }}
          >
            Bắt đầu hành trình trở thành chuyên gia ngay hôm nay
          </p>
        </div>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={isMobile ? 1 : 2}
          mb={1.5}
          px={isMobile ? 1 : 0}
        >
          {!isMobile && (
            <IconButton
              onClick={prevCourses}
              sx={{
                color: "white",
                transform: isTablet ? "translateX(20px)" : "translateX(50px)",
              }}
            >
              <ArrowBackIos />
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
              const imageSrc = `/img/course${(index % 5) + 1}.png`;

              return (
                <Box
                  key={course._id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "center",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "pointer",
                    height: "100%",
                    "&:hover": {
                      transform: "translateY(-10px)",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                    },
                  }}
                >
                  <img
                    src={imageSrc}
                    alt={course.name}
                    style={{
                      width: "100%",
                      height: isMobile ? "200px" : "250px",
                      objectFit: "cover",
                    }}
                  />

                  <Box
                    sx={{
                      padding: isMobile ? "20px" : "25px",
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textAlign: "left",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: isMobile ? "18px" : "20px",
                        marginBottom: "10px",
                        fontWeight: "bold",
                        color: "#1A1A1A",
                        minHeight: isMobile ? "auto" : "48px",
                      }}
                    >
                      {course.name}
                    </h3>
                    <p
                      style={{
                        fontSize: isMobile ? "13px" : "14px",
                        color: "#444",
                        fontFamily:
                          "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                        marginBottom: "0px",
                        lineHeight: "1.65",
                        flexGrow: 1,
                      }}
                    >
                      {course.description
                        ? course.description
                        : "No description available."}
                    </p>
                  </Box>

                  <Box
                    sx={{
                      padding: isMobile ? "0px 20px 20px" : "0px 25px 25px",
                    }}
                  >
                    <button
                      style={{
                        backgroundColor: "#B90000",
                        color: "white",
                        border: "none",
                        padding: isMobile ? "10px 25px" : "12px 30px",
                        fontSize: isMobile ? "14px" : "14px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        letterSpacing: "1px",
                        borderRadius: "5px",
                        transition: "background-color 0.3s ease",
                        width: "100%",
                      }}
                      onClick={() => handleOpenForm(course)}
                    >
                      Đăng ký ngay
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
                transform: isTablet ? "translateX(-20px)" : "translateX(-50px)",
              }}
            >
              <ArrowForwardIos />
            </IconButton>
          )}
        </Box>

        {/* Mobile Navigation Dots */}
        {isMobile && courses.length > 1 && (
          <Box display="flex" justifyContent="center" gap={1} mt={3}>
            {Array.from({ length: courses.length }).map((_, idx) => (
              <Box
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor:
                    currentIndex === idx ? "white" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </Box>
        )}
      </section>

      {/* Students Work Gallery */}
      <section
        id="gallery"
        style={{
          padding: isMobile ? "60px 20px" : "100px 80px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? "32px" : "48px",
            textAlign: "center",
            marginBottom: "60px",
            fontWeight: "900",
            fontFamily: "'Playfair Display', serif",
            color: "#1A1A1A",
          }}
        >
          Góc học viên
        </h2>
        <div
          style={{
            maxWidth: isMobile ? "100%" : "1100px",
            margin: "0 auto",
            border: "10px solid #B90000",
            padding: "0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gridTemplateRows: isMobile
                ? "repeat(5, 200px)"
                : "repeat(2, 250px)",
              gap: "0",
            }}
          >
            <div
              style={{
                gridColumn: isMobile ? "1" : "1",
                gridRow: isMobile ? "1" : "1",
                background: `#B90000 url(${galleryImages[0]}) center/cover no-repeat`,
              }}
            ></div>

            <div
              style={{
                gridColumn: isMobile ? "1" : "2 / 4",
                gridRow: isMobile ? "2" : "1",
                background: `#B90000 url(${galleryImages[1]}) center/cover no-repeat`,
              }}
            ></div>

            <div
              style={{
                gridColumn: isMobile ? "1" : "1",
                gridRow: isMobile ? "3" : "2",
                background: `#B90000 url(${galleryImages[2]}) center/cover no-repeat`,
              }}
            ></div>

            <div
              style={{
                gridColumn: isMobile ? "1" : "2",
                gridRow: isMobile ? "4" : "2",
                background: `linear-gradient(rgba(185,0,0,0.2), rgba(185,0,0,0.2)), url(${galleryImages[3]}) center/cover no-repeat`,
              }}
            ></div>

            <div
              style={{
                gridColumn: isMobile ? "1" : "3",
                gridRow: isMobile ? "5" : "2",
                background: `linear-gradient(rgba(185,0,0,0.3), rgba(185,0,0,0.3)), url(${galleryImages[4]}) center/cover no-repeat`,
              }}
            ></div>
          </div>
          <div
            style={{
              backgroundColor: "#B90000",
              color: "white",
              textAlign: "center",
              padding: isMobile ? "15px" : "20px",
              fontSize: isMobile ? "14px" : "16px",
              letterSpacing: isMobile ? "1px" : "2px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Học tập vì một tương lai tươi sáng
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer
        style={{
          backgroundColor: "#1A1A1A",
          color: "white",
          padding: isMobile ? "60px 20px" : "80px 80px 40px",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1.5fr",
            gap: "40px",
            maxWidth: "1200px",
            margin: "0 auto",
            marginBottom: "60px",
          }}
        >
          {/* Logo & Desc */}
          <div>
            <h2
              style={{
                color: "#B90000",
                fontWeight: "900",
                marginBottom: "20px",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              MIRAI JAPANESE
            </h2>
            <p
              style={{ color: "#AAA", lineHeight: "1.8", marginBottom: "30px" }}
            >
              Kiến tạo tương lai cùng ngôn ngữ và văn hóa Nhật Bản. Trải nghiệm
              học tập đẳng cấp, hiệu quả và hiện đại nhất.
            </p>
            <div style={{ display: "flex", gap: "15px" }}>
              <Facebook size={20} style={{ cursor: "pointer" }} />
              <Instagram size={20} style={{ cursor: "pointer" }} />
              <Mail size={20} style={{ cursor: "pointer" }} />
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 style={{ fontWeight: "bold", marginBottom: "25px" }}>
              Khóa học
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                color: "#AAA",
                lineHeight: "2.5",
              }}
            >
              <li>Tiếng Nhật Sơ cấp (N5-N4)</li>
              <li>Tiếng Nhật Trung cấp (N3)</li>
              <li>Luyện thi JLPT N2-N1</li>
              <li>Giao tiếp công sở</li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 style={{ fontWeight: "bold", marginBottom: "25px" }}>Hỗ trợ</h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                color: "#AAA",
                lineHeight: "2.5",
              }}
            >
              <li>Trung tâm trợ giúp</li>
              <li>Chính sách bảo mật</li>
              <li>Điều khoản dịch vụ</li>
              <li>Liên hệ</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 style={{ fontWeight: "bold", marginBottom: "25px" }}>
              Bản tin
            </h4>
            <p style={{ color: "#AAA", marginBottom: "20px" }}>
              Nhận thông tin về các lớp học và sự kiện mới nhất.
            </p>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Email của bạn"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  backgroundColor: "#2D2D2D",
                  border: "none",
                  borderRadius: "5px",
                  color: "white",
                }}
              />
              <button
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "5px",
                  backgroundColor: "#B90000",
                  color: "white",
                  border: "none",
                  padding: "7px 15px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #333",
            paddingTop: "30px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            color: "#666",
          }}
        >
          <div>MIRAI Japanese Academy.</div>
          <div style={{ display: "flex", gap: "20px" }}>
            <span>Bạn đã có tài khoản?</span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault(); /* handle login */
              }}
              style={{
                color: "#B90000",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Đăng nhập ngay
            </a>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <Modal open={openForm} onClose={handleCloseForm} disableScrollLock>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? "95%" : "90%",
            maxWidth:
              formStep === "review"
                ? isMobile
                  ? "95%"
                  : 1400
                : isMobile
                  ? "95%"
                  : 500,
            maxHeight: "100vh",
            bgcolor: "background.paper",
            borderRadius: "16px",
            boxShadow: 24,
            overflow: { xs: "auto", md: "hidden" },
          }}
        >
          <RegisterForm
            selectedCourse={selectedCourse}
            courses={courses}
            onClose={handleCloseForm}
          />
        </Box>
      </Modal>
    </div>
  );
};

export default MiraiJpCenter;
