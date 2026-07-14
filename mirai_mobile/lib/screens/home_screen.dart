import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'profile_screen.dart';
import 'admin_enrollment_requests_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  
  // Navigation State
  String _currentView = 'dashboard'; // 'dashboard', 'speaking', 'vocab', 'roster', 'enrollments'
  
  // Data State
  List<Map<String, dynamic>> _adminPendingEnrollments = [];
  List<Map<String, dynamic>> _teacherCourses = [];
  List<Map<String, dynamic>> _studentCourses = [];
  
  bool _isDataLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRoleSpecificData();
  }

  Future<void> _loadRoleSpecificData() async {
    setState(() {
      _isDataLoading = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    final token = authProvider.accessToken;

    if (user == null || token == null) {
      setState(() {
        _isDataLoading = false;
      });
      return;
    }

    try {
      if (user.role == 'admin') {
        final enrollments = await _apiService.fetchAllEnrollments(token, status: 'pending');
        setState(() {
          _adminPendingEnrollments = enrollments;
        });
      } else if (user.role == 'teacher') {
        final courses = await _apiService.fetchTeacherCourses(token);
        setState(() {
          _teacherCourses = courses;
        });
      } else if (user.role == 'student' || user.role == 'user') {
        final courses = await _apiService.fetchStudentCourses(token);
        setState(() {
          _studentCourses = courses;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể tải dữ liệu: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isDataLoading = false;
        });
      }
    }
  }
  // Teacher Class Roster Details modal
  void _showClassRoster(String courseId, String courseName) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFFB90000)),
      ),
    );

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    try {
      final students = await _apiService.fetchClassMembers(token!, courseId);
      if (mounted) {
        Navigator.of(context).pop(); // pop loading dialog
        _displayRosterModal(courseName, students);
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // pop loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải danh sách học sinh: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _displayRosterModal(String courseName, List<Map<String, dynamic>> students) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E1E2F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Lớp: $courseName',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Sĩ số: ${students.length} học viên',
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
              ),
              const Divider(color: Colors.white24, height: 24),
              Expanded(
                child: students.isEmpty
                    ? const Center(
                        child: Text(
                          'Chưa có học viên nào được xếp vào lớp này.',
                          style: TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                      )
                    : ListView.builder(
                        itemCount: students.length,
                        itemBuilder: (context, index) {
                          final student = students[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFAF8F5),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.withOpacity(0.12)),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: const Color(0xFFFFEDED),
                                  child: Text(
                                    (student['name']?.toString() ?? 'U').isNotEmpty
                                        ? student['name'].toString()[0].toUpperCase()
                                        : 'U',
                                    style: const TextStyle(color: Color(0xFFB90000), fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        student['name']?.toString() ?? 'Học viên',
                                        style: const TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        student['email']?.toString() ?? '',
                                        style: const TextStyle(color: Colors.black45, fontSize: 12),
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

  void _handleLogout(BuildContext context) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFFB90000)),
      ),
    );

    try {
      await authProvider.logout();
      if (context.mounted) {
        Navigator.of(context).pop(); // pop loading
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã đăng xuất thành công!'),
            backgroundColor: Colors.blueGrey,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
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

  // Helper to build sidebar drawer based on user roles
  Widget _buildRoleSidebar(BuildContext context, dynamic user) {
    final role = user?.role ?? 'student';
    final name = user?.name ?? 'Người dùng';
    final email = user?.email ?? '';
    final avatar = user?.avatar;

    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drawer Header containing User Info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              decoration: const BoxDecoration(
                color: Color(0xFFFAF8F5),
                border: Border(
                  bottom: BorderSide(color: Color(0xFFEEEEEE), width: 1.0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFFFFEDED),
                    backgroundImage: avatar != null && avatar.isNotEmpty
                        ? NetworkImage(avatar)
                        : null,
                    child: avatar == null || avatar.isEmpty
                        ? Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFB90000),
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
                      color: Color(0xFF1A1A1A),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.black45,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  // Role indicator badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEDED),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFB90000).withOpacity(0.25)),
                    ),
                    child: Text(
                      _getRoleName(role),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFB90000),
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
                    icon: Icons.dashboard_rounded,
                    title: 'Bảng điều khiển',
                    viewId: 'dashboard',
                  ),
                  _buildProfileDrawerItem(),
                  
                  // Admin options
                  if (role == 'admin') ...[
                    _buildEnrollmentsDrawerItem(),
                    _buildDrawerItem(
                      icon: Icons.people_outline_rounded,
                      title: 'Quản lý tài khoản',
                      viewId: 'users',
                    ),
                  ],

                  // Teacher options
                  if (role == 'teacher') ...[
                    _buildDrawerItem(
                      icon: Icons.school_outlined,
                      title: 'Quản lý lớp học',
                      viewId: 'roster',
                    ),
                  ],

                  // Student options
                  if (role == 'student' || role == 'user') ...[
                    _buildDrawerItem(
                      icon: Icons.record_voice_over_outlined,
                      title: 'Luyện nói (Speaking)',
                      viewId: 'speaking',
                    ),
                    _buildDrawerItem(
                      icon: Icons.translate_rounded,
                      title: 'Học từ vựng (Vocab)',
                      viewId: 'vocab',
                    ),
                  ],
                ],
              ),
            ),

            // Logout item at the bottom
            const Divider(height: 1, color: Color(0xFFEEEEEE)),
            Container(
              padding: const EdgeInsets.all(12),
              child: ListTile(
                leading: const Icon(Icons.logout_rounded, color: Color(0xFFB90000)),
                title: const Text(
                  'Đăng xuất',
                  style: TextStyle(color: Color(0xFFB90000), fontWeight: FontWeight.bold, fontSize: 14),
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onTap: () {
                  Navigator.of(context).pop();
                  _handleLogout(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required String viewId,
  }) {
    final isSelected = _currentView == viewId;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFFFFEDED) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? const Color(0xFFB90000) : Colors.black54,
          size: 22,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? const Color(0xFFB90000) : Colors.black87,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () {
          setState(() {
            _currentView = viewId;
          });
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Widget _buildProfileDrawerItem() {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: const Icon(Icons.person_outline_rounded, color: Colors.black54, size: 22),
        title: const Text(
          'Hồ sơ cá nhân',
          style: TextStyle(color: Colors.black87, fontSize: 14),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () {
          Navigator.of(context).pop();
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ProfileScreen()),
          );
        },
      ),
    );
  }

  Widget _buildEnrollmentsDrawerItem() {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: const Icon(Icons.how_to_reg_rounded, color: Colors.black54, size: 22),
        title: const Text(
          'Duyệt đơn đăng ký',
          style: TextStyle(color: Colors.black87, fontSize: 14),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () {
          Navigator.of(context).pop();
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AdminEnrollmentRequestsScreen()),
          );
        },
      ),
    );
  }

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

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5), // Light cream theme
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
        iconTheme: const IconThemeData(color: Color(0xFFB90000)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFEEEEEE)),
        ),
        actions: [
          if (_currentView == 'dashboard' || _currentView == 'enrollments' || _currentView == 'roster')
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFFB90000)),
              onPressed: _loadRoleSpecificData,
              tooltip: 'Làm mới',
            ),
        ],
      ),
      drawer: _buildRoleSidebar(context, user),
      body: SafeArea(
        child: _isDataLoading && (_currentView == 'dashboard' || _currentView == 'enrollments' || _currentView == 'roster')
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFFB90000)),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: _buildActiveViewContent(user),
              ),
      ),
    );
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
            _buildUserWelcomeCard(user),
            const SizedBox(height: 28),
            if (user?.role == 'admin') ...[
              _buildAdminOverview(),
            ] else if (user?.role == 'teacher') ...[
              _buildTeacherOverview(),
            ] else ...[
              _buildStudentOverview(),
            ],
          ],
        );
      case 'enrollments':
        return _buildAdminEnrollmentsView();
      case 'users':
        return _buildPlaceholderView(
          icon: Icons.people_outline_rounded,
          title: 'Quản lý tài khoản',
          description: 'Hệ thống đang đồng bộ dữ liệu người dùng. Tính năng quản lý phân quyền và khóa tài khoản sẽ hiển thị tại đây.',
        );
      case 'roster':
        return _buildTeacherRosterView();
      case 'speaking':
        return _buildPlaceholderView(
          icon: Icons.record_voice_over_outlined,
          title: 'Luyện nói AI',
          description: 'Phòng luyện nói tiếng Nhật giao tiếp tương tác với công nghệ chấm điểm AI thông minh của MIRAI sắp được ra mắt.',
        );
      case 'vocab':
        return _buildPlaceholderView(
          icon: Icons.translate_rounded,
          title: 'Học từ vựng Kanji',
          description: 'Phương pháp học flashcard, bài tập trắc nghiệm và ôn luyện từ vựng N5 - N1 đã được lên kế hoạch tích hợp.',
        );
      default:
        return Container();
    }
  }

  Widget _buildUserWelcomeCard(dynamic user) {
    return Container(
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB90000).withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFFB90000), Color(0xFFFF6B6B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: CircleAvatar(
              radius: 34,
              backgroundColor: const Color(0xFFFFEDED),
              backgroundImage: user?.avatar != null && user.avatar.isNotEmpty
                  ? NetworkImage(user.avatar)
                  : null,
              child: user?.avatar == null || user.avatar.isEmpty
                  ? Text(
                      (user != null && user.name.isNotEmpty) ? user.name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFB90000),
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Chào, ${user?.name ?? 'Người dùng'}!',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black45,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEDED),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFB90000).withOpacity(0.3)),
                  ),
                  child: Text(
                    _getRoleName(user?.role),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFB90000),
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

  // --- SUB-VIEWS FOR DASHBOARD VIEW ---
  
  Widget _buildAdminOverview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildStatCard(
          icon: Icons.pending_actions_rounded,
          title: 'Đơn đăng ký chờ duyệt',
          value: '${_adminPendingEnrollments.length} đơn',
          color: Colors.orange,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AdminEnrollmentRequestsScreen()),
            );
          },
        ),
        const SizedBox(height: 16),
        _buildStatCard(
          icon: Icons.supervised_user_circle_rounded,
          title: 'Quản lý tài khoản',
          value: 'Hoạt động',
          color: Colors.blueAccent,
          onTap: () {
            setState(() {
              _currentView = 'users';
            });
          },
        ),
      ],
    );
  }

  Widget _buildTeacherOverview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildStatCard(
          icon: Icons.class_outlined,
          title: 'Lớp học phụ trách',
          value: '${_teacherCourses.length} lớp học',
          color: Colors.green,
          onTap: () {
            setState(() {
              _currentView = 'roster';
            });
          },
        ),
      ],
    );
  }

  Widget _buildStudentOverview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildStatCard(
          icon: Icons.book_rounded,
          title: 'Lớp học của tôi',
          value: '${_studentCourses.length} lớp',
          color: const Color(0xFFB90000),
          onTap: () {},
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildActionGridCard(
                icon: Icons.record_voice_over_outlined,
                title: 'Luyện nói',
                color: Colors.teal,
                onTap: () {
                  setState(() {
                    _currentView = 'speaking';
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildActionGridCard(
                icon: Icons.translate_rounded,
                title: 'Từ vựng',
                color: Colors.purple,
                onTap: () {
                  setState(() {
                    _currentView = 'vocab';
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- FULL VIEWS NAVIGATED FROM SIDEBAR ---

  Widget _buildAdminEnrollmentsView() {
    return const AdminEnrollmentRequestsScreen();
  }

  Widget _buildTeacherRosterView() {
    return _buildTeacherCoursesList();
  }

  Widget _buildPlaceholderView({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFFFEDED),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFFB90000), size: 48),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: const TextStyle(color: Color(0xFF1A1A1A), fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // --- WIDGET REUSABLE BLOCKS ---

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.black54, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: const TextStyle(color: Color(0xFF1A1A1A), fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded, color: Colors.black.withOpacity(0.2), size: 14),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionGridCard({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 4),
              const Text(
                'Khám phá ngay',
                style: TextStyle(color: Colors.black38, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
  Widget _buildTeacherCoursesList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _teacherCourses.isEmpty
            ? Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.withOpacity(0.12)),
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.menu_book_rounded, color: Colors.black26, size: 40),
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
                itemCount: _teacherCourses.length,
                itemBuilder: (context, index) {
                  final course = _teacherCourses[index];
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
                      border: Border.all(color: Colors.grey.withOpacity(0.12)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          courseName,
                          style: const TextStyle(color: Color(0xFF023665), fontWeight: FontWeight.bold, fontSize: 16),
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
                              style: const TextStyle(color: Color(0xFFB90000), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => _showClassRoster(courseId, courseName),
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
