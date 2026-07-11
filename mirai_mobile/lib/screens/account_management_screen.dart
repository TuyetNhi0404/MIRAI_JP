import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/account_model.dart';
import '../providers/account_provider.dart';
import '../providers/auth_provider.dart';
import '../config/design_tokens.dart';
import '../config/shimmer.dart';

void _showTopToast(BuildContext context, String message, Color color) {
  OverlayEntry entry;
  entry = OverlayEntry(
    builder: (ctx) => Positioned(
      top: MediaQuery.of(ctx).padding.top + 8,
      left: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: SafeArea(
          bottom: false,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, 4)),
              ],
            ),
            child: Text(message, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ),
      ),
    ),
  );
  Overlay.of(context).insert(entry);
  Future.delayed(const Duration(seconds: 2), entry.remove);
}

class AccountManagementScreen extends StatefulWidget {
  const AccountManagementScreen({super.key});

  @override
  State<AccountManagementScreen> createState() => _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token != null) {
      await context.read<AccountProvider>().fetchUsers(token);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AccountProvider>();
    final token = context.watch<AuthProvider>().accessToken;
    final isTablet = MediaQuery.of(context).size.width > 768;
    final hPad = isTablet ? AppSpacing.xxl : AppSpacing.lg;

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.ink, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Quản lý tài khoản',
          style: TextStyle(color: AppColors.ink, fontSize: 17, fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatsRow(provider, isTablet),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: hPad),
              child: _buildRoleSegmented(provider),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(hPad, AppSpacing.lg, hPad, 0),
              child: _buildSearchField(provider),
            ),
            SizedBox(height: isTablet ? AppSpacing.lg : AppSpacing.md),
            Expanded(child: _buildBody(provider, token, isTablet)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(AccountProvider provider, bool isTablet) {
    final stats = [
      _StatData('Học viên', provider.studentCount, Icons.people_outline, AppColors.info),
      _StatData('Giáo viên', provider.teacherCount, Icons.school_outlined, AppColors.primary),
      _StatData('Quản trị', provider.adminCount, Icons.admin_panel_settings_outlined, AppColors.success),
    ];
    return Padding(
      padding: EdgeInsets.fromLTRB(isTablet ? AppSpacing.xxl : AppSpacing.lg, AppSpacing.lg, isTablet ? AppSpacing.xxl : AppSpacing.lg, AppSpacing.md),
      child: Row(
        children: stats.map((s) => Expanded(child: _StatCard(data: s))).toList(),
      ),
    );
  }

  Widget _buildRoleSegmented(AccountProvider provider) {
    final roles = [
      ('Giáo viên', 'teacher'),
      ('Học viên', 'student'),
      ('Quản trị', 'admin'),
    ];
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      padding: const EdgeInsets.all(3),
      child: Row(
        children: roles.map((r) {
          final selected = provider.selectedRole == r.$2;
          return Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: selected ? AppColors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                boxShadow: selected
                    ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 1))]
                    : null,
              ),
              child: AnimatedContainer(
                duration: AppDuration.fast,
                padding: const EdgeInsets.symmetric(vertical: 9),
                child: InkWell(
                  onTap: () => provider.setRole(r.$2),
                  borderRadius: BorderRadius.circular(6),
                  child: Text(
                    r.$1,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color: selected ? AppColors.ink : AppColors.textTertiary,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSearchField(AccountProvider provider) {
    return TextField(
      controller: _searchController,
      focusNode: _searchFocus,
      onChanged: (v) => provider.setSearch(v),
      decoration: InputDecoration(
        hintText: 'Tìm kiếm theo tên hoặc email...',
        hintStyle: const TextStyle(color: AppColors.disabled, fontSize: 13),
        prefixIcon: const Icon(Icons.search, color: AppColors.disabled, size: 20),
        suffixIcon: _searchController.text.isNotEmpty
            ? GestureDetector(
                onTap: () {
                  _searchController.clear();
                  provider.setSearch('');
                  _searchFocus.unfocus();
                },
                child: Icon(Icons.cancel_outlined, color: AppColors.disabled, size: 18),
              )
            : null,
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 11),
      ),
    );
  }

  Widget _buildBody(AccountProvider provider, String? token, bool isTablet) {
    if (provider.isLoading) return const ShimmerList();

    if (provider.users.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.people_outline, size: 40, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.xl),
            const Text('Không tìm thấy người dùng', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.ink)),
            const SizedBox(height: AppSpacing.sm),
            Text('Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm', style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: EdgeInsets.symmetric(horizontal: isTablet ? AppSpacing.xxl : AppSpacing.lg),
        itemCount: provider.users.length,
        itemBuilder: (context, index) {
          final user = provider.users[index];
          return _UserCard(user: user, token: token!, provider: provider);
        },
      ),
    );
  }
}

