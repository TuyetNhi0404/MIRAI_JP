class GrammarExample {
  final String jp;
  final String vi;
  final String? romaji;

  GrammarExample({
    required this.jp,
    required this.vi,
    this.romaji,
  });

  factory GrammarExample.fromJson(Map<String, dynamic> json) {
    return GrammarExample(
      jp: json['jp']?.toString() ?? '',
      vi: json['vi']?.toString() ?? '',
      romaji: json['romaji']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'jp': jp,
      'vi': vi,
      'romaji': romaji,
    };
  }
}

class GrammarCardModel {
  final String id;
  final String level;
  final String title;
  final String structure;
  final String meaningVi;
  final String explanation;
  final List<GrammarExample> examples;
  
  // Local state for tracking student learning
  bool isMastered;

  GrammarCardModel({
    required this.id,
    required this.level,
    required this.title,
    required this.structure,
    required this.meaningVi,
    required this.explanation,
    required this.examples,
    this.isMastered = false,
  });

  factory GrammarCardModel.fromJson(Map<String, dynamic> json) {
    var exampleList = json['examples'] as List? ?? [];
    List<GrammarExample> parsedExamples = exampleList
        .map((e) => GrammarExample.fromJson(Map<String, dynamic>.from(e)))
        .toList();

    return GrammarCardModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      level: json['level']?.toString() ?? 'N5',
      title: json['title']?.toString() ?? '',
      structure: json['structure']?.toString() ?? '',
      meaningVi: json['meaningVi']?.toString() ?? '',
      explanation: json['explanation']?.toString() ?? '',
      examples: parsedExamples,
      isMastered: json['isMastered'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'level': level,
      'title': title,
      'structure': structure,
      'meaningVi': meaningVi,
      'explanation': explanation,
      'examples': examples.map((e) => e.toJson()).toList(),
    };
  }
}
