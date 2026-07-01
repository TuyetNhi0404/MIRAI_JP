import 'package:flutter/material.dart';
import '../widgets/home_shared_widgets.dart';

class StudentOverview extends StatelessWidget {
  final int coursesCount;
  final VoidCallback onViewCourses;
  final VoidCallback onViewSpeaking;
  final VoidCallback onViewVocab;

  const StudentOverview({
    super.key,
    required this.coursesCount,
    required this.onViewCourses,
    required this.onViewSpeaking,
    required this.onViewVocab,
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
                icon: Icons.record_voice_over_outlined,
                title: 'Luyện nói',
                color: Colors.teal,
                onTap: onViewSpeaking,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ActionGridCard(
                icon: Icons.translate_rounded,
                title: 'Từ vựng',
                color: Colors.purple,
                onTap: onViewVocab,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
