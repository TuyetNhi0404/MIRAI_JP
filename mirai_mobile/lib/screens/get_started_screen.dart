import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'get_started/widgets/hero_section.dart';
import 'get_started/widgets/why_choose_us_section.dart';
import 'get_started/widgets/courses_section.dart';

class GetStartedScreen extends StatefulWidget {
  const GetStartedScreen({super.key});

  @override
  State<GetStartedScreen> createState() => _GetStartedScreenState();
}

class _GetStartedScreenState extends State<GetStartedScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _courses = [];
  bool _isLoadingCourses = true;

  @override
  void initState() {
    super.initState();
    _loadAvailableCourses();
  }

  Future<void> _loadAvailableCourses() async {
    try {
      final courses = await _apiService.fetchAvailableCourses();
      if (mounted) {
        setState(() {
          _courses = courses;
          _isLoadingCourses = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingCourses = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5), // Soft warm cream/white background matching the web
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: SafeArea(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 24,
                      decoration: BoxDecoration(
                        color: const Color(0xFFB90000),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'MIRAI JAPANESE',
                      style: TextStyle(
                        fontFamily: 'Playfair Display',
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFB90000),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                // Log in button
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFB90000),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: const Text(
                    'Đăng nhập',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const HeroSection(),
            const SizedBox(height: 40),
            const WhyChooseUsSection(),
            const SizedBox(height: 20),
            CoursesSection(
              isLoadingCourses: _isLoadingCourses,
              courses: _courses,
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
}
