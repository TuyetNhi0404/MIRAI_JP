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

  DateTime? _parseDate(String dateStr) {
    try {
      String cleanDate = dateStr;
      if (cleanDate.contains('T')) {
        cleanDate = cleanDate.split('T')[0];
      }
      final parts = cleanDate.split('-');
      if (parts.length == 3) {
        return DateTime(
          int.parse(parts[0]),
          int.parse(parts[1]),
          int.parse(parts[2]),
        );
      }
    } catch (_) {}
    return null;
  }

  String _getWeekdayLabel(DateTime date) {
    switch (date.weekday) {
      case DateTime.monday:
        return 'Mon';
      case DateTime.tuesday:
        return 'Tue';
      case DateTime.wednesday:
        return 'Wed';
      case DateTime.thursday:
        return 'Thu';
      case DateTime.friday:
        return 'Fri';
      case DateTime.saturday:
        return 'Sat';
      case DateTime.sunday:
        return 'Sun';
      default:
        return '';
    }
  }

  String _getMonthYearDisplay(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }



  Widget _buildWeekdaysSelector(ScheduleProvider provider) {
    final startOfWeek = provider.currentMonday;
    final weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final today = DateTime.now();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left, color: AppColors.ink),
                onPressed: () {
                  provider.goPreviousWeek();
                  final token = context.read<AuthProvider>().accessToken;
                  if (token != null) provider.fetchSchedule(token, silent: true);
                },
              ),
              Text(
                _getMonthYearDisplay(startOfWeek),
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: AppColors.ink),
                onPressed: () {
                  provider.goNextWeek();
                  final token = context.read<AuthProvider>().accessToken;
                  if (token != null) provider.fetchSchedule(token, silent: true);
                },
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (index) {
              final date = startOfWeek.add(Duration(days: index));
              final label = weekdayNames[index];
              final isToday = date.year == today.year &&
                  date.month == today.month &&
                  date.day == today.day;

              return Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        color: isToday ? AppColors.ink : AppColors.textTertiary,
                        fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isToday ? AppColors.ink : Colors.transparent,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        date.day.toString(),
                        style: TextStyle(
                          fontSize: 13,
                          color: isToday ? AppColors.white : AppColors.ink,
                          fontWeight: isToday ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                    if (isToday) ...[
                      const SizedBox(height: 4),
                      Container(
                        width: 4,
                        height: 4,
                        decoration: const BoxDecoration(
                          color: AppColors.ink,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
          ),
        ),
        const Divider(height: 16, thickness: 1, color: AppColors.border),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ScheduleProvider>();
    final isTablet = MediaQuery.of(context).size.width > 768;

    final grouped = <String, List<SessionItem>>{};
    for (final item in provider.items) {
      grouped.putIfAbsent(item.dateDisplay, () => []).add(item);
    }
    final dates = grouped.keys.toList();

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Weekly timetable',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, bottom: 4),
              child: Text(
                'Current week: ${provider.weekDisplay}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            _buildWeekdaysSelector(provider),

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
                  itemCount: dates.length,
                  itemBuilder: (context, index) {
                    final dateDisplay = dates[index];
                    final sessions = grouped[dateDisplay]!;
                    final firstSession = sessions.first;
                    final parsedDate = _parseDate(firstSession.date);
                    final dayText = parsedDate != null ? '${parsedDate.day}/${parsedDate.month}' : '';
                    final weekdayLabel = parsedDate != null ? _getWeekdayLabel(parsedDate) : '';

                    return Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 50,
                                padding: const EdgeInsets.only(top: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Text(
                                      dayText,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.ink,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      weekdayLabel,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  children: sessions.map((item) => _SessionCard(item: item)).toList(),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (index < dates.length - 1)
                          const Divider(height: 1, thickness: 1, color: AppColors.border),
                      ],
                    );
                  },
                ),
              ),
            )
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
    Color statusColor;
    String statusLabel;
    Color statusBgColor;

    if (attendance.isPresent) {
      statusColor = AppColors.success;
      statusBgColor = AppColors.successBg;
      statusLabel = 'PRESENT';
    } else if (attendance.isAbsent) {
      statusColor = AppColors.error;
      statusBgColor = AppColors.errorBg;
      statusLabel = 'ABSENT';
    } else {
      statusColor = AppColors.textSecondary;
      statusBgColor = AppColors.surface;
      statusLabel = 'FUTURE';
    }

    Color accentColor = widget.item.attendance.isPresent
        ? AppColors.success
        : widget.item.attendance.isAbsent
            ? AppColors.error
            : const Color(0xFFE28743); // Orange accent for future/scheduled sessions

    Color slotBg = widget.item.attendance.isPresent
        ? AppColors.successBg
        : widget.item.attendance.isAbsent
            ? AppColors.errorBg
            : const Color(0xFFFFF3E0);

    Color slotText = widget.item.attendance.isPresent
        ? AppColors.success
        : widget.item.attendance.isAbsent
            ? AppColors.error
            : const Color(0xFFE28743);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.card,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left accent bar
              Container(
                width: 5,
                color: accentColor,
              ),
              const SizedBox(width: 12),
              // Time & Slot column
              Container(
                width: 75,
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: slotBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.item.slotLabel,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: slotText,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.item.startTime,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      '|',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppColors.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.item.endTime,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              // Separator line inside the card
              Container(
                width: 1,
                color: AppColors.border,
                margin: const EdgeInsets.symmetric(vertical: 12),
              ),
              // Details Column
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Room Banner
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F3F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Room ${widget.item.room ?? "N/A"}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.ink,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Course name
                      Text(
                        widget.item.courseName,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      // Session/Lesson name
                      if (widget.item.sessionName != null && widget.item.sessionName!.isNotEmpty)
                        Text(
                          'Session: ${widget.item.sessionName}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      // Teacher name
                      Text(
                        'Lecturer: ${widget.item.teacher}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Badges row
                      Row(
                        children: [
                          // Attendance badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: statusBgColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: statusColor.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Text(
                              statusLabel,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Materials/Tài liệu Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3E0),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFFFB74D).withValues(alpha: 0.4),
                              ),
                            ),
                            child: const Text(
                              'Materials',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFE28743),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
