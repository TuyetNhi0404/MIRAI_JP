import 'package:flutter/material.dart';

class WhyChooseUsSection extends StatelessWidget {
  const WhyChooseUsSection({super.key});

  Widget _buildWhyChooseCard({
    required IconData icon,
    required String title,
    required String desc,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF8F5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFB90000),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF666666),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      color: Colors.white,
      child: Column(
        children: [
          const Text(
            'Tại sao chọn MIRAI Japanese?',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 3,
            color: const Color(0xFFB90000),
          ),
          const SizedBox(height: 32),
          // Cards
          _buildWhyChooseCard(
            icon: Icons.book_outlined,
            title: 'Lộ trình bài bản',
            desc: 'Giáo trình chuẩn Nhật Bản tối ưu hóa cho người Việt, cam kết đầu ra theo chuẩn JLPT.',
          ),
          const SizedBox(height: 20),
          _buildWhyChooseCard(
            icon: Icons.school_outlined,
            title: 'Giảng viên bản ngữ',
            desc: 'Đội ngũ Sensei tâm huyết, giàu kinh nghiệm sư phạm và am hiểu văn hóa sâu sắc.',
          ),
          const SizedBox(height: 20),
          _buildWhyChooseCard(
            icon: Icons.groups_outlined,
            title: 'Cộng đồng học tập',
            desc: 'Kết nối, trao đổi kiến thức và thực hành giao tiếp cùng hàng ngàn học viên mỗi ngày.',
          ),
        ],
      ),
    );
  }
}
