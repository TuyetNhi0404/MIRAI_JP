import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
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
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  final _nameController = TextEditingController();
  bool _isEditing = false;
  bool _isSaving = false;
  String _currentLanguage = 'Tiếng Việt';

  static const _red = Color(0xFFB90000);
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
}
