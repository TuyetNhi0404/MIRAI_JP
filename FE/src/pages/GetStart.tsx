import React, { useState, useEffect, lazy, Suspense } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import RegisterForm from "../components/enrollment/RegisterForm";
import { Modal, Box, useMediaQuery, useTheme } from "@mui/material";
import { getApiBaseUrl } from "../utils/apiBase";
import { Pin, Facebook, Instagram } from "lucide-react";

// Critical above-the-fold components loaded statically for instant paint
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";

// Below-the-fold components lazy loaded to optimize initial bundle size
const AboutSection = lazy(() => import("../components/landing/AboutSection"));
const WhoUsesSection = lazy(() => import("../components/landing/WhoUsesSection"));
const EcosystemSection = lazy(() => import("../components/landing/EcosystemSection"));
const FeaturesSection = lazy(() => import("../components/landing/FeaturesSection"));
const RoadmapSection = lazy(() => import("../components/landing/RoadmapSection"));
const CoursesSection = lazy(() => import("../components/landing/CoursesSection"));
const AnalyticsSection = lazy(() => import("../components/landing/AnalyticsSection"));
const TestimonialsSection = lazy(() => import("../components/landing/TestimonialsSection"));
const ContactSection = lazy(() => import("../components/landing/ContactSection"));
const LandingFooter = lazy(() => import("../components/landing/LandingFooter"));

const SectionSkeleton = () => (
  <div className="w-full py-16 px-5 bg-slate-50/50 animate-pulse flex flex-col gap-6 items-center justify-center">
    <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
    <div className="h-3 w-72 bg-slate-200 rounded-md"></div>
    <div className="w-full max-w-5xl mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-40 bg-slate-200 rounded-xl"></div>
      <div className="h-40 bg-slate-200 rounded-xl"></div>
      <div className="h-40 bg-slate-200 rounded-xl"></div>
    </div>
  </div>
);

const MiraiJpCenter: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [openForm, setOpenForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [formStep, setFormStep] = useState<"manual" | "review">("manual");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div style={{ fontFamily: "var(--font-sans), sans-serif" }} className="bg-[#FFFDF9] text-slate-800 scroll-smooth">
      <style>{`
        .seigaiha-pattern {
          background-color: #FFFDF9;
          background-image: radial-gradient(circle at 100% 150%, #B9000008 24%, #FFFDF9 25%),
            radial-gradient(circle at 0% 150%, #B9000008 24%, #FFFDF9 25%),
            radial-gradient(circle at 50% 100%, #B9000008 24%, #FFFDF9 25%),
            radial-gradient(circle at 100% 50%, #B9000008 24%, #FFFDF9 25%),
            radial-gradient(circle at 0% 50%, #B9000008 24%, #FFFDF9 25%),
            radial-gradient(circle at 50% 0%, #B9000008 24%, #FFFDF9 25%);
          background-size: 100px 50px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-text {
          animation: fadeIn 1s ease-out forwards;
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Navbar (Critical) */}
      <Suspense fallback={<div className="h-16 w-full bg-white shadow-sm" />}>
        <LandingNavbar
          isMobile={isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenForm={handleOpenForm}
        />
      </Suspense>

      {/* Floating social sidebar for Desktop */}
      {!isMobile && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 bg-white py-5 px-2.5 z-[999] flex flex-col gap-5 shadow-[2px_0_10px_rgba(0,0,0,0.1)]">
          <a href="#" className="text-[#B90000] hover:scale-110 transition-transform">
            <Pin size={20} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61560247499806"
            target="_blank"
            rel="noreferrer"
            className="text-[#B90000] hover:scale-110 transition-transform"
          >
            <Facebook size={20} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61560247499806"
            target="_blank"
            rel="noreferrer"
            className="text-[#B90000] hover:scale-110 transition-transform"
          >
            <Instagram size={20} />
          </a>
        </div>
      )}

      {/* 2. Hero Section (Critical) */}
      <Suspense fallback={<div className="min-h-[80vh] bg-slate-50 flex items-center justify-center text-slate-400">Loading hero...</div>}>
        <HeroSection onOpenForm={handleOpenForm} />
      </Suspense>

      {/* 3. About Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <AboutSection />
      </Suspense>

      {/* 4. Who Uses Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <WhoUsesSection />
      </Suspense>

      {/* 5. Ecosystem Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <EcosystemSection />
      </Suspense>

      {/* 6. Core Features Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturesSection />
      </Suspense>

      {/* 7. Learning Roadmap Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <RoadmapSection />
      </Suspense>

      {/* 8. Featured Courses Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <CoursesSection
          courses={courses}
          isMobile={isMobile}
          isTablet={isTablet}
          onOpenForm={handleOpenForm}
        />
      </Suspense>

      {/* 9. Analytics & Progress Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <AnalyticsSection />
      </Suspense>

      {/* 10. Testimonials Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>

      {/* 11. Contact Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <ContactSection onOpenForm={handleOpenForm} />
      </Suspense>

      {/* 12. Footer */}
      <Suspense fallback={<div className="h-40 bg-neutral-900 w-full" />}>
        <LandingFooter isMobile={isMobile} />
      </Suspense>

      {/* Register Modal Form */}
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
            borderRadius: "24px",
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
