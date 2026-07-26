import 'package:flutter/material.dart';
import '../../register_screen.dart';

class CoursesSection extends StatelessWidget {
  final bool isLoadingCourses;
  final List<Map<String, dynamic>> courses;

  const CoursesSection({
    super.key,
    required this.isLoadingCourses,
    required this.courses,
  });

  Widget _buildCourseCard({
    required BuildContext context,
    required Map<String, dynamic> course,
    required String imagePath,
    bool isDarkHighlight = false,
  }) {
    final title = course['name']?.toString() ?? 'Khóa học';
    final desc = course['description']?.toString() ?? 'Không có mô tả cho khóa học này.';
    final tag = (course['status']?.toString() ?? 'Active').toUpperCase();

    return Container(
      decoration: BoxDecoration(
        color: isDarkHighlight ? const Color(0xFF1A2138) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Course Header Image
          SizedBox(
            height: 160,
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
              child: Image.asset(
                imagePath,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: Colors.grey[200],
                  child: Icon(Icons.broken_image_outlined, color: Colors.grey[400], size: 40),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDarkHighlight ? Colors.white.withOpacity(0.15) : const Color(0xFFB90000).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    tag,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isDarkHighlight ? Colors.white : const Color(0xFFB90000),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDarkHighlight ? Colors.white : const Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDarkHighlight ? Colors.white.withOpacity(0.7) : const Color(0xFF666666),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => RegisterScreen(preselectedCourse: course),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFB90000),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Đăng ký ngay',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Khóa học đang hoạt động',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Container(
              width: 40,
              height: 3,
              color: const Color(0xFFB90000),
            ),
          ),
          const SizedBox(height: 28),
          
          // Load dynamic list
          isLoadingCourses
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40.0),
                    child: CircularProgressIndicator(
                      color: Color(0xFFB90000),
                    ),
                  ),
                )
              : courses.isEmpty
                  ? Container(
                      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.withOpacity(0.15)),
                      ),
                      child: const Column(
                        children: [
                          Icon(Icons.info_outline_rounded, color: Colors.grey, size: 40),
                          SizedBox(height: 12),
                          Text(
                            'Hiện tại chưa có khóa học nào đang chạy.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey, fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: courses.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 20),
                      itemBuilder: (context, index) {
                        final course = courses[index];
                        // Cycle through copied course images
                        final imageIndex = (index % 4) + 1;
                        final imagePath = 'assets/img/course$imageIndex.png';
                        return _buildCourseCard(
                          context: context,
                          course: course,
                          imagePath: imagePath,
                          isDarkHighlight: index % 2 == 1,
                        );
                      },
                    ),
        ],
      ),
    );
  }
}
