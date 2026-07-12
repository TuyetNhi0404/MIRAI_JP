class SessionItem {
  final String calendarId;
  final String courseId;
  final String courseName;
  final int slotNumber;
  final String date;
  final String startTime;
  final String endTime;
  final String teacher;
  final AttendanceStatus attendance;
  final String? room;
  final String? sessionName;

  SessionItem({
    required this.calendarId,
    required this.courseId,
    required this.courseName,
    required this.slotNumber,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.teacher,
    required this.attendance,
    this.room,
    this.sessionName,
  });

  factory SessionItem.fromJson(Map<String, dynamic> json) {
    final attRaw = json['attendance'] as Map<String, dynamic>?;
    return SessionItem(
      calendarId: json['calendarId'] as String? ?? json['_id'] as String? ?? '',
      courseId: _resolveStringId(json['courseId']),
      courseName: json['courseName'] as String? ?? '',
      slotNumber: json['slotNumber'] as int? ?? 1,
      date: json['date'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '09:00',
      endTime: json['endTime'] as String? ?? '11:30',
      teacher: json['teacher'] as String? ?? 'GV',
      attendance: attRaw != null
          ? AttendanceStatus.fromJson(attRaw)
          : AttendanceStatus(status: 'not_yet'),
      room: json['room'] as String?,
      sessionName: json['sessionName'] as String?,
    );
  }

  String get slotLabel => 'Ca $slotNumber';
  String get dateDisplay {
    try {
      final parts = date.split('-');
      if (parts.length == 3) return '${parts[2]}/${parts[1]}/${parts[0]}';
    } catch (_) {}
    return date;
  }

  static String _resolveStringId(dynamic val) {
    if (val == null) return '';
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['_id'] as String? ?? val['id'] as String? ?? '';
    return val.toString();
  }
}

class AttendanceStatus {
  final String status;

  AttendanceStatus({required this.status});

  factory AttendanceStatus.fromJson(Map<String, dynamic> json) {
    final raw = json['status'] as String? ?? json['state'] as String? ?? json['s'] as String? ?? 'not_yet';
    return AttendanceStatus(status: raw);
  }

  bool get isPresent => status == 'present';
  bool get isAbsent => status == 'absent';
  bool get isNotYet => status == 'not_yet';

  String get label {
    switch (status) {
      case 'present': return 'Có mặt';
      case 'absent': return 'Vắng';
      default: return 'Chưa học';
    }
  }
}

class CalendarRecord {
  final String id;
  final String courseId;
  final String? courseName;
  final String sessionId;
  final String teacherId;
  final String date;
  final String? note;
  final String? startTime;
  final String? endTime;
  final int? slotNumber;

  CalendarRecord({
    required this.id,
    required this.courseId,
    this.courseName,
    required this.sessionId,
    required this.teacherId,
    required this.date,
    this.note,
    this.startTime,
    this.endTime,
    this.slotNumber,
  });

  factory CalendarRecord.fromJson(Map<String, dynamic> json) {
    return CalendarRecord(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      courseId: _resolveStringId(json['courseId']),
      courseName: _resolveName(json['course']),
      sessionId: _resolveStringId(json['sessionId']),
      teacherId: _resolveStringId(json['teacherId']),
      date: json['date'] as String? ?? json['startDate'] as String? ?? '',
      note: json['note'] as String?,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      slotNumber: json['slotNumber'] as int?,
    );
  }

  static String _resolveStringId(dynamic val) {
    if (val == null) return '';
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['_id'] as String? ?? val['id'] as String? ?? '';
    return val.toString();
  }

  static String? _resolveName(dynamic val) {
    if (val == null) return null;
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['name'] as String?;
    return null;
  }
}
