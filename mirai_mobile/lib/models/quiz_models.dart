class QuizQuestion {
  final String id;
  final int order;
  final String questionText;
  final List<String> options;

  QuizQuestion({
    required this.id,
    required this.order,
    required this.questionText,
    required this.options,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      order: json['order'] as int? ?? 0,
      questionText: json['question'] as String? ?? json['questionText'] as String? ?? '',
      options: List<String>.from(json['options'] ?? []),
    );
  }
}

class Quiz {
  final String id;
  final String title;
  final String? description;
  final String courseId;
  final int totalQuestions;
  final int? durationMinutes;
  final DateTime? dueDate;
  final bool isActive;
  final List<QuizQuestion>? questions;

  Quiz({
    required this.id,
    required this.title,
    this.description,
    required this.courseId,
    required this.totalQuestions,
    this.durationMinutes,
    this.dueDate,
    required this.isActive,
    this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) {
    final rawQuestions = json['questions'] as List?;
    List<QuizQuestion>? parsedQuestions;
    if (rawQuestions != null) {
      parsedQuestions = rawQuestions.map((item) => QuizQuestion.fromJson(item)).toList();
    }
    
    final rawCourseId = json['courseId'];
    String parsedCourseId = '';
    if (rawCourseId is Map<String, dynamic>) {
      parsedCourseId = rawCourseId['_id'] as String? ?? rawCourseId['id'] as String? ?? '';
    } else if (rawCourseId is String) {
      parsedCourseId = rawCourseId;
    }

    return Quiz(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      courseId: parsedCourseId,
      totalQuestions: json['totalQuestions'] as int? ?? json['questionsCount'] as int? ?? 0,
      durationMinutes: json['durationMinutes'] as int?,
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      isActive: json['isActive'] as bool? ?? true,
      questions: parsedQuestions,
    );
  }
}

class QuizWithAttempt {
  final Quiz quiz;
  final String? courseName;
  final bool hasAttempted;
  final int? attemptScore;
  final double? attemptPercentage;
  final bool? attemptPassed;
  final DateTime? attemptCompletedAt;

  QuizWithAttempt({
    required this.quiz,
    this.courseName,
    required this.hasAttempted,
    this.attemptScore,
    this.attemptPercentage,
    this.attemptPassed,
    this.attemptCompletedAt,
  });

  factory QuizWithAttempt.fromJson(Map<String, dynamic> json) {
    return QuizWithAttempt(
      quiz: Quiz.fromJson(json),
      courseName: json['courseName'] as String?,
      hasAttempted: json['hasAttempted'] as bool? ?? false,
      attemptScore: json['attemptScore'] as int?,
      attemptPercentage: json['attemptPercentage'] != null
          ? (json['attemptPercentage'] as num).toDouble()
          : null,
      attemptPassed: json['attemptPassed'] as bool?,
      attemptCompletedAt: json['attemptCompletedAt'] != null
          ? DateTime.tryParse(json['attemptCompletedAt'] as String)
          : null,
    );
  }
}

class QuizAttempt {
  final String id;
  final String quizId;
  final String quizTitle;
  final String studentId;
  final List<int> answers;
  final int score;
  final double percentage;
  final bool passed;
  final int timeSpent;
  final DateTime completedAt;

  QuizAttempt({
    required this.id,
    required this.quizId,
    required this.quizTitle,
    required this.studentId,
    required this.answers,
    required this.score,
    required this.percentage,
    required this.passed,
    required this.timeSpent,
    required this.completedAt,
  });

  factory QuizAttempt.fromJson(Map<String, dynamic> json) {
    final quizData = json['quizId'];
    String qId = '';
    String qTitle = '';
    if (quizData is Map<String, dynamic>) {
      qId = quizData['_id'] as String? ?? '';
      qTitle = quizData['title'] as String? ?? '';
    } else if (quizData is String) {
      qId = quizData;
    }
    return QuizAttempt(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      quizId: qId,
      quizTitle: qTitle.isEmpty ? (json['quizTitle'] as String? ?? '') : qTitle,
      studentId: json['studentId'] as String? ?? '',
      answers: List<int>.from(json['answers'] ?? []),
      score: json['score'] as int? ?? 0,
      percentage: json['percentage'] != null ? (json['percentage'] as num).toDouble() : 0.0,
      passed: json['passed'] as bool? ?? false,
      timeSpent: json['timeSpent'] as int? ?? 0,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class AttemptDetailResult {
  final int questionIndex;
  final String question;
  final List<String> options;
  final int studentAnswer;
  final int correctAnswer;
  final bool isCorrect;

  AttemptDetailResult({
    required this.questionIndex,
    required this.question,
    required this.options,
    required this.studentAnswer,
    required this.correctAnswer,
    required this.isCorrect,
  });

  factory AttemptDetailResult.fromJson(Map<String, dynamic> json) {
    return AttemptDetailResult(
      questionIndex: json['questionIndex'] as int? ?? 0,
      question: json['question'] as String? ?? '',
      options: List<String>.from(json['options'] ?? []),
      studentAnswer: json['studentAnswer'] as int? ?? 0,
      correctAnswer: json['correctAnswer'] as int? ?? 0,
      isCorrect: json['isCorrect'] as bool? ?? false,
    );
  }
}

class AttemptDetailResponse {
  final String attemptId;
  final String quizTitle;
  final int score;
  final int totalQuestions;
  final double percentage;
  final bool passed;
  final int timeSpent;
  final DateTime completedAt;
  final List<AttemptDetailResult> results;

  AttemptDetailResponse({
    required this.attemptId,
    required this.quizTitle,
    required this.score,
    required this.totalQuestions,
    required this.percentage,
    required this.passed,
    required this.timeSpent,
    required this.completedAt,
    required this.results,
  });

  factory AttemptDetailResponse.fromJson(Map<String, dynamic> json) {
    var rawResults = json['results'] as List? ?? [];
    return AttemptDetailResponse(
      attemptId: json['attemptId'] as String? ?? json['attempt']?['_id'] as String? ?? '',
      quizTitle: json['quizTitle'] as String? ?? json['quiz']?['title'] as String? ?? 'Bài kiểm tra',
      score: json['score'] as int? ?? 0,
      totalQuestions: json['totalQuestions'] as int? ?? 0,
      percentage: json['percentage'] != null ? (json['percentage'] as num).toDouble() : 0.0,
      passed: json['passed'] as bool? ?? false,
      timeSpent: json['timeSpent'] as int? ?? 0,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      results: rawResults.map((e) => AttemptDetailResult.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
