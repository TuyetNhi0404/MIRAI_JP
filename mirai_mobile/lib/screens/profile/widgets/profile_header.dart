import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../models/user_model.dart';
import '../../../services/api_service.dart';
import '../../../providers/auth_provider.dart';

class AvatarCard extends StatefulWidget {
  final UserModel? user;
  final bool isEditing;
  final bool isSaving;
  final TextEditingController nameController;
  final VoidCallback onToggleEdit;
  final VoidCallback onSaveProfile;

  const AvatarCard({
    super.key,
    required this.user,
    required this.isEditing,
    required this.isSaving,
    required this.nameController,
    required this.onToggleEdit,
    required this.onSaveProfile,
  });

  @override
  State<AvatarCard> createState() => _AvatarCardState();
}

class _AvatarCardState extends State<AvatarCard> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  bool _isUploading = false;

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

  Future<void> _pickAndUploadImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    
    if (image != null) {
      setState(() => _isUploading = true);
      try {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final token = authProvider.accessToken;
        if (token == null) return;

        final response = await apiService.updateAvatar(token, image.path);
        final newAvatarUrl = response['data']['avatar'] as String;
        
        await authProvider.updateUserLocalAvatar(newAvatarUrl);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cập nhật ảnh đại diện thành công!'), backgroundColor: Colors.green),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lỗi tải ảnh: $e'), backgroundColor: _red),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isUploading = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final isEditing = widget.isEditing;
    final avatarUrl = user?.avatar;
    final userName = user?.name ?? 'Người dùng';
    final hasAvatar = avatarUrl != null && avatarUrl.isNotEmpty;

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
              GestureDetector(
                onTap: isEditing ? _pickAndUploadImage : null,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [_red, Color(0xFFFF6B6B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 48,
                    backgroundColor: _redLight,
                    backgroundImage: hasAvatar
                        ? NetworkImage(avatarUrl!)
                        : null,
                    child: !hasAvatar
                        ? Text(
                            (userName.isNotEmpty)
                                ? userName[0].toUpperCase()
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
              ),
              // Role badge icon or Camera icon
              if (isEditing)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: _red,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: _isUploading
                        ? const SizedBox(
                            width: 13,
                            height: 13,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.camera_alt_rounded, size: 13, color: Colors.white),
                  ),
                )
              else
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: _red,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Icon(_getRoleIcon(user?.role), size: 13, color: Colors.white),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Name
          isEditing
              ? TextField(
                  controller: widget.nameController,
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
                        borderSide: BorderSide(color: _red.withOpacity(0.3))),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: _red.withOpacity(0.25))),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: _red, width: 1.5)),
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
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
            children: isEditing
                ? [
                    OutlinedButton(
                      onPressed: widget.onToggleEdit,
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
                      onPressed: widget.isSaving ? null : widget.onSaveProfile,
                      icon: widget.isSaving
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
                      onPressed: widget.onToggleEdit,
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
}

class InfoCard extends StatelessWidget {
  final UserModel? user;

  const InfoCard({super.key, required this.user});

  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);

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

  @override
  Widget build(BuildContext context) {
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
}
