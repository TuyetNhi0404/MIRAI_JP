class CourseModel {
  final String id;
  final String name;
  final String? description;
  final String status;
  final String? startDate;
  final String? endDate;
  final String? createdBy;
  final String? homeroomTeacherId;
  final String? homeroomTeacher;
  final int session;
  final int capacity;
  final int enrolledCount;
  final String? createdAt;
  final String? updatedAt;

  final List<EnrolledStudent>? students;

  CourseModel({
    required this.id,
    required this.name,
    this.description,
    required this.status,
    this.startDate,
    this.endDate,
    this.createdBy,
    this.homeroomTeacherId,
    this.homeroomTeacher,
    this.session = 0,
    this.capacity = 0,
    this.enrolledCount = 0,
    this.createdAt,
    this.updatedAt,
    this.students,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      status: json['status'] ?? 'not_yet',
      startDate: json['startDate'],
      endDate: json['endDate'],
      createdBy: json['createdBy'],
      homeroomTeacherId: json['homeroomTeacherId'],
      homeroomTeacher: json['homeroomTeacher'],
      session: json['session'] ?? 0,
      capacity: json['capacity'] ?? 0,
      enrolledCount: json['enrolledCount'] ?? 0,
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      students: json['students'] != null
          ? (json['students'] as List).map((s) => EnrolledStudent.fromJson(s)).toList()
          : null,
    );
  }
}

class EnrolledStudent {
  final String id;
  final String name;
  final String email;
  final String? enrolledAt;

  EnrolledStudent({
    required this.id,
    required this.name,
    required this.email,
    this.enrolledAt,
  });

  factory EnrolledStudent.fromJson(Map<String, dynamic> json) {
    return EnrolledStudent(
      id: json['_id'] ?? json['id'] ?? json['userId'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      enrolledAt: json['enrolledAt'],
    );
  }
}
