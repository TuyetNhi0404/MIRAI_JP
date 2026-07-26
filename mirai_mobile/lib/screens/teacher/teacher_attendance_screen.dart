import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/calendar_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_provider.dart';
import 'package:intl/intl.dart';

class TeacherAttendanceScreen extends StatefulWidget {
  final CalendarModel calendar;
  
  const TeacherAttendanceScreen({super.key, required this.calendar});

  @override
  State<TeacherAttendanceScreen> createState() => _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState extends State<TeacherAttendanceScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.accessToken != null) {
        Provider.of<TeacherProvider>(context, listen: false)
            .loadAttendance(auth.accessToken!, widget.calendar.id);
      }
    });
  }

  void _updateStatus(String userId, String status) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.accessToken != null) {
      Provider.of<TeacherProvider>(context, listen: false)
          .updateAttendance(auth.accessToken!, widget.calendar.id, userId, status)
          .catchError((e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi cập nhật: $e'), backgroundColor: Colors.red),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    String formattedDate = '';
    DateTime? parsedDate;
    try {
      parsedDate = DateTime.parse(widget.calendar.date).toLocal();
      formattedDate = DateFormat('dd/MM/yyyy').format(parsedDate);
    } catch (e) {
      formattedDate = widget.calendar.date;
    }

    bool isEditable = true;
    String? lockMessage;
    String? infoMessage;
    
    if (parsedDate != null && widget.calendar.endTime.isNotEmpty && widget.calendar.startTime.isNotEmpty) {
      try {
        final now = DateTime.now();
        
        final endParts = widget.calendar.endTime.split(':');
        final startParts = widget.calendar.startTime.split(':');
        
        if (endParts.length == 2 && startParts.length == 2) {
          final startHour = int.tryParse(startParts[0]) ?? 0;
          final startMinute = int.tryParse(startParts[1]) ?? 0;
          final endHour = int.tryParse(endParts[0]) ?? 0;
          final endMinute = int.tryParse(endParts[1]) ?? 0;
          
          final classStartTime = DateTime(parsedDate.year, parsedDate.month, parsedDate.day, startHour, startMinute);
          final classEndTime = DateTime(parsedDate.year, parsedDate.month, parsedDate.day, endHour, endMinute);
          
          if (now.isAfter(classEndTime)) {
            final deadline = classEndTime.add(const Duration(hours: 24));
            if (now.isAfter(deadline)) {
              isEditable = false;
              lockMessage = 'Đã quá 24h kể từ khi ca học kết thúc, không thể thay đổi điểm danh.';
            } else {
              isEditable = true;
              infoMessage = 'Ca học đã kết thúc. Bạn vẫn có thể chỉnh sửa điểm danh đến ${DateFormat('HH:mm dd/MM/yyyy').format(deadline)}.';
            }
          } else if (now.isBefore(classStartTime)) {
            isEditable = false;
            lockMessage = 'Ca học này chưa bắt đầu, vui lòng đợi đến giờ vào lớp.';
          }
        }
      } catch (e) {}
    }

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
          'ĐIỂM DANH',
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
          // Header info
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.white,
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.calendar.courseName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem(Icons.access_time_rounded, 'Ca học', '${widget.calendar.sessionName} (${widget.calendar.startTime} - ${widget.calendar.endTime})')),
                    Expanded(child: _buildInfoItem(Icons.event_rounded, 'Ngày', formattedDate)),
                  ],
                ),
              ],
            ),
          ),
          if (!isEditable && lockMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
              color: Colors.orange.withOpacity(0.1),
              child: Row(
                children: [
                  const Icon(Icons.lock_clock_rounded, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      lockMessage,
                      style: const TextStyle(color: Colors.orange, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          if (isEditable && infoMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
              color: Colors.blue.withOpacity(0.1),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Colors.blue, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      infoMessage,
                      style: const TextStyle(color: Colors.blue, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                const Text(
                  'DANH SÁCH ĐIỂM DANH',
                  style: TextStyle(
                    color: _red,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
                const Spacer(),
                Consumer<TeacherProvider>(
                  builder: (context, provider, child) {
                    final presentCount = provider.currentAttendance.where((a) => a.status == 'present').length;
                    return Text(
                      'Có mặt: $presentCount/${provider.currentAttendance.length}',
                      style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12, fontWeight: FontWeight.bold),
                    );
                  },
                ),
              ],
            ),
          ),
          // Student List
          Expanded(
            child: Consumer<TeacherProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator(color: _red));
                }

                if (provider.currentAttendance.isEmpty) {
                  return const Center(child: Text('Chưa có danh sách học viên.', style: TextStyle(color: Colors.black54)));
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  itemCount: provider.currentAttendance.length,
                  itemBuilder: (context, index) {
                    final record = provider.currentAttendance[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
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
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: _redLight,
                                  child: Text(
                                    record.user.name.isNotEmpty ? record.user.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(color: _red, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        record.user.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1A1A1A)),
                                      ),
                                      Text(record.user.email, style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF9F9F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  _buildStatusOption(
                                    label: 'Chưa ĐD',
                                    value: 'not_yet',
                                    groupValue: record.status,
                                    activeColor: Colors.grey,
                                    isEditable: isEditable,
                                    onChanged: (val) => _updateStatus(record.user.id, val!),
                                  ),
                                  _buildStatusOption(
                                    label: 'Có mặt',
                                    value: 'present',
                                    groupValue: record.status,
                                    activeColor: Colors.green,
                                    isEditable: isEditable,
                                    onChanged: (val) => _updateStatus(record.user.id, val!),
                                  ),
                                  _buildStatusOption(
                                    label: 'Vắng mặt',
                                    value: 'absent',
                                    groupValue: record.status,
                                    activeColor: Colors.orange,
                                    isEditable: isEditable,
                                    onChanged: (val) => _updateStatus(record.user.id, val!),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      ),
                    );
                  },
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
        Icon(icon, size: 16, color: _red),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 11)),
              Text(value, style: const TextStyle(color: Color(0xFF1A1A1A), fontSize: 13, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusOption({
    required String label,
    required String value,
    required String groupValue,
    required Color activeColor,
    required bool isEditable,
    required ValueChanged<String?> onChanged,
  }) {
    final isSelected = value == groupValue;
    final color = isEditable ? (isSelected ? activeColor : Colors.grey.shade400) : (isSelected ? activeColor.withOpacity(0.5) : Colors.grey.shade300);
    return InkWell(
      onTap: isEditable ? () => onChanged(value) : null,
      borderRadius: BorderRadius.circular(8),
      child: Opacity(
        opacity: isEditable ? 1.0 : 0.6,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: color,
                    width: isSelected ? 4 : 1.5,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected ? activeColor : Colors.black.withOpacity(0.6),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
