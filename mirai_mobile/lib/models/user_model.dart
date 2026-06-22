class UserModel {
  final String id;
  final String email;
  final String name;
  final String? avatar;
  final String role;
  final String? status;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    this.avatar,
    required this.role,
    this.status,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      avatar: json['avatar'] as String?,
      role: json['role'] as String? ?? 'user',
      status: json['status'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
      'role': role,
      'status': status,
    };
  }
}
