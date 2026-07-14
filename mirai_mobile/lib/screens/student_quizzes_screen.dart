import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/quiz_models.dart';
import 'take_quiz_screen.dart';
import 'quiz_result_screen.dart';

class StudentQuizzesScreen extends StatefulWidget {
  const StudentQuizzesScreen({super.key});

  @override
  State<StudentQuizzesScreen> createState() => _StudentQuizzesScreenState();
}

class _StudentQuizzesScreenState extends State<StudentQuizzesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();

  List<QuizWithAttempt> _quizzes = [];
  List<QuizAttempt> _attempts = [];
  bool _isLoading = true;
  String? _error;
  bool _showCompletedQuizzes = false;

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

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final user = authProvider.user;

    if (token == null || user == null) {
      setState(() {
        _isLoading = false;
        _error = "Vui lòng đăng nhập để xem thông tin.";
      });
      return;
    }

    try {
      final quizzesFuture = _apiService.fetchStudentQuizzes(token);
      final historyFuture = _apiService.fetchStudentQuizHistory(token, user.id);

      final results = await Future.wait([quizzesFuture, historyFuture]);

      setState(() {
        _quizzes = results[0] as List<QuizWithAttempt>;
        _attempts = results[1] as List<QuizAttempt>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = "Lỗi khi tải dữ liệu bài kiểm tra: ${e.toString()}";
      });
    }
  }

  bool _isQuizExpired(DateTime? dueDate) {
    if (dueDate == null) return false;
    return dueDate.isBefore(DateTime.now());
  }

  String _getTimeRemainingText(DateTime? dueDate) {
    if (dueDate == null) return "";
    final now = DateTime.now();
    final difference = dueDate.difference(now);

    if (difference.isNegative) return "Đã hết hạn";

    if (difference.inHours < 24) {
      return "Còn ${difference.inHours} giờ";
    }
    return "Còn ${difference.inDays} ngày";
  }

  Color _getDueDateColor(DateTime? dueDate) {
    if (dueDate == null) return Colors.grey;
    final now = DateTime.now();
    final difference = dueDate.difference(now);

    if (difference.isNegative) return const Color(0xFFB90000);
    if (difference.inHours < 24) return Colors.amber.shade800;
    return Colors.green;
  }

  void _handleStartQuiz(Quiz quiz) {
    if (_isQuizExpired(quiz.dueDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Bài kiểm tra này đã hết hạn và không thể làm nữa."),
          backgroundColor: Color(0xFFB90000),
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TakeQuizScreen(quizId: quiz.id),
      ),
    ).then((submitted) {
      if (submitted == true) {
        _loadData();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      appBar: AppBar(
        title: const Text(
          'BÀI KIỂM TRA',
          style: TextStyle(
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
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(49),
          child: Column(
            children: [
              TabBar(
                controller: _tabController,
                indicatorColor: const Color(0xFFB90000),
                labelColor: const Color(0xFFB90000),
                unselectedLabelColor: Colors.black54,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: const [
                  Tab(text: "Bài kiểm tra hiện có"),
                  Tab(text: "Kết quả của tôi"),
                ],
              ),
              const Divider(height: 1, color: Color(0xFFEEEEEE)),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFB90000)),
            onPressed: _loadData,
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFFB90000)),
              )
            : _error != null
                ? _buildErrorView()
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildAvailableQuizzesTab(),
                      _buildHistoryTab(),
                    ],
                  ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 64, color: Color(0xFFB90000)),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Đã xảy ra lỗi',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Colors.black87),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadData,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB90000),
                foregroundColor: Colors.white,
              ),
              child: const Text('Thử lại'),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildAvailableQuizzesTab() {
    final filteredQuizzes = _quizzes.where((q) {
      return _showCompletedQuizzes ? true : !q.hasAttempted;
    }).toList();

    if (_quizzes.isEmpty) {
      return _buildEmptyState(
        icon: Icons.assignment_late_outlined,
        title: "Hiện chưa có bài kiểm tra nào",
        description: "Bạn chưa tham gia khóa học nào hoặc chưa có bài kiểm tra nào được tạo từ phía giáo viên.",
      );
    }

    return Column(
      children: [
        // Filter selection
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Bộ lọc',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF023665)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Chưa làm: ${_quizzes.where((q) => !q.hasAttempted && !_isQuizExpired(q.quiz.dueDate)).length} • Tổng số: ${_quizzes.length}',
                      style: const TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  ],
                ),
              ),
              DropdownButton<bool>(
                value: _showCompletedQuizzes,
                underline: const SizedBox(),
                dropdownColor: Colors.white,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                items: const [
                  DropdownMenuItem(value: false, child: Text('Chỉ bài chưa làm')),
                  DropdownMenuItem(value: true, child: Text('Hiển thị tất cả')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _showCompletedQuizzes = val;
                    });
                  }
                },
              ),
            ],
          ),
        ),
        
        Expanded(
          child: filteredQuizzes.isEmpty
              ? _buildEmptyState(
                  icon: Icons.check_circle_outline_rounded,
                  title: "Hoàn thành toàn bộ!",
                  description: "Bạn đã hoàn thành toàn bộ bài kiểm tra hoặc chưa có bài mới.",
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: filteredQuizzes.length,
                  itemBuilder: (context, index) {
                    final item = filteredQuizzes[index];
                    final quiz = item.quiz;
                    final isExpired = _isQuizExpired(quiz.dueDate);

                    return Card(
                      color: Colors.white,
                      margin: const EdgeInsets.only(bottom: 16),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: item.hasAttempted
                              ? Colors.green.withOpacity(0.4)
                              : isExpired
                                  ? Colors.red.withOpacity(0.3)
                                  : Colors.grey.withOpacity(0.2),
                          width: 1.5,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Status Badge row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                if (item.hasAttempted)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.check_circle_rounded, size: 12, color: Colors.green),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Đã hoàn thành - ${(item.attemptPercentage ?? 0).toStringAsFixed(0)}%',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                                        ),
                                      ],
                                    ),
                                  )
                                else if (isExpired)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.red.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline_rounded, size: 12, color: Color(0xFFB90000)),
                                        const SizedBox(width: 4),
                                        const Text(
                                          'ĐÃ HẾT HẠN',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB90000)),
                                        ),
                                      ],
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      item.courseName ?? 'Khóa học',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue.shade800),
                                    ),
                                  ),
                              ],
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Title & Description
                            Text(
                              quiz.title,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: (item.hasAttempted || isExpired) ? Colors.black54 : const Color(0xFF1A1A1A),
                              ),
                            ),
                            if (quiz.description != null && quiz.description!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                quiz.description!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: Colors.black45, height: 1.4),
                              ),
                            ],
                            
                            const SizedBox(height: 16),
                            
                            // Question info, duration, deadline row
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _buildSpecChip(
                                  icon: Icons.help_outline_rounded,
                                  label: '${quiz.totalQuestions} câu hỏi',
                                ),
                                if (quiz.durationMinutes != null)
                                  _buildSpecChip(
                                    icon: Icons.timer_outlined,
                                    label: '${quiz.durationMinutes} phút',
                                  ),
                                if (quiz.dueDate != null)
                                  _buildSpecChip(
                                    icon: Icons.calendar_today_outlined,
                                    label: _getTimeRemainingText(quiz.dueDate),
                                    color: _getDueDateColor(quiz.dueDate),
                                  ),
                              ],
                            ),
                            
                            if (quiz.dueDate != null && !isExpired) ...[
                              const SizedBox(height: 12),
                              Text(
                                '📅 Hạn nộp: ${_formatDateTime(quiz.dueDate!.toLocal())}',
                                style: const TextStyle(fontSize: 11, color: Colors.black38, fontWeight: FontWeight.w500),
                              ),
                            ],
                            
                            const SizedBox(height: 16),
                            
                            // Action Button
                            SizedBox(
                              width: double.infinity,
                              height: 38,
                              child: item.hasAttempted
                                  ? OutlinedButton(
                                      onPressed: null,
                                      style: OutlinedButton.styleFrom(
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: const Text('Đã hoàn thành', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    )
                                  : isExpired
                                      ? OutlinedButton(
                                          onPressed: null,
                                          style: OutlinedButton.styleFrom(
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          child: const Text('Đã hết hạn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black26)),
                                        )
                                      : ElevatedButton.icon(
                                          onPressed: () => _handleStartQuiz(quiz),
                                          icon: const Icon(Icons.play_arrow_rounded, size: 16),
                                          label: const Text('Bắt đầu làm bài', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFFB90000),
                                            foregroundColor: Colors.white,
                                            elevation: 0,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildHistoryTab() {
    if (_attempts.isEmpty) {
      return _buildEmptyState(
        icon: Icons.emoji_events_outlined,
        title: "Chưa có lượt làm bài nào",
        description: "Hãy bắt đầu làm bài kiểm tra để xem kết quả chi tiết tại đây.",
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _attempts.length,
      itemBuilder: (context, index) {
        final attempt = _attempts[index];

        return Card(
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: attempt.passed ? Colors.green.withOpacity(0.4) : Colors.red.withOpacity(0.3),
              width: 1.5,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        attempt.quizTitle,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1A1A1A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: attempt.passed ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            attempt.passed ? Icons.check_circle_rounded : Icons.cancel_rounded,
                            size: 12,
                            color: attempt.passed ? Colors.green : const Color(0xFFB90000),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            attempt.passed ? "Đạt" : "Không đạt",
                            style: TextStyle(
                              fontSize: 10, 
                              fontWeight: FontWeight.bold, 
                              color: attempt.passed ? Colors.green.shade800 : const Color(0xFFB90000),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 12, color: Colors.black38),
                    const SizedBox(width: 4),
                    Text(
                      _formatDateTime(attempt.completedAt.toLocal()),
                      style: const TextStyle(fontSize: 11, color: Colors.black38),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Highlight block of scores
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF8F5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.withOpacity(0.12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildBlockStat("Điểm số", "${attempt.score}/${attempt.answers.length}"),
                      _buildBlockStat(
                        "Tỷ lệ",
                        "${attempt.percentage.toStringAsFixed(0)}%",
                        textColor: attempt.passed ? Colors.green : const Color(0xFFB90000),
                      ),
                      _buildBlockStat("Thời gian", "${attempt.timeSpent}p"),
                    ],
                  ),
                ),
                
                const SizedBox(height: 12),
                
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => QuizResultScreen(attemptId: attempt.id),
                        ),
                      );
                    },
                    icon: const Icon(Icons.remove_red_eye_outlined, size: 16),
                    label: const Text('Xem chi tiết kết quả', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFFB90000),
                      elevation: 0,
                      side: const BorderSide(color: Color(0xFFB90000)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDateTime(DateTime dt) {
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year;
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$day/$month/$year $hour:$minute';
  }

  Widget _buildBlockStat(String label, String value, {Color? textColor}) {
    return Column(
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.black38),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: textColor ?? const Color(0xFF1A1A1A),
          ),
        ),
      ],
    );
  }

  Widget _buildSpecChip({required IconData icon, required String label, Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF8F5),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.withOpacity(0.15)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color ?? Colors.black45),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color ?? Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFFFFEDED),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: const Color(0xFFB90000), size: 40),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.black45, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
