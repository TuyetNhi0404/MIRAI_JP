class AttendanceRecord {
  final String attendanceId;
  final AttendanceUser user;
  final String name;
  final String email;
  final String? username;
  String status;

  AttendanceRecord({
    required this.attendanceId,
    required this.user,
    required this.name,
    required this.email,
    this.username,
    required this.status,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      attendanceId: json['attendanceId'] ?? '',
      user: AttendanceUser.fromJson(json['userId'] ?? {}),
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      username: json['username'],
      status: json['status'] ?? 'not_yet',
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'attendanceId': attendanceId,
      'userId': user.toJson(),
      'name': name,
      'email': email,
      'username': username,
      'status': status,
    };
  }
}

class AttendanceUser {
  final String id;
  final String name;
  final String email;
  final String? username;

  AttendanceUser({
    required this.id,
    required this.name,
    required this.email,
    this.username,
  });

  factory AttendanceUser.fromJson(Map<String, dynamic> json) {
    return AttendanceUser(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      username: json['username'],
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'username': username,
    };
  }
}
