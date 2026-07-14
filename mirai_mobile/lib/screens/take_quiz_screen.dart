import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/quiz_models.dart';
import 'quiz_result_screen.dart';

class TakeQuizScreen extends StatefulWidget {
  final String quizId;

  const TakeQuizScreen({super.key, required this.quizId});

  @override
  State<TakeQuizScreen> createState() => _TakeQuizScreenState();
}

class _TakeQuizScreenState extends State<TakeQuizScreen> {
  final ApiService _apiService = ApiService();
  
  Quiz? _quiz;
  bool _isLoading = true;
  String? _error;
  
  // Quiz State
  final Map<int, int> _answers = {}; // questionIndex : selectedOptionIndex (1-4)
  int _timeLeftSeconds = 0;
  Timer? _timer;
  bool _isSubmitting = false;
  late DateTime _startTime;

  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _loadQuiz();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadQuiz() async {
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
      final quiz = await _apiService.startQuiz(token, widget.quizId, user.id);
      setState(() {
        _quiz = quiz;
        _isLoading = false;
        
        if (quiz.durationMinutes != null && quiz.durationMinutes! > 0) {
          _timeLeftSeconds = quiz.durationMinutes! * 60;
          _startTimer();
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString().contains("already taken")
            ? "Bạn đã hoàn thành bài kiểm tra này rồi!"
            : "Lỗi tải đề thi: ${e.toString()}";
      });
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeftSeconds <= 1) {
        timer.cancel();
        setState(() {
          _timeLeftSeconds = 0;
        });
        _handleAutoSubmit();
      } else {
        setState(() {
          _timeLeftSeconds--;
        });
      }
    });
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return "$mins:${secs.toString().padLeft(2, '0')}";
  }

  Color _getTimeColor() {
    if (_timeLeftSeconds < 60) return const Color(0xFFB90000);
    if (_timeLeftSeconds < 300) return Colors.amber.shade700;
    return Colors.black87;
  }

  double _getProgress() {
    if (_quiz == null || _quiz!.questions == null || _quiz!.questions!.isEmpty) return 0.0;
    return _answers.length / _quiz!.questions!.length;
  }

  Future<void> _handleAutoSubmit() async {
    if (_isSubmitting) return;
    
    // Show a dialog warning about auto-submission
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
          title: Text("Hết giờ làm bài!", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFB90000))),
          content: Text("Hệ thống sẽ tự động nộp bài làm của bạn ngay lập tức."),
        );
      },
    );

    await Future.delayed(const Duration(seconds: 2));
    Navigator.of(context).pop(); // pop dialog
    _submitQuizAnswers();
  }

  Future<void> _submitQuizAnswers() async {
    if (_quiz == null || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
    });
    _timer?.cancel();

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final user = authProvider.user;

    if (token == null || user == null) {
      setState(() {
        _isSubmitting = false;
      });
      return;
    }

    final totalQuestions = _quiz!.questions?.length ?? 0;
    // Map answers map to array matching order of questions
    final List<int> answerArray = [];
    for (int i = 0; i < totalQuestions; i++) {
      answerArray.add(_answers[i] ?? 0); // 0 means unanswered
    }

    final timeSpentMinutes = DateTime.now().difference(_startTime).inMinutes;
    final actualTimeSpent = timeSpentMinutes < 1 ? 1 : timeSpentMinutes;

    try {
      final response = await _apiService.submitQuiz(
        token,
        widget.quizId,
        answerArray,
        actualTimeSpent,
        user.id,
      );

      if (mounted) {
        // Navigate to result screen, replace current
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => QuizResultScreen(attemptId: response.attemptId),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Lỗi nộp bài thi: ${e.toString()}"),
            backgroundColor: const Color(0xFFB90000),
          ),
        );
        // Resume timer if not expired
        if (_timeLeftSeconds > 0) {
          _startTimer();
        }
      }
    }
  }

  void _confirmSubmitDialog() {
    final questions = _quiz?.questions ?? [];
    final unanswered = questions.length - _answers.length;

    if (unanswered > 0) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: Colors.white,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(20))),
          title: const Text("Xác nhận nộp bài", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF023665))),
          content: Text(
            "Bạn còn $unanswered câu chưa trả lời. Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?",
            style: const TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("Xem lại câu hỏi", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                _submitQuizAnswers();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB90000),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text("Vẫn nộp bài", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      _submitQuizAnswers();
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
                'Đang tải bài thi...',
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
                const Icon(Icons.warning_amber_rounded, size: 64, color: Color(0xFFB90000)),
                const SizedBox(height: 16),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: 200,
                  height: 40,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFB90000),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Quay lại', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final quiz = _quiz!;
    final questions = quiz.questions ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      appBar: AppBar(
        title: Text(
          quiz.title.toUpperCase(),
          style: const TextStyle(
            color: Color(0xFF023665),
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        iconTheme: const IconThemeData(color: Color(0xFFB90000)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Header info: timer & progress
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tiến độ: ${_answers.length}/${questions.length} câu',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black54),
                    ),
                    if (quiz.durationMinutes != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF8F5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.withOpacity(0.2)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.timer_outlined, size: 14, color: _getTimeColor()),
                            const SizedBox(width: 4),
                            Text(
                              _formatTime(_timeLeftSeconds),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: _getTimeColor(),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _getProgress(),
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFB90000)),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),
          
          const Divider(height: 1, color: Color(0xFFEEEEEE)),

          // Questions List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: questions.length,
              itemBuilder: (context, index) {
                final q = questions[index];
                final isAnswered = _answers.containsKey(index);

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
                        // Question Header (Q1, Q2, etc.)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isAnswered ? Colors.green : const Color(0xFFB90000),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Q${q.order}',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                q.questionText,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A), height: 1.4),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Actionable options List
                        Column(
                          children: List.generate(q.options.length, (optIndex) {
                            final optionValue = optIndex + 1;
                            final isSelected = _answers[index] == optionValue;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFFFEDED).withOpacity(0.4) : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFFB90000) : Colors.grey.withOpacity(0.2),
                                  width: isSelected ? 1.5 : 1.0,
                                ),
                              ),
                              child: RadioListTile<int>(
                                value: optionValue,
                                groupValue: _answers[index],
                                dense: true,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                activeColor: const Color(0xFFB90000),
                                title: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isSelected ? const Color(0xFFB90000) : const Color(0xFFFAF8F5),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: Colors.grey.withOpacity(0.2)),
                                      ),
                                      child: Text(
                                        String.fromCharCode(65 + optIndex),
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isSelected ? Colors.white : Colors.black54,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        q.options[optIndex],
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isSelected ? const Color(0xFFB90000) : Colors.black87,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      _answers[index] = val;
                                    });
                                  }
                                },
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Bottom Controls (Cancel & Submit)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.12))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSubmitting
                        ? null
                        : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      side: const BorderSide(color: Colors.grey),
                    ),
                    child: const Text('Hủy bỏ', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _confirmSubmitDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFB90000),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.send_rounded, size: 14),
                              SizedBox(width: 6),
                              Text('Nộp bài thi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
