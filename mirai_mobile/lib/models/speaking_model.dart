class SpeakingMessage {
  final String id;
  final String sender;
  final String text;
  final String? japanese;
  final bool partial;
  final String? turnId;
  final String? analysis;
  final String? translation;
  final String? audioUrl;
  final DateTime timestamp;

  SpeakingMessage({
    required this.id,
    required this.sender,
    required this.text,
    this.japanese,
    this.partial = false,
    this.turnId,
    this.analysis,
    this.translation,
    this.audioUrl,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  factory SpeakingMessage.fromJson(Map<String, dynamic> json) {
    return SpeakingMessage(
      id: json['_id'] as String? ?? json['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
      sender: json['sender'] as String? ?? 'unknown',
      text: json['text'] as String? ?? '',
      japanese: json['japanese'] as String?,
      partial: json['partial'] as bool? ?? false,
      turnId: json['turnId'] as String?,
      analysis: json['analysis'] as String?,
      translation: json['translation'] as String?,
      audioUrl: json['audio_url'] as String?,
      timestamp: json['timestamp'] != null ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now() : DateTime.now(),
    );
  }

  bool get isUser => sender == 'user';
  bool get isCoach => sender == 'coach' || sender == 'assistant' || sender == 'ai';

  SpeakingMessage copyWith({
    String? id,
    String? sender,
    String? text,
    String? japanese,
    bool? partial,
    String? turnId,
    String? analysis,
    String? translation,
    String? audioUrl,
    DateTime? timestamp,
  }) {
    return SpeakingMessage(
      id: id ?? this.id,
      sender: sender ?? this.sender,
      text: text ?? this.text,
      japanese: japanese ?? this.japanese,
      partial: partial ?? this.partial,
      turnId: turnId ?? this.turnId,
      analysis: analysis ?? this.analysis,
      translation: translation ?? this.translation,
      audioUrl: audioUrl ?? this.audioUrl,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}

class GrammarNote {
  final String id;
  final String original;
  final String corrected;
  final String? explanation;
  final String status;

  GrammarNote({
    required this.id,
    required this.original,
    required this.corrected,
    this.explanation,
    this.status = 'learning',
  });

  factory GrammarNote.fromJson(Map<String, dynamic> json) {
    return GrammarNote(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      original: json['original'] as String? ?? '',
      corrected: json['corrected'] as String? ?? '',
      explanation: json['explanation'] as String?,
      status: json['status'] as String? ?? 'learning',
    );
  }
}
