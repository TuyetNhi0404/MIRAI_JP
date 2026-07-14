// Statistics data models mirroring the backend response shape

class CourseData {
  final String id;
  final String name;
  final String? description;
  final String? status;
  final String? startDate;
  final String? endDate;
  final String? homeroomTeacher;
  final int? capacity;
  final int? session;
  final int? enrolledCount;

  CourseData({
    required this.id,
    required this.name,
    this.description,
    this.status,
    this.startDate,
    this.endDate,
    this.homeroomTeacher,
    this.capacity,
    this.session,
    this.enrolledCount,
  });

  factory CourseData.fromJson(Map<String, dynamic> json) {
    return CourseData(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      status: json['status']?.toString(),
      startDate: json['startDate']?.toString(),
      endDate: json['endDate']?.toString(),
      homeroomTeacher: json['homeroomTeacher']?.toString(),
      capacity: json['capacity'] as int?,
      session: json['session'] as int?,
      enrolledCount: json['enrolledCount'] as int?,
    );
  }
}

class AttendanceDetails {
  final int totalSessions;
  final int presentCount;
  final int absentCount;
  final double percentage;

  AttendanceDetails({
    required this.totalSessions,
    required this.presentCount,
    required this.absentCount,
    required this.percentage,
  });

  factory AttendanceDetails.fromJson(Map<String, dynamic> json) {
    return AttendanceDetails(
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      presentCount: (json['presentCount'] as num?)?.toInt() ?? 0,
      absentCount: (json['absentCount'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class AssignmentDetails {
  final int totalAssignments;
  final int gradedAssignments;
  final double averageScore;

  AssignmentDetails({
    required this.totalAssignments,
    required this.gradedAssignments,
    required this.averageScore,
  });

  factory AssignmentDetails.fromJson(Map<String, dynamic> json) {
    return AssignmentDetails(
      totalAssignments: (json['totalAssignments'] as num?)?.toInt() ?? 0,
      gradedAssignments: (json['gradedAssignments'] as num?)?.toInt() ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class QuizDetails {
  final int totalQuizzes;
  final int completedQuizzes;
  final double averageScore;

  QuizDetails({
    required this.totalQuizzes,
    required this.completedQuizzes,
    required this.averageScore,
  });

  factory QuizDetails.fromJson(Map<String, dynamic> json) {
    return QuizDetails(
      totalQuizzes: (json['totalQuizzes'] as num?)?.toInt() ?? 0,
      completedQuizzes: (json['completedQuizzes'] as num?)?.toInt() ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ScoreComponent {
  final double attendanceScore;
  final double assignmentScore;
  final double quizScore;
  final AttendanceDetails attendanceDetails;
  final AssignmentDetails assignmentDetails;
  final QuizDetails quizDetails;
  final String lastCalculated;

  ScoreComponent({
    required this.attendanceScore,
    required this.assignmentScore,
    required this.quizScore,
    required this.attendanceDetails,
    required this.assignmentDetails,
    required this.quizDetails,
    required this.lastCalculated,
  });

  factory ScoreComponent.fromJson(Map<String, dynamic> json) {
    return ScoreComponent(
      attendanceScore: (json['attendanceScore'] as num?)?.toDouble() ?? 0.0,
      assignmentScore: (json['assignmentScore'] as num?)?.toDouble() ?? 0.0,
      quizScore: (json['quizScore'] as num?)?.toDouble() ?? 0.0,
      attendanceDetails: AttendanceDetails.fromJson(
          (json['attendanceDetails'] as Map<String, dynamic>?) ?? {}),
      assignmentDetails: AssignmentDetails.fromJson(
          (json['assignmentDetails'] as Map<String, dynamic>?) ?? {}),
      quizDetails: QuizDetails.fromJson(
          (json['quizDetails'] as Map<String, dynamic>?) ?? {}),
      lastCalculated: json['lastCalculated']?.toString() ?? '',
    );
  }
}

class ScoreWeights {
  final int attendance;
  final int assignment;
  final int quiz;

  ScoreWeights({
    required this.attendance,
    required this.assignment,
    required this.quiz,
  });

  factory ScoreWeights.fromJson(Map<String, dynamic> json) {
    return ScoreWeights(
      attendance: (json['attendance'] as num?)?.toInt() ?? 0,
      assignment: (json['assignment'] as num?)?.toInt() ?? 0,
      quiz: (json['quiz'] as num?)?.toInt() ?? 0,
    );
  }
}

class FinalScore {
  final double finalScore;
  final String grade;
  final bool passed;
  final int rank;
  final int totalStudents;
  final ScoreWeights weights;

  FinalScore({
    required this.finalScore,
    required this.grade,
    required this.passed,
    required this.rank,
    required this.totalStudents,
    required this.weights,
  });

  factory FinalScore.fromJson(Map<String, dynamic> json) {
    return FinalScore(
      finalScore: (json['finalScore'] as num?)?.toDouble() ?? 0.0,
      grade: json['grade']?.toString() ?? '-',
      passed: json['passed'] as bool? ?? false,
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? 0,
      weights: ScoreWeights.fromJson(
          (json['weights'] as Map<String, dynamic>?) ?? {}),
    );
  }
}

class StudentCourseStatistics {
  final ScoreComponent scoreComponent;
  final FinalScore finalScore;

  StudentCourseStatistics({
    required this.scoreComponent,
    required this.finalScore,
  });

  factory StudentCourseStatistics.fromJson(Map<String, dynamic> json) {
    return StudentCourseStatistics(
      scoreComponent: ScoreComponent.fromJson(
          (json['scoreComponent'] as Map<String, dynamic>?) ?? {}),
      finalScore: FinalScore.fromJson(
          (json['finalScore'] as Map<String, dynamic>?) ?? {}),
    );
  }
}
