import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_provider.dart';
import '../../models/calendar_model.dart';
import '../../config/design_tokens.dart';
import '../../config/shimmer.dart';
import 'teacher_attendance_screen.dart';

class TeacherScheduleScreen extends StatefulWidget {
  const TeacherScheduleScreen({super.key});

  @override
  State<TeacherScheduleScreen> createState() => _TeacherScheduleScreenState();
}

class _TeacherScheduleScreenState extends State<TeacherScheduleScreen> {
  late DateTime _currentMonday;

  @override
  void initState() {
    super.initState();
    _currentMonday = _getMonday(DateTime.now());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedule();
    });
  }

  static DateTime _getMonday(DateTime date) {
    return DateTime(date.year, date.month, date.day - (date.weekday - 1));
  }

  Future<void> _loadSchedule() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.accessToken != null) {
      final start = DateTime(_currentMonday.year, _currentMonday.month, _currentMonday.day);
      final end = start.add(const Duration(days: 7));
      await Provider.of<TeacherProvider>(context, listen: false).loadWeekSchedule(
        auth.accessToken!,
        start.toIso8601String(),
        end.toIso8601String(),
      );
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

  String get _weekDisplay {
    final start = _currentMonday;
    final end = DateTime(start.year, start.month, start.day + 6);
    return '${start.day}/${start.month}/${start.year} – ${end.day}/${end.month}/${end.year}';
  }

  void _goPreviousWeek() {
    setState(() {
      _currentMonday = _currentMonday.subtract(const Duration(days: 7));
    });
    _loadSchedule();
  }

  void _goNextWeek() {
    setState(() {
      _currentMonday = _currentMonday.add(const Duration(days: 7));
    });
    _loadSchedule();
  }

  Widget _buildWeekdaysSelector() {
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
                onPressed: _goPreviousWeek,
              ),
              Text(
                _getMonthYearDisplay(_currentMonday),
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: AppColors.ink),
                onPressed: _goNextWeek,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (index) {
              final date = _currentMonday.add(Duration(days: index));
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
    final provider = Provider.of<TeacherProvider>(context);
    final isTablet = MediaQuery.of(context).size.width > 768;

    final grouped = <String, List<CalendarModel>>{};
    for (final item in provider.weekCalendars) {
      String cleanDate = item.date;
      if (cleanDate.contains('T')) {
        cleanDate = cleanDate.split('T')[0];
      }
      grouped.putIfAbsent(cleanDate, () => []).add(item);
    }
    final dates = grouped.keys.toList()..sort();

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
                'Current week: $_weekDisplay',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            _buildWeekdaysSelector(),
            if (provider.isLoading)
              const Expanded(
                child: ShimmerList(),
              )
            else if (provider.weekCalendars.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.calendar_today, size: 48, color: AppColors.border),
                      const SizedBox(height: AppSpacing.md),
                      const Text(
                        'Không có lịch giảng dạy trong tuần này',
                        style: TextStyle(fontSize: 14, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _loadSchedule,
                  child: ListView.builder(
                    padding: EdgeInsets.symmetric(
                      horizontal: isTablet ? AppSpacing.xxl : AppSpacing.lg,
                    ),
                    itemCount: dates.length,
                    itemBuilder: (context, index) {
                      final dateStr = dates[index];
                      final sessions = grouped[dateStr]!;
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
                                    children: sessions.map((item) => _TeacherSessionCard(calendar: item)).toList(),
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
              ),
          ],
        ),
      ),
    );
  }
}

class _TeacherSessionCard extends StatefulWidget {
  final CalendarModel calendar;
  const _TeacherSessionCard({required this.calendar});

  @override
  State<_TeacherSessionCard> createState() => _TeacherSessionCardState();
}

class _TeacherSessionCardState extends State<_TeacherSessionCard>
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
    final status = widget.calendar.status;
    Color statusColor;
    String statusLabel;
    Color statusBgColor;

    if (status == 'completed') {
      statusColor = AppColors.success;
      statusBgColor = AppColors.successBg;
      statusLabel = 'COMPLETED';
    } else {
      statusColor = AppColors.warning;
      statusBgColor = AppColors.warningBg;
      statusLabel = 'SCHEDULED';
    }

    Color accentColor = status == 'completed'
        ? AppColors.success
        : const Color(0xFFE28743); // Orange accent for scheduled sessions

    Color slotBg = status == 'completed'
        ? AppColors.successBg
        : const Color(0xFFFFF3E0);

    Color slotText = status == 'completed'
        ? AppColors.success
        : const Color(0xFFE28743);

    final room = (widget.calendar.sessionId is Map) ? widget.calendar.sessionId['room'] : null;

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
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => TeacherAttendanceScreen(calendar: widget.calendar),
                ),
              );
            },
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
                          child: const Text(
                            'Ca học',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFE28743),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.calendar.startTime,
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
                          widget.calendar.endTime,
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
                              'Room ${room ?? "N/A"}',
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
                            widget.calendar.courseName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.ink,
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Session/Lesson name
                          if (widget.calendar.sessionName.isNotEmpty)
                            Text(
                              'Session: ${widget.calendar.sessionName}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          // Lecturer name
                          Text(
                            'Lecturer: ${widget.calendar.teacherName}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Badges row
                          Row(
                            children: [
                              // Status badge
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
                              // Attendance/Điểm danh Badge
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
                                  'Roll Call',
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
        ),
      ),
    );
  }
}
