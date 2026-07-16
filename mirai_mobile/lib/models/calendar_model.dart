class CalendarModel {
  final String id;
  final dynamic courseId; 
  final String date;
  final dynamic sessionId;
  final dynamic teacherId; 
  final String status;
  final String? note;
  final String? createdAt;
  final String? updatedAt;

  String get courseName => courseId is Map ? (courseId['name'] ?? courseId['courseName'] ?? '') : '';
  String get sessionName => sessionId is Map ? (sessionId['sessionName'] ?? '') : '';
  String get startTime => sessionId is Map ? (sessionId['startTime'] ?? '') : '';
  String get endTime => sessionId is Map ? (sessionId['endTime'] ?? '') : '';
  String get teacherName => teacherId is Map ? (teacherId['name'] ?? teacherId['fullName'] ?? '') : '';

  CalendarModel({
    required this.id,
    this.courseId,
    required this.date,
    this.sessionId,
    this.teacherId,
    required this.status,
    this.note,
    this.createdAt,
    this.updatedAt,
  });

  factory CalendarModel.fromJson(Map<String, dynamic> json) {
    return CalendarModel(
      id: json['_id'] ?? json['calendarId'] ?? '',
      courseId: json['courseId'],
      date: json['date'] ?? '',
      sessionId: json['sessionId'],
      teacherId: json['teacherId'],
      status: json['status'] ?? 'not_yet',
      note: json['note'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
    );
  }
}
