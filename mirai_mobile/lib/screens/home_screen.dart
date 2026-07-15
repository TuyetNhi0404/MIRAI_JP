import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'notification_screen.dart';
import '../widgets/vocab_flashcard_view.dart';
import 'home/widgets/home_drawer.dart';
import 'home/widgets/user_welcome_card.dart';
import 'home/widgets/home_shared_widgets.dart';
import 'home/views/admin_dashboard_view.dart';
import 'home/views/teacher_dashboard_view.dart';
import 'home/views/student_dashboard_view.dart';
import 'profile_screen.dart';
import 'leaderboard_screen.dart';
import 'grammar_practice_screen.dart';
import 'ocr_vocab_screen.dart';
import 'admin_enrollment_requests_screen.dart';
import 'student_statistics_screen.dart';
import 'kana_practice_screen.dart';
import 'student_quizzes_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _currentView = 'dashboard';
  
  // Data lists
  List<Map<String, dynamic>> _adminPendingEnrollments = [];
  List<Map<String, dynamic>> _teacherCourses = [];
  List<Map<String, dynamic>> _studentCourses = [];
  
  bool _isDataLoading = true;
  int _unreadNotificationCount = 0;

  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRoleSpecificData();
      _loadUnreadNotificationCount();
    });
  }

  Future<void> _loadRoleSpecificData() async {
    if (!mounted) return;
    setState(() {
      _isDataLoading = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      final role = authProvider.user?.role;

      if (token != null) {
        if (role == 'admin') {
          final adminData = await _apiService.fetchAllEnrollments(token, status: 'pending');
          if (mounted) {
            setState(() {
              _adminPendingEnrollments = adminData;
            });
          }
        } else if (role == 'teacher') {
          final teacherData = await _apiService.fetchTeacherCourses(token);
          if (mounted) {
            setState(() {
              _teacherCourses = teacherData;
            });
          }
        } else {
          final studentData = await _apiService.fetchStudentCourses(token);
          if (mounted) {
            setState(() {
              _studentCourses = studentData;
            });
          }
        }
      }
      
      if (mounted) {
        setState(() {
          _isDataLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDataLoading = false;
        });
      }
    }
  }
  Future<void> _loadUnreadNotificationCount() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      if (token == null) return;

      final count = await _apiService.getUnreadNotificationCount(token);
      if (mounted) {
        setState(() {
          _unreadNotificationCount = count;
        });
      }
    } catch (e) {
      // Silently ignore error for count
    }
  }

  // Admin Approval Action
  Future<void> _processEnrollment(String enrollmentId, bool approve) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFFB90000))),
    );

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      
      if (token != null) {
        if (approve) {
          await _apiService.approveEnrollment(token, enrollmentId);
        } else {
          await _apiService.rejectEnrollment(token, enrollmentId);
        }
        
        if (mounted) {
          Navigator.of(context).pop(); // pop loading
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(approve ? 'Đã phê duyệt đơn thành công!' : 'Đã từ chối đơn đăng ký!'),
              backgroundColor: approve ? Colors.green : Colors.blueGrey,
            ),
          );
          _loadRoleSpecificData(); // refresh list
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // pop loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  // Teacher action to view roster
  Future<void> _showClassRoster(String courseId, String courseName) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFFB90000))),
    );

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      
      if (token != null) {
        final students = await _apiService.fetchClassMembers(token, courseId);
        
        if (mounted) {
          Navigator.of(context).pop(); // pop loading
          
          showModalBottomSheet(
            context: context,
            backgroundColor: Colors.transparent,
            isScrollControlled: true,
            builder: (context) {
              return Container(
                height: MediaQuery.of(context).size.height * 0.75,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                ),
                child: Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 12),
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.black12,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Row(
                        children: [
                          const Icon(Icons.people_alt_rounded, color: Color(0xFFB90000)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Lớp: $courseName',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFB90000).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${students.length} học viên',
                              style: const TextStyle(
                                color: Color(0xFFB90000),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 32, color: Colors.black12),
                    Expanded(
                      child: students.isEmpty
                          ? const Center(
                              child: Text('Lớp học chưa có học viên nào.', style: TextStyle(color: Colors.black54)),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                              itemCount: students.length,
                              itemBuilder: (context, index) {
                                final student = students[index];
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.black.withOpacity(0.05)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.02),
                                        blurRadius: 5,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: const Color(0xFFB90000).withOpacity(0.1),
                                        child: Text(
                                          (student['name']?.toString() ?? 'U')[0].toUpperCase(),
                                          style: const TextStyle(color: Color(0xFFB90000), fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              student['name']?.toString() ?? 'Không rõ tên',
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              student['email']?.toString() ?? '',
                                              style: const TextStyle(color: Colors.black54, fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              );
            },
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // pop loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải danh sách: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _handleLogout() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Colors.redAccent)),
    );
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
      if (mounted) {
        Navigator.of(context).pop(); // pop loading
        Navigator.of(context).popUntil((route) => route.isFirst);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã đăng xuất thành công!'),
            backgroundColor: Colors.blueGrey,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // pop loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đăng xuất thất bại: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  String _getViewTitle() {
    switch (_currentView) {
      case 'dashboard':
        return 'BẢNG ĐIỀU KHIỂN';
      case 'enrollments':
        return 'DUYỆT GHI DANH';
      case 'users':
        return 'QUẢN LÝ TÀI KHOẢN';
      case 'roster':
        return 'QUẢN LÝ LỚP HỌC';
      case 'speaking':
        return 'LUYỆN NÓI TIẾNG NHẬT';
      case 'vocab':
        return 'TRAU DỒI TỪ VỰNG';
      default:
        return 'MIRAI';
    }
  }

  Widget _buildActiveViewContent(dynamic user) {
    switch (_currentView) {
      case 'dashboard':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            UserWelcomeCard(user: user),
            const SizedBox(height: 28),
            if (user?.role == 'admin') ...[
              AdminOverview(
                pendingEnrollmentsCount: _adminPendingEnrollments.length,
                onViewEnrollments: () => setState(() => _currentView = 'enrollments'),
                onViewUsers: () => setState(() => _currentView = 'users'),
              ),
            ] else if (user?.role == 'teacher') ...[
              TeacherOverview(
                coursesCount: _teacherCourses.length,
                onViewRoster: () => setState(() => _currentView = 'roster'),
              ),
            ] else ...[
              StudentOverview(
                coursesCount: _studentCourses.length,
                onViewCourses: () {},
                onViewSpeaking: () => setState(() => _currentView = 'speaking'),
                onViewVocab: () => setState(() => _currentView = 'vocab'),
                onViewLeaderboard: () {
                  if (_studentCourses.isNotEmpty) {
                    final first = _studentCourses.first;
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
                onViewGrammar: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const GrammarPracticeScreen()),
                  );
                },
                onViewOcr: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const OcrVocabScreen()),
                  );
                },
                onViewKana: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const KanaPracticeScreen()),
                  );
                },
                onViewQuizzes: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const StudentQuizzesScreen()),
                  );
                },
                onViewStatistics: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const StudentStatisticsScreen()),
                  );
                },
              ),
            ],
          ],
        );
      case 'enrollments':
        return AdminEnrollmentsList(
          enrollments: _adminPendingEnrollments,
          onProcessEnrollment: _processEnrollment,
        );
      case 'users':
        return const PlaceholderView(
          icon: Icons.people_outline_rounded,
          title: 'Quản lý tài khoản',
          description: 'Hệ thống đang đồng bộ dữ liệu người dùng. Tính năng quản lý phân quyền và khóa tài khoản sẽ hiển thị tại đây.',
        );
      case 'roster':
        return TeacherCoursesList(
          teacherCourses: _teacherCourses,
          onShowClassRoster: _showClassRoster,
        );
      case 'speaking':
        return const PlaceholderView(
          icon: Icons.record_voice_over_outlined,
          title: 'Luyện nói AI',
          description: 'Phòng luyện nói tiếng Nhật giao tiếp tương tác với công nghệ chấm điểm AI thông minh của MIRAI sắp được ra mắt.',
        );
      case 'vocab':
        return const VocabFlashcardView();
      default:
        return Container();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5), // Light theme background
      appBar: AppBar(
        title: Text(
          _getViewTitle(),
          style: const TextStyle(
            color: Color(0xFF023665),
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        iconTheme: const IconThemeData(color: Color(0xFFB90000)), // Set drawer button icon color to red
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFEEEEEE)),
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Color(0xFFB90000)),
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (context) => const NotificationScreen(),
                  ).then((_) => _loadUnreadNotificationCount());
                },
                tooltip: 'Thông báo',
              ),
              if (_unreadNotificationCount > 0)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      _unreadNotificationCount > 9 ? '9+' : '$_unreadNotificationCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (_currentView == 'dashboard' || _currentView == 'enrollments' || _currentView == 'roster')
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFFB90000)),
              onPressed: () {
                _loadRoleSpecificData();
                _loadUnreadNotificationCount();
              },
              tooltip: 'Làm mới',
            ),
        ],
      ),
      drawer: HomeDrawer(
        user: user,
        currentView: _currentView,
        onSelectView: (viewId) {
          setState(() {
            _currentView = viewId;
          });
        },
        onLogout: _handleLogout,
        studentCourses: _studentCourses,
      ),
      body: Stack(
        children: [
          // Background decoration lights
          Positioned(
            top: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFB90000).withOpacity(0.08),
                    blurRadius: 100,
                    spreadRadius: 50,
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFB90000).withOpacity(0.05),
                    blurRadius: 100,
                    spreadRadius: 50,
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            child: _isDataLoading && (_currentView == 'dashboard' || _currentView == 'enrollments' || _currentView == 'roster')
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFB90000)),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                    child: _buildActiveViewContent(user),
                  ),
          ),
        ],
      ),
    );
  }
}
