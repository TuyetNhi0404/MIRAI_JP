import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/statistics_models.dart';

class StudentStatisticsScreen extends StatefulWidget {
  const StudentStatisticsScreen({super.key});

  @override
  State<StudentStatisticsScreen> createState() => _StudentStatisticsScreenState();
}

class _StudentStatisticsScreenState extends State<StudentStatisticsScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();

  CourseData? _course;
  StudentCourseStatistics? _statistics;
  bool _isLoading = true;
  String? _error;
  late TabController _tabController;

  static const Color _primary = Color(0xFFB90000);
  static const Color _bg = Color(0xFFFAF8F5);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.accessToken;
    final user = auth.user;

    if (token == null || user == null) {
      setState(() {
        _error = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
        _isLoading = false;
      });
      return;
    }

    try {
      // Step 1: fetch enrolled courses
      final courses = await _apiService.fetchStudentCourses(token);
      if (courses.isEmpty) {
        setState(() {
          _error = 'Bạn chưa tham gia khóa học nào.';
          _isLoading = false;
        });
        return;
      }

      final courseJson = courses.first;
      final course = CourseData.fromJson(courseJson);
      setState(() => _course = course);

      // Step 2: fetch statistics
      try {
        final statsJson = await _apiService.fetchStudentCourseStatistics(
            token, user.id, course.id);
        if (statsJson != null) {
          setState(() => _statistics = StudentCourseStatistics.fromJson(statsJson));
        }
      } catch (e) {
        setState(() => _error = 'Không thể tải dữ liệu thống kê: ${e.toString()}');
      }
    } catch (e) {
      setState(() => _error = 'Không thể tải dữ liệu: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getStatusText(String? status) {
    switch (status) {
      case 'in_progress':
        return 'Đang học';
      case 'not_yet':
        return 'Chưa bắt đầu';
      case 'complete':
        return 'Hoàn thành';
      default:
        return 'Chưa học';
    }
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'in_progress':
        return Colors.amber.shade700;
      case 'complete':
        return Colors.green.shade700;
      default:
        return Colors.grey.shade600;
    }
  }

  Color _getStatusBg(String? status) {
    switch (status) {
      case 'in_progress':
        return Colors.amber.shade50;
      case 'complete':
        return Colors.green.shade50;
      default:
        return Colors.grey.shade100;
    }
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  String _formatDateTime(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return 'Chưa cập nhật';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} '
          '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        title: const Text(
          'THỐNG KÊ KẾT QUẢ',
          style: TextStyle(
            color: Color(0xFF023665),
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: _primary),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFEEEEEE)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _primary),
            onPressed: _loadData,
            tooltip: 'Làm mới',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _primary))
          : _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_error != null && _course == null) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      color: _primary,
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Course Info Card
            if (_course != null) _buildCourseCard(),
            const SizedBox(height: 16),

            // Error banner if stats failed but course loaded
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.red.shade400, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                    ),
                  ],
                ),
              ),

            // Statistics sections
            if (_statistics != null) ...[
              _buildGPASummaryCard(),
              const SizedBox(height: 16),
              _buildTabBar(),
              const SizedBox(height: 16),
              _buildTabContent(),
              const SizedBox(height: 16),
              _buildFooterTimestamp(),
            ] else if (_error == null)
              _buildEmptyState(),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFFFEDED),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.bar_chart_rounded, color: _primary, size: 44),
            ),
            const SizedBox(height: 20),
            const Text(
              'Chưa có dữ liệu thống kê',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Bạn chưa tham gia khóa học nào hoặc chưa có dữ liệu học tập.',
              style: const TextStyle(fontSize: 13, color: Colors.black45),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCourseCard() {
    final course = _course!;
    final startStr = _formatDate(course.startDate);
    final endStr = _formatDate(course.endDate);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: _primary, width: 4)),
        boxShadow: [
          BoxShadow(
            color: _primary.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    if (course.description != null && course.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        course.description!,
                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (course.homeroomTeacher != null &&
                        course.homeroomTeacher!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(fontSize: 12, color: Colors.black54),
                          children: [
                            const TextSpan(
                                text: 'Giáo viên chủ nhiệm: ',
                                style: TextStyle(fontWeight: FontWeight.bold)),
                            TextSpan(text: course.homeroomTeacher),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: _getStatusBg(course.status),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _getStatusColor(course.status).withOpacity(0.4),
                  ),
                ),
                child: Text(
                  _getStatusText(course.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: _getStatusColor(course.status),
                  ),
                ),
              ),
            ],
          ),
          if (startStr.isNotEmpty || endStr.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0xFFEEEEEE)),
            const SizedBox(height: 10),
            Row(
              children: [
                if (startStr.isNotEmpty)
                  Expanded(
                    child: _buildDateChip('Bắt đầu', startStr, Icons.event_rounded),
                  ),
                if (endStr.isNotEmpty)
                  Expanded(
                    child: _buildDateChip('Kết thúc', endStr, Icons.event_busy_rounded),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDateChip(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.black38),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.black38)),
            Text(value,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1A1A1A))),
          ],
        ),
      ],
    );
  }

  Widget _buildGPASummaryCard() {
    final stats = _statistics!;
    final fs = stats.finalScore;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFB90000), Color(0xFF8B0000)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background icon
          Positioned(
            right: -10,
            bottom: -10,
            child: Opacity(
              opacity: 0.1,
              child: Icon(Icons.emoji_events_rounded, size: 120, color: Colors.white),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.emoji_events_rounded,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ĐIỂM TỔNG KẾT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white70,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        fs.finalScore.toStringAsFixed(2),
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                height: 1,
                color: Colors.white.withOpacity(0.2),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildGPABadge(
                      label: 'XẾP LOẠI',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          fs.grade,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: _primary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: _buildGPABadge(
                      label: 'TRẠNG THÁI',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: fs.passed ? Colors.green.shade400 : Colors.red.shade400,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          fs.passed ? 'Đạt' : 'Trượt',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: _buildGPABadge(
                      label: 'XẾP HẠNG LỚP',
                      child: Text(
                        '${fs.rank} / ${fs.totalStudents}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGPABadge({required String label, required Widget child}) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            color: Colors.white60,
            letterSpacing: 0.5,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

  Widget _buildTabBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      padding: const EdgeInsets.all(4),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: _primary,
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: Colors.white,
        unselectedLabelColor: Colors.black54,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
        dividerColor: Colors.transparent,
        tabs: const [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.bar_chart_rounded, size: 16),
                SizedBox(width: 6),
                Flexible(child: Text('Chi tiết điểm số', overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.trending_up_rounded, size: 16),
                SizedBox(width: 6),
                Flexible(child: Text('Phân tích trực quan', overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return AnimatedBuilder(
      animation: _tabController,
      builder: (context, _) {
        if (_tabController.index == 0) {
          return _buildScoreDetailTab();
        } else {
          return _buildVisualTab();
        }
      },
    );
  }

  Widget _buildScoreDetailTab() {
    final sc = _statistics!.scoreComponent;
    final fw = _statistics!.finalScore.weights;

    final attPct = sc.attendanceDetails.percentage;
    final asgTotal = sc.assignmentDetails.totalAssignments;
    final asgDone = sc.assignmentDetails.gradedAssignments;
    final asgPct = asgTotal > 0 ? (asgDone / asgTotal * 100) : 0.0;
    final qzTotal = sc.quizDetails.totalQuizzes;
    final qzDone = sc.quizDetails.completedQuizzes;
    final qzPct = qzTotal > 0 ? (qzDone / qzTotal * 100) : 0.0;

    return Column(
      children: [
        // Attendance card
        _buildScoreCard(
          icon: Icons.check_circle_outline_rounded,
          iconColor: Colors.orange.shade600,
          iconBg: Colors.orange.shade50,
          title: 'Điểm danh chuyên cần',
          score: sc.attendanceScore,
          scoreColor: Colors.orange.shade600,
          details: [
            _DetailRow('Tổng số ca học', '${sc.attendanceDetails.totalSessions} buổi', null),
            _DetailRow('Có mặt', '${sc.attendanceDetails.presentCount} buổi', Colors.green.shade600),
            _DetailRow('Vắng mặt', '${sc.attendanceDetails.absentCount} buổi', Colors.red.shade400),
          ],
          progressLabel: 'Tỷ lệ chuyên cần',
          progressValue: attPct / 100,
          progressPct: attPct,
          progressColor: Colors.orange.shade500,
          weightLabel: '${fw.attendance}%',
        ),
        const SizedBox(height: 14),

        // Assignments card
        _buildScoreCard(
          icon: Icons.book_outlined,
          iconColor: _primary,
          iconBg: const Color(0xFFFFEDED),
          title: 'Bài tập về nhà',
          score: sc.assignmentScore,
          scoreColor: _primary,
          details: [
            _DetailRow('Tổng số bài giao', '${sc.assignmentDetails.totalAssignments} bài', null),
            _DetailRow('Đã chấm điểm', '${sc.assignmentDetails.gradedAssignments} bài', _primary),
            _DetailRow('Điểm trung bình', sc.assignmentDetails.averageScore.toStringAsFixed(1), null),
          ],
          progressLabel: 'Tỷ lệ hoàn thành',
          progressValue: asgPct / 100,
          progressPct: asgPct.toDouble(),
          progressColor: _primary,
          weightLabel: '${fw.assignment}%',
        ),
        const SizedBox(height: 14),

        // Quizzes card
        _buildScoreCard(
          icon: Icons.quiz_outlined,
          iconColor: Colors.green.shade700,
          iconBg: Colors.green.shade50,
          title: 'Bài kiểm tra & Quizzes',
          score: sc.quizScore,
          scoreColor: Colors.green.shade700,
          details: [
            _DetailRow('Tổng số đề kiểm tra', '${sc.quizDetails.totalQuizzes} đề', null),
            _DetailRow('Đã thực hiện', '${sc.quizDetails.completedQuizzes} đề', Colors.green.shade700),
            _DetailRow('Điểm trung bình', sc.quizDetails.averageScore.toStringAsFixed(1), null),
          ],
          progressLabel: 'Tỷ lệ làm bài',
          progressValue: qzPct / 100,
          progressPct: qzPct.toDouble(),
          progressColor: Colors.green.shade600,
          weightLabel: '${fw.quiz}%',
        ),
      ],
    );
  }

  Widget _buildScoreCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required double score,
    required Color scoreColor,
    required List<_DetailRow> details,
    required String progressLabel,
    required double progressValue,
    required double progressPct,
    required Color progressColor,
    required String weightLabel,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                score.toStringAsFixed(1),
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: scoreColor),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 5, left: 3),
                child: Text('/ 10', style: TextStyle(fontSize: 13, color: Colors.black38, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Divider(height: 20, color: Color(0xFFEEEEEE)),
          for (final d in details)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(d.label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  Text(
                    d.value,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: d.valueColor ?? const Color(0xFF1A1A1A),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFEEEEEE)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(progressLabel, style: const TextStyle(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w500)),
              Text('${progressPct.toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progressValue.clamp(0.0, 1.0),
              backgroundColor: const Color(0xFFEEEEEE),
              color: progressColor,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _bg,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFDDDDDD)),
            ),
            child: Text(
              'Trọng số: $weightLabel',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black45, letterSpacing: 0.3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisualTab() {
    final sc = _statistics!.scoreComponent;
    final fw = _statistics!.finalScore.weights;

    final barData = [
      _BarItem('Điểm danh', sc.attendanceScore, fw.attendance.toDouble(), Colors.orange.shade400),
      _BarItem('Bài tập', sc.assignmentScore, fw.assignment.toDouble(), _primary),
      _BarItem('Kiểm tra', sc.quizScore, fw.quiz.toDouble(), Colors.green.shade600),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Score comparison bar chart
        _buildChartCard(
          title: 'So sánh điểm thành phần (thang 10)',
          child: SizedBox(
            height: 200,
            child: CustomPaint(
              painter: _BarChartPainter(
                items: barData,
                maxY: 10.0,
                barColor: true,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Weight breakdown
        _buildChartCard(
          title: 'Cơ cấu tỷ trọng điểm (%)',
          child: Column(
            children: [
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildWeightBar(
                      fw.attendance.toDouble(),
                      fw.attendance + fw.assignment + fw.quiz.toDouble(),
                      'Điểm danh',
                      Colors.orange.shade400,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildWeightBar(
                      fw.assignment.toDouble(),
                      fw.attendance + fw.assignment + fw.quiz.toDouble(),
                      'Bài tập',
                      _primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildWeightBar(
                      fw.quiz.toDouble(),
                      fw.attendance + fw.assignment + fw.quiz.toDouble(),
                      'Kiểm tra',
                      Colors.green.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Legend
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 16,
                children: [
                  _buildLegendItem('Điểm danh (${fw.attendance}%)', Colors.orange.shade400),
                  _buildLegendItem('Bài tập (${fw.assignment}%)', _primary),
                  _buildLegendItem('Kiểm tra (${fw.quiz}%)', Colors.green.shade600),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWeightBar(double value, double total, String label, Color color) {
    final pct = total > 0 ? value / total : 0.0;
    return Row(
      children: [
        SizedBox(
          width: 72,
          child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: const Color(0xFFEEEEEE),
              color: color,
              minHeight: 14,
            ),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 36,
          child: Text(
            '${value.toInt()}%',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  Widget _buildChartCard({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3)),
        ),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
      ],
    );
  }

  Widget _buildFooterTimestamp() {
    final lastCalc = _statistics?.scoreComponent.lastCalculated;
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        const Icon(Icons.access_time_rounded, size: 14, color: Colors.black38),
        const SizedBox(width: 4),
        Text(
          'Tính lần cuối: ${_formatDateTime(lastCalc)}',
          style: const TextStyle(fontSize: 11, color: Colors.black38),
        ),
      ],
    );
  }
}

// --- Helper classes ---

class _DetailRow {
  final String label;
  final String value;
  final Color? valueColor;
  const _DetailRow(this.label, this.value, this.valueColor);
}

class _BarItem {
  final String label;
  final double actualScore;
  final double weight;
  final Color color;
  const _BarItem(this.label, this.actualScore, this.weight, this.color);
}

// --- Custom Bar Chart Painter ---

class _BarChartPainter extends CustomPainter {
  final List<_BarItem> items;
  final double maxY;
  final bool barColor;

  _BarChartPainter({required this.items, this.maxY = 10.0, this.barColor = false});

  @override
  void paint(Canvas canvas, Size size) {
    const double paddingLeft = 32;
    const double paddingBottom = 36;
    const double paddingTop = 12;
    final double chartH = size.height - paddingBottom - paddingTop;
    final double chartW = size.width - paddingLeft;

    final axisLinePaint = Paint()
      ..color = const Color(0xFFEEEEEE)
      ..strokeWidth = 1;
    final textStyle = const TextStyle(fontSize: 10, color: Colors.black38);
    final tp = TextPainter(textDirection: TextDirection.ltr);

    // Draw horizontal grid lines
    for (int i = 0; i <= 5; i++) {
      final y = paddingTop + chartH * (1 - i / 5);
      canvas.drawLine(Offset(paddingLeft, y), Offset(size.width, y), axisLinePaint);
      // Y axis labels
      tp.text = TextSpan(text: (maxY * i / 5).toStringAsFixed(0), style: textStyle);
      tp.layout();
      tp.paint(canvas, Offset(0, y - tp.height / 2));
    }

    if (items.isEmpty) return;

    final double groupW = chartW / items.length;
    const double barPad = 18;
    final double barW = math.max(groupW - barPad * 2, 4);

    for (int i = 0; i < items.length; i++) {
      final item = items[i];
      final double x = paddingLeft + groupW * i + barPad;

      // Draw score bar
      final double barH = chartH * (item.actualScore / maxY).clamp(0.0, 1.0);
      final barRect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, paddingTop + chartH - barH, barW, barH),
        const Radius.circular(4),
      );
      canvas.drawRRect(barRect, Paint()..color = item.color);

      // Value label on top of bar
      tp.text = TextSpan(
        text: item.actualScore.toStringAsFixed(1),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: item.color),
      );
      tp.layout();
      final labelX = x + barW / 2 - tp.width / 2;
      final labelY = paddingTop + chartH - barH - tp.height - 2;
      if (labelY > paddingTop) tp.paint(canvas, Offset(labelX, labelY));

      // X axis label
      tp.text = TextSpan(text: item.label, style: textStyle);
      tp.layout();
      tp.paint(canvas,
          Offset(x + barW / 2 - tp.width / 2, paddingTop + chartH + 6));
    }
  }

  @override
  bool shouldRepaint(_BarChartPainter oldDelegate) => false;
}
