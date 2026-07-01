import 'package:flutter/material.dart';
import '../widgets/home_shared_widgets.dart';

class AdminOverview extends StatelessWidget {
  final int pendingEnrollmentsCount;
  final VoidCallback onViewEnrollments;
  final VoidCallback onViewUsers;

  const AdminOverview({
    super.key,
    required this.pendingEnrollmentsCount,
    required this.onViewEnrollments,
    required this.onViewUsers,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatCard(
          icon: Icons.pending_actions_rounded,
          title: 'Đơn đăng ký chờ duyệt',
          value: '$pendingEnrollmentsCount đơn',
          color: Colors.orange,
          onTap: onViewEnrollments,
        ),
        const SizedBox(height: 16),
        StatCard(
          icon: Icons.supervised_user_circle_rounded,
          title: 'Quản lý tài khoản',
          value: 'Hoạt động',
          color: Colors.blueAccent,
          onTap: onViewUsers,
        ),
      ],
    );
  }
}

class AdminEnrollmentsList extends StatelessWidget {
  final List<Map<String, dynamic>> enrollments;
  final Function(String, bool) onProcessEnrollment;

  const AdminEnrollmentsList({
    super.key,
    required this.enrollments,
    required this.onProcessEnrollment,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        enrollments.isEmpty
            ? Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.black.withOpacity(0.05)),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.mark_email_read_outlined, color: Colors.black26, size: 40),
                      SizedBox(height: 12),
                      Text(
                        'Không có đơn đăng ký nào chờ duyệt!',
                        style: TextStyle(color: Colors.black54, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: enrollments.length,
                itemBuilder: (context, index) {
                  final enrollment = enrollments[index];
                  final course = enrollment['courseId'] as Map<String, dynamic>?;
                  final courseName = course != null ? (course['name']?.toString() ?? '') : 'Khóa học';
                  final enrollmentId = enrollment['_id']?.toString() ?? '';

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
                        Row(
                          children: [
                            const Icon(Icons.person_pin_rounded, color: Colors.black54, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              enrollment['studentName']?.toString() ?? 'Không rõ tên',
                              style: const TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Email: ${enrollment['studentEmail']?.toString() ?? ''}',
                          style: const TextStyle(color: Colors.black54, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Khóa học: $courseName',
                          style: const TextStyle(color: Color(0xFFB90000), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const Divider(color: Colors.black12, height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: () => onProcessEnrollment(enrollmentId, false),
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.redAccent,
                              ),
                              child: const Text('Từ chối', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton(
                              onPressed: () => onProcessEnrollment(enrollmentId, true),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFB90000),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Phê duyệt', style: TextStyle(fontWeight: FontWeight.bold)),
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
