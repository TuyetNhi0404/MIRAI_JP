class AccountUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String status;
  final String? avatar;
  final String? description;
  final String createdAt;
  final String updatedAt;
  final String? lastLogin;

  AccountUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    this.avatar,
    this.description,
    required this.createdAt,
    required this.updatedAt,
    this.lastLogin,
  });

  factory AccountUser.fromJson(Map<String, dynamic> json) {
    return AccountUser(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'student',
      status: json['status'] as String? ?? 'active',
      avatar: json['avatar'] as String?,
      description: json['description'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      lastLogin: json['lastLogin'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'email': email,
    'role': role,
    'status': status,
    'avatar': avatar,
    'description': description,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'lastLogin': lastLogin,
  };

  String get roleLabel {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'teacher': return 'Giáo viên';
      case 'student': return 'Học viên';
      default: return 'Người dùng';
    }
  }

  bool get isActive => status == 'active';
  bool get isLocked => status == 'locked';
}
