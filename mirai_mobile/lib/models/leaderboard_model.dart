class LeaderboardStudent {
  final String id;
  final String name;
  final String email;
  final String? avatar;

  LeaderboardStudent({
    required this.id,
    required this.name,
    required this.email,
    this.avatar,
  });

  factory LeaderboardStudent.fromJson(Map<String, dynamic> json) {
    return LeaderboardStudent(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'N/A',
      email: json['email']?.toString() ?? '',
      avatar: json['avatar']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatar': avatar,
    };
  }
}

class LeaderboardEntry {
  final int rank;
  final LeaderboardStudent student;
  final double finalScore;
  final String? grade;
  final double? attendanceScore;
  final double? assignmentScore;
  final double? quizScore;
  final double? score;

  LeaderboardEntry({
    required this.rank,
    required this.student,
    required this.finalScore,
    this.grade,
    this.attendanceScore,
    this.assignmentScore,
    this.quizScore,
    this.score,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] as int? ?? 0,
      student: LeaderboardStudent.fromJson(json['student'] as Map<String, dynamic>? ?? {}),
      finalScore: (json['finalScore'] as num?)?.toDouble() ?? 0.0,
      grade: json['grade']?.toString(),
      attendanceScore: (json['attendanceScore'] as num?)?.toDouble(),
      assignmentScore: (json['assignmentScore'] as num?)?.toDouble(),
      quizScore: (json['quizScore'] as num?)?.toDouble(),
      score: (json['score'] as num?)?.toDouble(),
    );
  }
}

class StudentRankInfo {
  final LeaderboardStudent student;
  final String courseId;
  final String courseName;
  final int rank;
  final int totalStudents;
  final double finalScore;
  final String? grade;
  final double percentile;
  final double? attendanceScore;
  final double? assignmentScore;
  final double? quizScore;

  StudentRankInfo({
    required this.student,
    required this.courseId,
    required this.courseName,
    required this.rank,
    required this.totalStudents,
    required this.finalScore,
    this.grade,
    required this.percentile,
    this.attendanceScore,
    this.assignmentScore,
    this.quizScore,
  });

  factory StudentRankInfo.fromJson(Map<String, dynamic> json) {
    final studentData = json['student'] as Map<String, dynamic>? ?? {};
    final courseData = json['course'] as Map<String, dynamic>? ?? {};
    
    return StudentRankInfo(
      student: LeaderboardStudent.fromJson(studentData),
      courseId: courseData['id']?.toString() ?? '',
      courseName: courseData['name']?.toString() ?? 'N/A',
      rank: json['rank'] as int? ?? 0,
      totalStudents: json['totalStudents'] as int? ?? 0,
      finalScore: (json['finalScore'] as num?)?.toDouble() ?? 0.0,
      grade: json['grade']?.toString(),
      percentile: (json['percentile'] as num?)?.toDouble() ?? 0.0,
      attendanceScore: (json['attendanceScore'] as num?)?.toDouble(),
      assignmentScore: (json['assignmentScore'] as num?)?.toDouble(),
      quizScore: (json['quizScore'] as num?)?.toDouble(),
    );
  }
}
