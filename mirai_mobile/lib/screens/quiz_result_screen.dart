import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/quiz_models.dart';

class QuizResultScreen extends StatefulWidget {
  final String attemptId;

  const QuizResultScreen({super.key, required this.attemptId});

  @override
  State<QuizResultScreen> createState() => _QuizResultScreenState();
}

class _QuizResultScreenState extends State<QuizResultScreen> {
  final ApiService _apiService = ApiService();
  
  AttemptDetailResponse? _response;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadResult();
  }

  Future<void> _loadResult() async {
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
        _error = "Vui lòng đăng nhập lại.";
      });
      return;
    }

    try {
      final result = await _apiService.fetchAttemptResult(
        token,
        widget.attemptId,
        user.id,
      );
      setState(() {
        _response = result;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = "Mở kết quả thi thất bại: ${e.toString()}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFFFAF8F5),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFFB90000)),
              const SizedBox(height: 16),
              Text(
                'Đang chấm điểm...',
                style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade600, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFFFAF8F5),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded, size: 64, color: Color(0xFFB90000)),
                const SizedBox(height: 16),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.black87),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFB90000),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Quay lại'),
                )
              ],
            ),
          ),
        ),
      );
    }

    final res = _response!;
    final results = res.results;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      appBar: AppBar(
        title: const Text(
          'KẾT QUẢ BÀI THI',
          style: TextStyle(
            color: Color(0xFF023665),
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
          ),
        ),
        iconTheme: const IconThemeData(color: Color(0xFFB90000)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () {
            // Dismiss and pop back to quiz screen list
            Navigator.of(context).pop(true);
          },
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Summary Header Card
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Column(
                children: [
                  // Pass / Fail Visual Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: res.passed ? Colors.green.shade50 : const Color(0xFFFFEDED),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      res.passed ? Icons.emoji_events_rounded : Icons.sentiment_very_dissatisfied_rounded,
                      color: res.passed ? Colors.green : const Color(0xFFB90000),
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    res.quizTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF023665)),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: res.passed ? Colors.green : const Color(0xFFB90000),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      res.passed ? 'ĐẠT VỚI KẾT QUẢ TỐT' : 'KHÔNG ĐẠT (CẦN >= 70%)',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Score breakdown cards
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricTile(
                          icon: Icons.check_circle_outline_rounded,
                          title: 'Kết quả',
                          value: '${res.score}/${res.totalQuestions}',
                          color: Colors.blue.shade700,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildMetricTile(
                          icon: Icons.percent_rounded,
                          title: 'Tỷ lệ đúng',
                          value: '${res.percentage.toStringAsFixed(0)}%',
                          color: res.passed ? Colors.green : const Color(0xFFB90000),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildMetricTile(
                          icon: Icons.access_time_rounded,
                          title: 'Thời gian',
                          value: '${res.timeSpent} phút',
                          color: Colors.purple.shade700,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFFEEEEEE)),
                  const SizedBox(height: 6),
                  
                  // Completion Time
                  Text(
                    'Hoàn thành lúc: ${_formatDateTime(res.completedAt.toLocal(), showSeconds: true)}',
                    style: const TextStyle(color: Colors.black38, fontSize: 11),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Detail Label
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'CHI TIẾT ĐÁP ÁN',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: Color(0xFF023665),
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ),
            
            // Question reviews
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: results.length,
              itemBuilder: (context, index) {
                final r = results[index];
                
                return Card(
                  color: Colors.white,
                  margin: const EdgeInsets.only(bottom: 16),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey.withOpacity(0.12)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Question header
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: r.isCorrect ? Colors.green : const Color(0xFFB90000),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Q${r.questionIndex + 1}',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                r.question,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A), height: 1.4),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(
                              r.isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                              color: r.isCorrect ? Colors.green : const Color(0xFFB90000),
                              size: 20,
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Options
                        ...List.generate(r.options.length, (optIdx) {
                          final optionVal = optIdx + 1;
                          final isStudentChoice = r.studentAnswer == optionVal;
                          final isCorrectAnswer = r.correctAnswer == optionVal;
                          
                          Color cardColor = Colors.transparent;
                          Color borderColor = Colors.grey.withOpacity(0.15);
                          Color textColor = Colors.black87;
                          Widget suffixIcon = const SizedBox();
                          FontWeight fontWeight = FontWeight.normal;

                          if (isCorrectAnswer) {
                            // Show green as correct answer anyway
                            cardColor = Colors.green.shade50.withOpacity(0.4);
                            borderColor = Colors.green;
                            textColor = Colors.green.shade800;
                            fontWeight = FontWeight.bold;
                            suffixIcon = const Icon(Icons.check_rounded, size: 14, color: Colors.green);
                          } else if (isStudentChoice && !r.isCorrect) {
                            // Student selected incorrect option, style with red
                            cardColor = const Color(0xFFFFEDED).withOpacity(0.4);
                            borderColor = const Color(0xFFB90000);
                            textColor = const Color(0xFFB90000);
                            fontWeight = FontWeight.bold;
                            suffixIcon = const Icon(Icons.close_rounded, size: 14, color: Color(0xFFB90000));
                          }

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: cardColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: borderColor, width: (isStudentChoice || isCorrectAnswer) ? 1.5 : 1.0),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isCorrectAnswer 
                                        ? Colors.green
                                        : (isStudentChoice && !r.isCorrect)
                                            ? const Color(0xFFB90000)
                                            : const Color(0xFFFAF8F5),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                                  ),
                                  child: Text(
                                    String.fromCharCode(65 + optIdx),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: (isStudentChoice || isCorrectAnswer) ? Colors.white : Colors.black54,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    r.options[optIdx],
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: textColor,
                                      fontWeight: fontWeight,
                                    ),
                                  ),
                                ),
                                suffixIcon,
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                );
              },
            ),
            
            const SizedBox(height: 20),
            
            // Finish review button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pop(true),
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                  label: const Text('Hoàn tất xem lại', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF023665),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF8F5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                title,
                style: const TextStyle(fontSize: 10, color: Colors.black45, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt, {bool showSeconds = false}) {
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year;
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    if (showSeconds) {
      final second = dt.second.toString().padLeft(2, '0');
      return '$day/$month/$year $hour:$minute:$second';
    }
    return '$day/$month/$year $hour:$minute';
  }
}
