import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/schedule_model.dart';
import '../providers/schedule_provider.dart';
import '../providers/auth_provider.dart';
import '../config/design_tokens.dart';
import '../config/shimmer.dart';

class StudentScheduleScreen extends StatefulWidget {
  const StudentScheduleScreen({super.key});

  @override
  State<StudentScheduleScreen> createState() => _StudentScheduleScreenState();
}

class _StudentScheduleScreenState extends State<StudentScheduleScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token != null) {
      await context.read<ScheduleProvider>().fetchSchedule(token);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ScheduleProvider>();
    final isTablet = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.ink),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Lịch học',
          style: TextStyle(
            color: AppColors.ink,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Week navigation
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: isTablet ? AppSpacing.xxl : AppSpacing.lg,
                vertical: isTablet ? AppSpacing.lg : AppSpacing.md,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () {
                      provider.goPreviousWeek();
                      final token = context.read<AuthProvider>().accessToken;
                      if (token != null) provider.fetchSchedule(token);
                    },
                    child: const Icon(Icons.chevron_left, color: AppColors.textTertiary),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Flexible(
                    child: GestureDetector(
                      onTap: () {
                        provider.goCurrentWeek();
                        final token = context.read<AuthProvider>().accessToken;
                        if (token != null) provider.fetchSchedule(token);
                      },
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.25),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Text(
                            provider.weekDisplay,
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  GestureDetector(
                    onTap: () {
                      provider.goNextWeek();
                      final token = context.read<AuthProvider>().accessToken;
                      if (token != null) provider.fetchSchedule(token);
                    },
                    child: const Icon(Icons.chevron_right, color: AppColors.textTertiary),
                  ),
                ],
              ),
            ),

          if (provider.authRequired)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: const Color(0xFFFFE58F)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: AppColors.warning, size: 18),
                  const SizedBox(width: AppSpacing.sm),
                  const Expanded(
                    child: Text(
                      'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                      style: TextStyle(fontSize: 12, color: Color(0xFFD48806)),
                    ),
                  ),
                ],
              ),
            ),

          if (provider.isLoading)
            const Expanded(
              child: ShimmerList(),
            )
          else if (provider.items.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.calendar_today, size: 48, color: AppColors.border),
                    const SizedBox(height: AppSpacing.md),
                    const Text(
                      'Không có lịch học trong tuần này',
                      style: TextStyle(fontSize: 14, color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView.builder(
                  padding: EdgeInsets.symmetric(
                    horizontal: isTablet ? AppSpacing.xxl : AppSpacing.lg,
                  ),
                  itemCount: provider.items.length,
                  itemBuilder: (context, index) {
                    final item = provider.items[index];
                    return _SessionCard(item: item);
                  },
                ),
              ),
            ),
        ],
      ),
      ),
    );
  }
}

class _SessionCard extends StatefulWidget {
  final SessionItem item;
  const _SessionCard({required this.item});

  @override
  State<_SessionCard> createState() => _SessionCardState();
}

class _SessionCardState extends State<_SessionCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppDuration.fast,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.97).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) => _controller.reverse(),
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        ),
        child: _buildCard(),
      ),
    );
  }

  Widget _buildCard() {
    final attendance = widget.item.attendance;
    Color attColor;
    String attLabel;
    Color attDotColor;

    if (attendance.isPresent) {
      attColor = AppColors.successBg;
      attLabel = 'Có mặt';
      attDotColor = AppColors.success;
    } else if (attendance.isAbsent) {
      attColor = AppColors.errorBg;
      attLabel = 'Vắng';
      attDotColor = AppColors.error;
    } else {
      attColor = AppColors.surface;
      attLabel = 'Chưa học';
      attDotColor = AppColors.disabled;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text(
                  widget.item.slotLabel,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  widget.item.dateDisplay,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: attColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: attDotColor.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: attDotColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      attLabel,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: attDotColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            widget.item.courseName,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.access_time, size: 13, color: AppColors.textTertiary),
              const SizedBox(width: AppSpacing.xs),
              Text(
                '${widget.item.startTime} - ${widget.item.endTime}',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Icon(
                Icons.person_outline,
                size: 13,
                color: AppColors.textTertiary,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  widget.item.teacher,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textTertiary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
