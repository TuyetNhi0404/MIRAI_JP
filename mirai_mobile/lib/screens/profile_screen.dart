import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  final _nameController = TextEditingController();
  bool _isEditing = false;
  bool _isSaving = false;

  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  static const _redMid = Color(0xFFE53935);

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
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _nameController.dispose();
    super.dispose();
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

  IconData _getRoleIcon(String? role) {
    switch (role) {
      case 'admin':
        return Icons.shield_rounded;
      case 'teacher':
        return Icons.school_rounded;
      case 'student':
        return Icons.menu_book_rounded;
      default:
        return Icons.person_rounded;
    }
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
              _buildAvatarCard(user),
              const SizedBox(height: 20),
              _buildInfoCard(user),
              const SizedBox(height: 24),
              _buildSectionLabel('Cài đặt tài khoản'),
              const SizedBox(height: 10),
              _buildTile(
                icon: Icons.notifications_outlined,
                title: 'Thông báo',
                subtitle: 'Quản lý thông báo ứng dụng',
                onTap: () {},
              ),
              const SizedBox(height: 8),
              _buildTile(
                icon: Icons.lock_outline_rounded,
                title: 'Đổi mật khẩu',
                subtitle: 'Cập nhật mật khẩu bảo mật',
                onTap: () {},
              ),
              const SizedBox(height: 8),
              _buildTile(
                icon: Icons.language_rounded,
                title: 'Ngôn ngữ',
                subtitle: 'Tiếng Việt',
                onTap: () {},
              ),
              const SizedBox(height: 24),
              _buildSectionLabel('Về ứng dụng'),
              const SizedBox(height: 10),
              _buildTile(
                icon: Icons.info_outline_rounded,
                title: 'Phiên bản ứng dụng',
                subtitle: 'MIRAI v1.0.0',
                onTap: () {},
                showArrow: false,
              ),
              const SizedBox(height: 8),
              _buildTile(
                icon: Icons.star_outline_rounded,
                title: 'Đánh giá ứng dụng',
                subtitle: 'Ủng hộ chúng tôi trên App Store',
                onTap: () {},
              ),
              const SizedBox(height: 28),
              _buildLogoutButton(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Avatar Card ────────────────────────────────────────────────────────────
  Widget _buildAvatarCard(dynamic user) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _red.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Avatar with ring
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [_red, Color(0xFFFF6B6B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: CircleAvatar(
                  radius: 48,
                  backgroundColor: _redLight,
                  backgroundImage:
                      user?.avatar != null && user.avatar.isNotEmpty
                          ? NetworkImage(user.avatar)
                          : null,
                  child: user?.avatar == null || user.avatar.isEmpty
                      ? Text(
                          (user?.name?.isNotEmpty == true)
                              ? user.name[0].toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            fontSize: 38,
                            fontWeight: FontWeight.bold,
                            color: _red,
                          ),
                        )
                      : null,
                ),
              ),
              // Role badge icon
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: _red,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Icon(_getRoleIcon(user?.role),
                    size: 13, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Name
          _isEditing
              ? TextField(
                  controller: _nameController,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A1A)),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    filled: true,
                    fillColor: _redLight,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                            BorderSide(color: _red.withOpacity(0.3))),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                            BorderSide(color: _red.withOpacity(0.25))),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                            const BorderSide(color: _red, width: 1.5)),
                  ),
                )
              : Text(
                  user?.name ?? 'Người dùng',
                  style: const TextStyle(
                    color: Color(0xFF1A1A1A),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),

          const SizedBox(height: 6),
          Text(
            user?.email ?? '',
            style: TextStyle(
                color: Colors.black.withOpacity(0.45), fontSize: 13),
          ),
          const SizedBox(height: 12),

          // Role chip
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: _redLight,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _red.withOpacity(0.25)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(_getRoleIcon(user?.role), size: 12, color: _red),
                const SizedBox(width: 6),
                Text(
                  _getRoleName(user?.role),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: _red,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF0F0F0)),
          const SizedBox(height: 12),

          // Edit / Save buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: _isEditing
                ? [
                    OutlinedButton(
                      onPressed: _toggleEdit,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.black54,
                        side: const BorderSide(color: Color(0xFFDDDDDD)),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 10),
                      ),
                      child: const Text('Hủy'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _isSaving ? null : _saveProfile,
                      icon: _isSaving
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.check_rounded, size: 16),
                      label: const Text('Lưu lại'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _red,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 22, vertical: 10),
                      ),
                    ),
                  ]
                : [
                    ElevatedButton.icon(
                      onPressed: _toggleEdit,
                      icon: const Icon(Icons.edit_outlined, size: 16),
                      label: const Text('Chỉnh sửa hồ sơ'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _red,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 22, vertical: 10),
                      ),
                    ),
                  ],
          ),
        ],
      ),
    );
  }

  // ─── Info Card ───────────────────────────────────────────────────────────────
  Widget _buildInfoCard(dynamic user) {
    final id = user?.id?.toString() ?? '';
    final shortId = id.length > 8 ? '#${id.substring(0, 8)}...' : '#$id';
    final status = user?.status == 'active' ? 'Đang hoạt động' : (user?.status ?? 'Không rõ');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'THÔNG TIN TÀI KHOẢN',
            style: TextStyle(
                color: _red,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2),
          ),
          const SizedBox(height: 14),
          _buildInfoRow(Icons.badge_outlined, 'Mã tài khoản', shortId),
          const Divider(height: 20, color: Color(0xFFF0F0F0)),
          _buildInfoRow(
            user?.status == 'active'
                ? Icons.check_circle_outline_rounded
                : Icons.radio_button_unchecked_rounded,
            'Trạng thái',
            status,
            valueColor: user?.status == 'active' ? Colors.green : Colors.orange,
          ),
        ],
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

  // ─── Section label ───────────────────────────────────────────────────────────
  Widget _buildSectionLabel(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: _red,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  // ─── Settings tile ───────────────────────────────────────────────────────────
  Widget _buildTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool showArrow = true,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        splashColor: _red.withOpacity(0.06),
        highlightColor: _redLight.withOpacity(0.5),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: _redLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: _red),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            color: Color(0xFF1A1A1A),
                            fontSize: 14,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: TextStyle(
                            color: Colors.black.withOpacity(0.4),
                            fontSize: 12)),
                  ],
                ),
              ),
              if (showArrow)
                Icon(Icons.chevron_right_rounded,
                    color: _red.withOpacity(0.4), size: 20),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Logout Button ───────────────────────────────────────────────────────────
  Widget _buildLogoutButton() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          final confirm = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: const Text('Đăng xuất',
                  style: TextStyle(
                      color: Color(0xFF1A1A1A),
                      fontWeight: FontWeight.bold)),
              content: Text('Bạn có chắc muốn đăng xuất khỏi tài khoản?',
                  style: TextStyle(color: Colors.black.withOpacity(0.55))),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text('Hủy',
                      style:
                          TextStyle(color: Colors.black.withOpacity(0.4))),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _red,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Đăng xuất',
                      style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
          if (confirm == true && mounted) {
            await authProvider.logout();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _red.withOpacity(0.4)),
            color: _redLight,
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.logout_rounded, color: _red, size: 20),
              SizedBox(width: 10),
              Text('Đăng xuất',
                  style: TextStyle(
                      color: _red,
                      fontWeight: FontWeight.bold,
                      fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}
