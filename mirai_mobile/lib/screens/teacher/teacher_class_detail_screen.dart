import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/course_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_provider.dart';

class TeacherClassDetailScreen extends StatefulWidget {
  final CourseModel course;
  
  const TeacherClassDetailScreen({super.key, required this.course});

  @override
  State<TeacherClassDetailScreen> createState() => _TeacherClassDetailScreenState();
}

class _TeacherClassDetailScreenState extends State<TeacherClassDetailScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  
  List<EnrolledStudent> _students = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<TeacherProvider>(context, listen: false);
    if (auth.accessToken != null) {
      try {
        final students = await provider.loadClassMembers(auth.accessToken!, widget.course.id);
        if (mounted) {
          setState(() {
            _students = students;
            _isLoading = false;
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lỗi tải danh sách: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _red),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'CHI TIẾT LỚP HỌC',
          style: TextStyle(
            color: _red,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _red.withOpacity(0.12)),
        ),
      ),
      body: Column(
        children: [
          // Header Info
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.white,
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.course.name,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildInfoItem(Icons.people_alt_outlined, 'Sĩ số', '${_students.length}/${widget.course.capacity}'),
                    _buildInfoItem(Icons.calendar_today_outlined, 'Tổng số buổi', '${widget.course.session}'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Student List Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                const Text(
                  'DANH SÁCH HỌC VIÊN',
                  style: TextStyle(
                    color: _red,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _redLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_students.length}',
                    style: const TextStyle(color: _red, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          // Student List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: _red))
                : _students.isEmpty
                    ? const Center(child: Text('Lớp chưa có học viên nào.', style: TextStyle(color: Colors.black54)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        itemCount: _students.length,
                        itemBuilder: (context, index) {
                          final student = _students[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.02),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              leading: CircleAvatar(
                                backgroundColor: _redLight,
                                child: Text(
                                  student.name.isNotEmpty ? student.name[0].toUpperCase() : 'U',
                                  style: const TextStyle(color: _red, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                              subtitle: Text(student.email, style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12)),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _redLight,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: _red),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 11)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(color: Color(0xFF1A1A1A), fontSize: 14, fontWeight: FontWeight.w600)),
          ],
        ),
      ],
    );
  }
}
