class EnrolledCourse {
  final String id;
  final String name;
  final String description;
  final String status;
  final String startDate;
  final String endDate;
  final String homeroomTeacher;
  final String createdAt;

  EnrolledCourse({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.homeroomTeacher,
    required this.createdAt,
  });

  factory EnrolledCourse.fromJson(Map<String, dynamic> json) {
    return EnrolledCourse(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'not_yet',
      startDate: json['startDate'] as String? ?? '',
      endDate: json['endDate'] as String? ?? '',
      homeroomTeacher: json['homeroomTeacher'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class Assignment {
  final String id;
  final String title;
  final String courseId;
  final String courseName;
  final String description;
  final String status;
  final String dueDate;
  final bool isLate;
  final int maxScore;
  final List<String> fileUrls;
  final String teacherName;
  final String createdAt;
  final String updatedAt;

  Assignment({
    required this.id,
    required this.title,
    required this.courseId,
    required this.courseName,
    required this.description,
    required this.status,
    required this.dueDate,
    required this.isLate,
    required this.maxScore,
    required this.fileUrls,
    required this.teacherName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      courseId: _resolveStringId(json['courseId']),
      courseName: json['courseName'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      dueDate: json['dueDate'] as String? ?? '',
      isLate: json['isLate'] as bool? ?? false,
      maxScore: json['maxScore'] as int? ?? 0,
      fileUrls: _resolveFileUrls(json['fileUrls']),
      teacherName: json['teacherName'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }

  bool get isOpen => status == 'active' || status == 'open';
  bool get isClosed => status == 'closed';

  static String _resolveStringId(dynamic val) {
    if (val == null) return '';
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['_id'] as String? ?? val['id'] as String? ?? '';
    return val.toString();
  }

  static List<String> _resolveFileUrls(dynamic val) {
    if (val == null) return [];
    if (val is List) return val.map((e) => e.toString()).toList();
    if (val is String) return [val];
    return [];
  }
}

class Submission {
  final String id;
  final String assignmentId;
  final String assignmentTitle;
  final String courseName;
  final String studentId;
  final String studentName;
  final String studentEmail;
  final List<String> files;
  final String? note;
  final String submittedAt;
  final String status;
  final int? score;
  final String? feedback;
  final String? gradedBy;
  final String? gradedAt;

  Submission({
    required this.id,
    required this.assignmentId,
    required this.assignmentTitle,
    required this.courseName,
    required this.studentId,
    required this.studentName,
    required this.studentEmail,
    required this.files,
    this.note,
    required this.submittedAt,
    required this.status,
    this.score,
    this.feedback,
    this.gradedBy,
    this.gradedAt,
  });

  factory Submission.fromJson(Map<String, dynamic> json) {
    final assignmentObj = json['assignmentId'] as Map<String, dynamic>?;
    final studentObj = json['studentId'] as Map<String, dynamic>?;

    return Submission(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      assignmentId: assignmentObj?['_id'] as String? ?? '',
      assignmentTitle: assignmentObj?['title'] as String? ?? '',
      courseName: _resolveCourseName(assignmentObj),
      studentId: studentObj?['_id'] as String? ?? '',
      studentName: studentObj?['name'] as String? ?? '',
      studentEmail: studentObj?['email'] as String? ?? '',
      files: _resolveFileUrls(json['files']),
      note: json['note'] as String?,
      submittedAt: json['submittedAt'] as String? ?? '',
      status: json['status'] as String? ?? 'not_submitted',
      score: json['score'] as int?,
      feedback: json['feedback'] as String?,
      gradedBy: _resolveName(json['gradedBy']),
      gradedAt: json['gradedAt'] as String?,
    );
  }

  bool get isGraded => status == 'graded';
  bool get isSubmitted => status == 'submitted';
  bool get isLate => status == 'late';
  bool get notSubmitted => status == 'not_submitted';

  String get statusLabel {
    switch (status) {
      case 'graded': return 'Đã chấm điểm';
      case 'submitted': return 'Đã nộp';
      case 'late': return 'Nộp trễ';
      default: return 'Chưa nộp';
    }
  }

  static String _resolveCourseName(Map<String, dynamic>? assignmentObj) {
    if (assignmentObj == null) return '';
    final courseObj = assignmentObj['courseId'] as Map<String, dynamic>?;
    return courseObj?['name'] as String? ?? '';
  }

  static List<String> _resolveFileUrls(dynamic val) {
    if (val == null) return [];
    if (val is List) return val.map((e) => e.toString()).toList();
    if (val is String) return [val];
    return [];
  }

  static String? _resolveName(dynamic val) {
    if (val == null) return null;
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['name'] as String?;
    return null;
  }
}
