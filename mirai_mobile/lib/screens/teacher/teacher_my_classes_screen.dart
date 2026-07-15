import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_provider.dart';
import 'teacher_class_detail_screen.dart';

class TeacherMyClassesScreen extends StatefulWidget {
  const TeacherMyClassesScreen({super.key});

  @override
  State<TeacherMyClassesScreen> createState() => _TeacherMyClassesScreenState();
}

class _TeacherMyClassesScreenState extends State<TeacherMyClassesScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.accessToken != null) {
        Provider.of<TeacherProvider>(context, listen: false).loadCourses(auth.accessToken!);
      }
    });
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
          'LỚP CỦA TÔI',
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
      body: Consumer<TeacherProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.courses.isEmpty) {
            return const Center(child: CircularProgressIndicator(color: _red));
          }

          if (provider.courses.isEmpty) {
            return const Center(
              child: Text(
                'Bạn chưa có lớp học nào.',
                style: TextStyle(fontSize: 16, color: Colors.black54),
              ),
            );
          }

          return RefreshIndicator(
            color: _red,
            onRefresh: () async {
              final token = Provider.of<AuthProvider>(context, listen: false).accessToken;
              if (token != null) {
                await provider.loadCourses(token);
              }
            },
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              itemCount: provider.courses.length,
              itemBuilder: (context, index) {
                final course = provider.courses[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => TeacherClassDetailScreen(course: course),
                          ),
                        );
                      },
                      splashColor: _red.withOpacity(0.06),
                      highlightColor: _redLight.withOpacity(0.5),
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: _redLight,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.class_outlined, color: _red, size: 24),
                                ),
                                const SizedBox(width: 16),
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
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: course.status == 'in_progress' ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          course.status == 'in_progress' ? 'Đang học' : 'Chưa bắt đầu',
                                          style: TextStyle(
                                            color: course.status == 'in_progress' ? Colors.green : Colors.orange,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(Icons.chevron_right_rounded, color: _red.withOpacity(0.4), size: 20),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Divider(color: Color(0xFFF0F0F0)),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Sĩ số', style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 12)),
                                    const SizedBox(height: 2),
                                    Text('${course.enrolledCount}/${course.capacity}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Số buổi', style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 12)),
                                    const SizedBox(height: 2),
                                    Text('${course.session}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                                  ],
                                ),
                                const SizedBox(width: 20), // Spacer
                              ],
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
