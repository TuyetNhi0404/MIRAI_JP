import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/user_model.dart';
import 'notification_screen.dart';
import 'profile/widgets/profile_header.dart';
import 'profile/widgets/profile_tiles.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  final _nameController = TextEditingController();
  bool _isEditing = false;
  bool _isSaving = false;
  String _currentLanguage = 'Tiếng Việt';

  // Role-specific data states
  List<Map<String, dynamic>> _roleCourses = [];
  int _pendingEnrollmentsCount = 0;
  bool _isLoadingRoleData = false;
  bool _isUploadingAvatar = false;

  static const _red = Color(0xFFB90000);
  static const _redMid = Color(0xFFE53935);
  static const _redLight = Color(0xFFFFEDED);

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 500));
    _fadeAnimation =
        CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      _nameController.text = user?.name ?? '';
      _loadRoleSpecificData();
    });
  }

  Future<void> _loadRoleSpecificData() async {
    if (!mounted) return;
    setState(() => _isLoadingRoleData = true);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    final token = authProvider.accessToken;

    if (user == null || token == null) {
      if (mounted) setState(() => _isLoadingRoleData = false);
      return;
    }

    try {
      if (user.role == 'admin') {
        final enrollments = await _apiService.fetchAllEnrollments(token, status: 'pending');
        if (mounted) {
          setState(() {
            _pendingEnrollmentsCount = enrollments.length;
          });
        }
      } else if (user.role == 'teacher') {
        final courses = await _apiService.fetchTeacherCourses(token);
        if (mounted) {
          setState(() {
            _roleCourses = courses;
          });
        }
      } else if (user.role == 'student' || user.role == 'user') {
        final courses = await _apiService.fetchStudentCourses(token);
        if (mounted) {
          setState(() {
            _roleCourses = courses;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading role specific data in profile: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingRoleData = false);
      }
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    if (token == null) return;

    try {
      final ImagePicker picker = ImagePicker();
      final ImageSource? source = await showDialog<ImageSource>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Chọn ảnh đại diện', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
          actions: [
            TextButton.icon(
              onPressed: () => Navigator.pop(ctx, ImageSource.camera),
              icon: const Icon(Icons.camera_alt_rounded, color: _red),
              label: const Text('Máy ảnh', style: TextStyle(color: _red)),
            ),
            TextButton.icon(
              onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
              icon: const Icon(Icons.photo_library_rounded, color: _red),
              label: const Text('Thư viện', style: TextStyle(color: _red)),
            ),
          ],
        ),
      );

      if (source == null) return;

      final XFile? file = await picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (file == null) return;

      setState(() => _isUploadingAvatar = true);

      final response = await _apiService.updateAvatar(token, file.path);
      
      if (response['success'] == true && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        await authProvider.updateLocalUser(updatedUser);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã cập nhật ảnh đại diện!'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể tải ảnh: ${e.toString()}'), backgroundColor: _redMid),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
      }
    }
  }


  @override
  void dispose() {
    _fadeController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _toggleEdit() {
    setState(() {
      _isEditing = !_isEditing;
      if (!_isEditing) {
        final user = Provider.of<AuthProvider>(context, listen: false).user;
        _nameController.text = user?.name ?? '';
      }
    });
  }

  Future<void> _saveProfile() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Tên không được để trống!'),
            backgroundColor: _redMid),
      );
      return;
    }
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 700));
    if (mounted) {
      setState(() {
        _isSaving = false;
        _isEditing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Đã lưu thông tin!'),
            backgroundColor: Colors.green),
      );
    }
  }

  void _showLanguageSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('Chọn ngôn ngữ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _red)),
              ),
              _buildLanguageOption('Tiếng Việt'),
              _buildLanguageOption('English (Tiếng Anh)'),
              _buildLanguageOption('日本語 (Tiếng Nhật)'),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLanguageOption(String lang) {
    final isSelected = _currentLanguage == lang;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      title: Text(lang, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? _red : Colors.black87)),
      trailing: isSelected ? const Icon(Icons.check_rounded, color: _red) : null,
      onTap: () {
        setState(() {
          _currentLanguage = lang;
        });
        Navigator.pop(context);
      },
    );
  }

  void _handleLogout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _red),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'HỒ SƠ CÁ NHÂN',
          style: TextStyle(
            color: _red,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _red.withOpacity(0.12)),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AvatarCard(
                user: user,
                isEditing: _isEditing,
                isSaving: _isSaving,
                nameController: _nameController,
                onToggleEdit: _toggleEdit,
                onSaveProfile: _saveProfile,
              ),
              const SizedBox(height: 20),
              InfoCard(user: user),
              const SizedBox(height: 20),
              _buildRoleSpecificCard(user),
              const SizedBox(height: 24),
              const SectionLabel(title: 'Cài đặt tài khoản'),
              const SizedBox(height: 10),
              ProfileTile(
                icon: Icons.notifications_outlined,
                title: 'Thông báo',
                subtitle: 'Quản lý thông báo ứng dụng',
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (context) => const NotificationScreen(),
                  );
                },
              ),
              const SizedBox(height: 8),
              ProfileTile(
                icon: Icons.language_rounded,
                title: 'Ngôn ngữ',
                subtitle: _currentLanguage,
                onTap: _showLanguageSelector,
              ),
              const SizedBox(height: 24),
              const SectionLabel(title: 'Về ứng dụng'),
              const SizedBox(height: 10),
              ProfileTile(
                icon: Icons.info_outline_rounded,
                title: 'Phiên bản ứng dụng',
                subtitle: 'MIRAI v1.0.0',
                onTap: () {},
                showArrow: false,
              ),
              const SizedBox(height: 8),
              ProfileTile(
                icon: Icons.star_outline_rounded,
                title: 'Đánh giá ứng dụng',
                subtitle: 'Ủng hộ chúng tôi trên App Store',
                onTap: () {},
              ),
              const SizedBox(height: 28),
              LogoutButton(onLogout: _handleLogout),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value,
      {Color? valueColor}) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _redLight,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 16, color: _red),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                      color: Colors.black.withOpacity(0.4), fontSize: 11)),
              const SizedBox(height: 2),
              Text(value,
                  style: TextStyle(
                      color: valueColor ?? const Color(0xFF1A1A1A),
                      fontSize: 14,
                      fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRoleSpecificCard(dynamic user) {
    if (_isLoadingRoleData) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(color: _red, strokeWidth: 2),
          ),
        ),
      );
    }

    final role = user?.role ?? 'student';

    if (role == 'admin') {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'QUẢN TRỊ HỆ THỐNG',
              style: TextStyle(
                color: _red,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 14),
            _buildInfoRow(
              Icons.how_to_reg_rounded,
              'Đơn đăng ký chờ duyệt',
              '$_pendingEnrollmentsCount đơn',
              valueColor: _pendingEnrollmentsCount > 0 ? Colors.orange : Colors.green,
            ),
          ],
        ),
      );
    }

    final isTeacher = role == 'teacher';
    final cardTitle = isTeacher ? 'LỚP HỌC PHỤ TRÁCH' : 'KHÓA HỌC ĐANG HỌC';
    final emptyMsg = isTeacher 
        ? 'Bạn chưa làm chủ nhiệm lớp học nào.' 
        : 'Bạn chưa đăng ký khóa học nào.';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            cardTitle,
            style: const TextStyle(
              color: _red,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 14),
          _roleCourses.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Text(
                    emptyMsg,
                    style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 13),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _roleCourses.length,
                  separatorBuilder: (_, __) => const Divider(height: 16, color: Color(0xFFF0F0F0)),
                  itemBuilder: (context, idx) {
                    final course = _roleCourses[idx];
                    final name = course['name']?.toString() ?? 'Khóa học';
                    final code = course['code']?.toString() ?? (course['_id'] != null ? course['_id'].toString().substring(0, 6) : '');
                    final desc = course['description']?.toString() ?? 'Không có mô tả';

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _redLight,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            isTeacher ? Icons.class_outlined : Icons.menu_book_rounded,
                            size: 16,
                            color: _red,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  color: Color(0xFF1A1A1A),
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              if (code.isNotEmpty)
                                Text(
                                  'Mã: ${code.toUpperCase()}',
                                  style: TextStyle(
                                    color: Colors.black.withOpacity(0.4),
                                    fontSize: 11,
                                  ),
                                ),
                              const SizedBox(height: 2),
                              Text(
                                desc,
                                style: TextStyle(
                                  color: Colors.black.withOpacity(0.5),
                                  fontSize: 12,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
        ],
      ),
    );
  }
}
