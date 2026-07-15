import 'package:flutter/material.dart';
import '../../../models/user_model.dart';
import '../../profile_screen.dart';
import '../../leaderboard_screen.dart';
import '../../grammar_practice_screen.dart';
import '../../ocr_vocab_screen.dart';
import '../../student_statistics_screen.dart';
import '../../kana_practice_screen.dart';
import '../../student_quizzes_screen.dart';

class HomeDrawer extends StatelessWidget {
  final UserModel? user;
  final String currentView;
  final Function(String) onSelectView;
  final VoidCallback onLogout;
  final List<Map<String, dynamic>> studentCourses;

  const HomeDrawer({
    super.key,
    required this.user,
    required this.currentView,
    required this.onSelectView,
    required this.onLogout,
    required this.studentCourses,
  });

  String _getRoleName(String? role) {
    switch (role) {
      case 'admin':
        return 'QUẢN TRỊ VIÊN';
      case 'teacher':
        return 'GIẢNG VIÊN';
      case 'student':
        return 'HỌC VIÊN';
      default:
        return 'NGƯỜI DÙNG';
    }
  }

  Widget _buildDrawerItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String viewId,
  }) {
    final isSelected = currentView == viewId;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFFB90000).withOpacity(0.12) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? const Color(0xFFFF8B8B) : Colors.white70,
          size: 22,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () {
          onSelectView(viewId);
          Navigator.of(context).pop(); // Close drawer
        },
      ),
    );
  }

  Widget _buildProfileDrawerItem(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: const Icon(Icons.person_outline_rounded, color: Colors.white70, size: 22),
        title: const Text(
          'Hồ sơ cá nhân',
          style: TextStyle(color: Colors.white70, fontSize: 14),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () {
          Navigator.of(context).pop(); // Close drawer
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ProfileScreen()),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final role = user?.role ?? 'student';
    final name = user?.name ?? 'Người dùng';
    final email = user?.email ?? '';
    final avatar = user?.avatar;

    return Drawer(
      backgroundColor: const Color(0xFF11111E),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drawer Header containing User Info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Colors.white.withOpacity(0.08), width: 1.0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFFB90000).withOpacity(0.2),
                    backgroundImage: avatar != null && avatar.isNotEmpty
                        ? NetworkImage(avatar)
                        : null,
                    child: avatar == null || avatar.isEmpty
                        ? Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.5),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  // Role indicator badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFB90000).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _getRoleName(role),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF8B8B),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Drawer items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.dashboard_rounded,
                    title: 'Bảng điều khiển',
                    viewId: 'dashboard',
                  ),
                  _buildProfileDrawerItem(context),
                  
                  // Admin options
                  if (role == 'admin') ...[
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.how_to_reg_rounded,
                      title: 'Duyệt đơn đăng ký',
                      viewId: 'enrollments',
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.people_outline_rounded,
                      title: 'Quản lý tài khoản',
                      viewId: 'users',
                    ),
                  ],

                  // Teacher options
                  if (role == 'teacher') ...[
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.school_outlined,
                      title: 'Quản lý lớp học',
                      viewId: 'roster',
                    ),
                  ],

                  // Student options
                  if (role == 'student' || role == 'user') ...[
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.record_voice_over_outlined,
                      title: 'Luyện nói (Speaking)',
                      viewId: 'speaking',
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.translate_rounded,
                      title: 'Học từ vựng (Vocab)',
                      viewId: 'vocab',
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.camera_alt_outlined, color: Colors.white70, size: 22),
                        title: const Text('Quét ảnh tra từ', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OcrVocabScreen()));
                        },
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.emoji_events_outlined, color: Colors.white70, size: 22),
                        title: const Text('Bảng xếp hạng', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          if (studentCourses.isNotEmpty) {
                            final first = studentCourses.first;
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => LeaderboardScreen(
                                  courseId: first['_id']?.toString() ?? '',
                                  courseName: first['name']?.toString() ?? 'Lớp học',
                                ),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Bạn chưa tham gia lớp học nào để xem xếp hạng!'),
                                backgroundColor: Color(0xFFB90000),
                              ),
                            );
                          }
                        },
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.menu_book_rounded, color: Colors.white70, size: 22),
                        title: const Text('Luyện ngữ pháp', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GrammarPracticeScreen()));
                        },
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.edit_rounded, color: Colors.white70, size: 22),
                        title: const Text('Luyện viết Kana', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KanaPracticeScreen()));
                        },
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.quiz_outlined, color: Colors.white70, size: 22),
                        title: const Text('Bài kiểm tra', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StudentQuizzesScreen()));
                        },
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.bar_chart_rounded, color: Colors.white70, size: 22),
                        title: const Text('Thống kê kết quả', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onTap: () {
                          Navigator.of(context).pop(); // Close drawer
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StudentStatisticsScreen()));
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Logout item at the bottom
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Colors.white.withOpacity(0.05), width: 1.0),
                ),
              ),
              child: ListTile(
                leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                title: const Text(
                  'Đăng xuất',
                  style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onTap: () {
                  Navigator.of(context).pop(); // Close drawer
                  onLogout();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
