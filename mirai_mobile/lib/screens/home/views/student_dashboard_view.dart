import 'package:flutter/material.dart';
import '../widgets/home_shared_widgets.dart';
import '../../student/listening/listening_list_screen.dart';

class StudentOverview extends StatelessWidget {
  final int coursesCount;
  final VoidCallback onViewCourses;
  final VoidCallback onViewSpeaking;
  final VoidCallback onViewVocab;
  final VoidCallback onViewLeaderboard;
  final VoidCallback onViewGrammar;
  final VoidCallback onViewOcr;
  final VoidCallback onViewKana;
  final VoidCallback onViewQuizzes;
  final VoidCallback onViewStatistics;

  const StudentOverview({
    super.key,
    required this.coursesCount,
    required this.onViewCourses,
    required this.onViewSpeaking,
    required this.onViewVocab,
    required this.onViewLeaderboard,
    required this.onViewGrammar,
    required this.onViewOcr,
    required this.onViewKana,
    required this.onViewQuizzes,
    required this.onViewStatistics,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatCard(
          icon: Icons.book_rounded,
          title: 'Lớp học của tôi',
          value: '$coursesCount lớp',
          color: const Color(0xFFB90000),
          onTap: onViewCourses,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ActionGridCard(
                icon: Icons.translate_rounded,
                title: 'Học từ vựng',
                color: Colors.pink,
                onTap: onViewVocab,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ActionGridCard(
                icon: Icons.emoji_events_outlined,
                title: 'Xếp hạng',
                color: Colors.amber,
                onTap: onViewLeaderboard,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ActionGridCard(
                icon: Icons.menu_book_rounded,
                title: 'Ngữ pháp',
                color: Colors.blue,
                onTap: onViewGrammar,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ActionGridCard(
                icon: Icons.camera_alt_outlined,
                title: 'Quét tra từ',
                color: Colors.purple,
                onTap: onViewOcr,
              ),
            ),
          ],
        ),
        Row(
          children: [
            Expanded(
              child: ActionGridCard(
                icon: Icons.headphones_outlined,
                title: 'Luyện nghe',
                color: const Color(0xFFB90000),
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const ListeningListScreen()));
                },
              ),
            ),
            const SizedBox(width: 16),
            const Expanded(child: SizedBox()),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ActionGridCard(
                icon: Icons.record_voice_over_outlined,
                title: 'Luyện nói',
                color: Colors.teal,
                onTap: onViewSpeaking,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ActionGridCard(
                icon: Icons.edit_rounded,
                title: 'Luyện viết Kana',
                color: const Color(0xFFB90000),
                onTap: onViewKana,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        StatCard(
          icon: Icons.quiz_outlined,
          title: 'Bài kiểm tra',
          value: 'Đánh giá năng lực',
          color: Colors.orange.shade800,
          onTap: onViewQuizzes,
        ),
        const SizedBox(height: 16),
        StatCard(
          icon: Icons.bar_chart_rounded,
          title: 'Thống kê kết quả',
          value: 'Chi tiết học tập',
          color: Colors.indigo,
          onTap: onViewStatistics,
        ),
      ],
    );
  }
}