class _StatData {
  final String label;
  final int count;
  final IconData icon;
  final Color color;
  _StatData(this.label, this.count, this.icon, this.color);
}

class _StatCard extends StatelessWidget {
  final _StatData data;
  const _StatCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.width > 768;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: EdgeInsets.symmetric(vertical: isTablet ? 18 : 14, horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: data.color.withValues(alpha: 0.12)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [data.color.withValues(alpha: 0.06), data.color.withValues(alpha: 0.02)],
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: data.color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(data.icon, color: data.color, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            data.count.toString(),
            style: TextStyle(
              color: data.color,
              fontSize: isTablet ? 24 : 20,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            data.label,
            style: TextStyle(
              color: data.color.withValues(alpha: 0.7),
              fontSize: isTablet ? 11 : 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _UserCard extends StatefulWidget {
  final AccountUser user;
  final String token;
  final AccountProvider provider;

  const _UserCard({required this.user, required this.token, required this.provider});

  @override
  State<_UserCard> createState() => _UserCardState();
}

class _UserCardState extends State<_UserCard> {
  double _scale = 1.0;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final isActive = user.status == 'active';
    final isTablet = MediaQuery.of(context).size.width > 768;

    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.98),
      onTapUp: (_) => setState(() => _scale = 1.0),
      onTapCancel: () => setState(() => _scale = 1.0),
      child: AnimatedScale(
        scale: _scale,
        duration: AppDuration.fast,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: EdgeInsets.all(isTablet ? AppSpacing.lg : 14),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadow.card,
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: isTablet ? 26 : 22,
                backgroundColor: AppColors.primaryLight,
                child: Text(
                  (user.name.isNotEmpty ? user.name[0] : 'U').toUpperCase(),
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: isTablet ? 18 : 15,
                  ),
                ),
              ),
              SizedBox(width: isTablet ? 14 : 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: isTablet ? 15 : 14,
                        color: AppColors.ink,
                        height: 1.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user.email,
                      style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    _buildRoleBadge(user.role),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _buildStatusBadge(isActive),
                  const SizedBox(height: 8),
                  _buildLockButton(user, isActive),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleBadge(String role) {
    String label;
    Color color;
    if (role == 'admin') {
      label = 'Quản trị';
      color = AppColors.success;
    } else if (role == 'teacher') {
      label = 'Giáo viên';
      color = AppColors.info;
    } else {
      label = 'Học viên';
      color = AppColors.warning;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color, height: 1.4),
      ),
    );
  }

  Widget _buildStatusBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isActive ? AppColors.successBg : AppColors.errorBg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: isActive ? const Color(0xFFB7EB8F) : const Color(0xFFFFA39E)),
      ),
      child: Text(
        isActive ? 'Hoạt động' : 'Đã khóa',
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: isActive ? AppColors.success : AppColors.error,
          height: 1.2,
        ),
      ),
    );
  }

  Widget _buildLockButton(AccountUser user, bool isActive) {
    return GestureDetector(
      onTap: _loading ? null : () async {
        setState(() => _loading = true);
        try {
          await widget.provider.toggleStatus(widget.token, user.id, isActive);
          if (context.mounted) {
            _showTopToast(
              context,
              isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
              isActive ? AppColors.error : AppColors.success,
            );
          }
        } catch (e) {
          if (context.mounted) {
            _showTopToast(context, 'Lỗi: $e', AppColors.error);
          }
        } finally {
          if (context.mounted) setState(() => _loading = false);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isActive ? AppColors.surface : AppColors.primaryLight,
          borderRadius: BorderRadius.circular(8),
        ),
        child: _loading
            ? SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  color: isActive ? AppColors.error : AppColors.success,
                ),
              )
            : Icon(
                isActive ? Icons.lock_outline : Icons.lock_open,
                color: isActive ? AppColors.textTertiary : AppColors.primary,
                size: 16,
              ),
      ),
    );
  }
}
