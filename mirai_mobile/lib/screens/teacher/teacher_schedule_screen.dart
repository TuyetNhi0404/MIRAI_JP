import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_provider.dart';
import '../../models/calendar_model.dart';
import 'teacher_attendance_screen.dart';

class TeacherScheduleScreen extends StatefulWidget {
  const TeacherScheduleScreen({super.key});

  @override
  State<TeacherScheduleScreen> createState() => _TeacherScheduleScreenState();
}

class _TeacherScheduleScreenState extends State<TeacherScheduleScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);

  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedule();
    });
  }

  Future<void> _loadSchedule() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.accessToken != null) {
      final startDate = DateTime(_focusedDay.year, _focusedDay.month - 1, 1).toIso8601String();
      final endDate = DateTime(_focusedDay.year, _focusedDay.month + 2, 0).toIso8601String();
      await Provider.of<TeacherProvider>(context, listen: false).loadWeekSchedule(auth.accessToken!, startDate, endDate);
    }
  }

  List<CalendarModel> _getEventsForDay(DateTime day) {
    final provider = Provider.of<TeacherProvider>(context, listen: false);
    return provider.weekCalendars.where((event) {
      try {
        final eventDate = DateTime.parse(event.date).toLocal();
        return isSameDay(eventDate, day);
      } catch (e) {
        return false;
      }
    }).toList();
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
          'LỊCH GIẢNG DẠY',
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
          Container(
            color: Colors.white,
            child: Consumer<TeacherProvider>(
              builder: (context, provider, child) {
                return TableCalendar<CalendarModel>(
                  firstDay: DateTime.utc(2020, 10, 16),
                  lastDay: DateTime.utc(2030, 3, 14),
                  focusedDay: _focusedDay,
                  selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                  onDaySelected: (selectedDay, focusedDay) {
                    setState(() {
                      _selectedDay = selectedDay;
                      _focusedDay = focusedDay;
                    });
                  },
                  onPageChanged: (focusedDay) {
                    _focusedDay = focusedDay;
                    _loadSchedule();
                  },
                  eventLoader: _getEventsForDay,
                  calendarStyle: CalendarStyle(
                    defaultTextStyle: const TextStyle(color: Color(0xFF1A1A1A)),
                    weekendTextStyle: const TextStyle(color: _red, fontWeight: FontWeight.bold),
                    outsideTextStyle: TextStyle(color: Colors.black.withOpacity(0.3)),
                    todayTextStyle: const TextStyle(color: _red, fontWeight: FontWeight.bold),
                    selectedTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    todayDecoration: BoxDecoration(color: _redLight, shape: BoxShape.circle),
                    selectedDecoration: const BoxDecoration(color: _red, shape: BoxShape.circle),
                    markerDecoration: const BoxDecoration(color: Colors.orange, shape: BoxShape.circle),
                  ),
                  daysOfWeekStyle: const DaysOfWeekStyle(
                    weekdayStyle: TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.bold),
                    weekendStyle: TextStyle(color: _red, fontWeight: FontWeight.bold),
                  ),
                  headerStyle: const HeaderStyle(
                    formatButtonVisible: false,
                    titleCentered: true,
                    titleTextStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                    leftChevronIcon: Icon(Icons.chevron_left_rounded, color: _red),
                    rightChevronIcon: Icon(Icons.chevron_right_rounded, color: _red),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Consumer<TeacherProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator(color: _red));
                }

                final selectedEvents = _getEventsForDay(_selectedDay ?? _focusedDay);

                if (selectedEvents.isEmpty) {
                  return const Center(
                    child: Text(
                      'Không có ca học nào trong ngày này.',
                      style: TextStyle(fontSize: 14, color: Colors.black54),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: selectedEvents.length,
                  itemBuilder: (context, index) {
                    final event = selectedEvents[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12.0),
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
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => TeacherAttendanceScreen(calendar: event),
                              ),
                            );
                          },
                          splashColor: _red.withOpacity(0.06),
                          highlightColor: _redLight.withOpacity(0.5),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _redLight,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.calendar_month_outlined, color: _red),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Lớp: ${event.courseName}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1A1A1A)),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${event.sessionName} (${event.startTime} - ${event.endTime})',
                                        style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 13),
                                      ),
                                      if (event.note != null && event.note!.isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text('Ghi chú: ${event.note}', style: const TextStyle(color: Colors.orange, fontSize: 12)),
                                        ),
                                    ],
                                  ),
                                ),
                                Icon(Icons.chevron_right_rounded, color: _red.withOpacity(0.4), size: 20),
                              ],
                            ),
                          ),
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
}
