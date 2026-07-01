import 'package:flutter/material.dart';
import '../widgets/home_shared_widgets.dart';

class TeacherOverview extends StatelessWidget {
  final int coursesCount;
  final VoidCallback onViewRoster;

  const TeacherOverview({
    super.key,
    required this.coursesCount,
    required this.onViewRoster,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatCard(
          icon: Icons.class_outlined,
          title: 'Lớp học phụ trách',
          value: '$coursesCount lớp học',
          color: Colors.green,
          onTap: onViewRoster,
        ),
      ],
    );
  }
}

class TeacherCoursesList extends StatelessWidget {
  final List<Map<String, dynamic>> teacherCourses;
  final Function(String courseId, String courseName) onShowClassRoster;

  const TeacherCoursesList({
    super.key,
    required this.teacherCourses,
    required this.onShowClassRoster,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        teacherCourses.isEmpty
            ? Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.02),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.menu_book_rounded, color: Colors.black38, size: 40),
                      SizedBox(height: 12),
                      Text(
                        'Bạn chưa làm chủ nhiệm lớp học nào.',
                        style: TextStyle(color: Colors.black54, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: teacherCourses.length,
                itemBuilder: (context, index) {
                  final course = teacherCourses[index];
                  final courseId = course['_id']?.toString() ?? '';
                  final courseName = course['name']?.toString() ?? 'Khóa học';
                  final enrolled = course['enrolledCount']?.toString() ?? '0';
                  final capacity = course['capacity']?.toString() ?? '0';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(color: Colors.black.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          courseName,
                          style: const TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          course['description']?.toString() ?? 'Không có mô tả',
                          style: const TextStyle(color: Colors.black54, fontSize: 12, height: 1.4),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Học viên: $enrolled/$capacity',
                              style: const TextStyle(color: Color(0xFFFF8B8B), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => onShowClassRoster(courseId, courseName),
                              icon: const Icon(Icons.people_alt_outlined, size: 16),
                              label: const Text('Danh sách lớp', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFB90000),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
      ],
    );
  }
}
