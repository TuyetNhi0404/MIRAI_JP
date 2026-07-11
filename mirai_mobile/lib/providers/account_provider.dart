import 'package:flutter/material.dart';
import '../models/account_model.dart';
import '../services/api_service.dart';

class AccountProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<AccountUser> _users = [];
  bool _isLoading = false;
  String? _error;
  String _selectedRole = 'teacher';
  String _searchQuery = '';

  List<AccountUser> get users => _filteredUsers;
  List<AccountUser> get allUsers => _users;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get selectedRole => _selectedRole;

  int get studentCount => _users.where((u) => u.role == 'student').length;
  int get teacherCount => _users.where((u) => u.role == 'teacher').length;
  int get adminCount => _users.where((u) => u.role == 'admin').length;

  List<AccountUser> get _filteredUsers {
    return _users.where((u) {
      final roleMatch = u.role == _selectedRole;
      final searchMatch = _searchQuery.isEmpty ||
          u.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          u.email.toLowerCase().contains(_searchQuery.toLowerCase());
      return roleMatch && searchMatch;
    }).toList();
  }

  void setRole(String role) {
    if (_selectedRole == role) return;
    _selectedRole = role;
    notifyListeners();
  }

  void setSearch(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<void> fetchUsers(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _apiService.fetchUsers(token);
      final usersList = res['users'] as List<dynamic>? ?? [];
      _users = usersList.map((e) => AccountUser.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _error = 'Không thể tải danh sách người dùng';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleStatus(String token, String userId, bool lock) async {
    try {
      if (lock) {
        await _apiService.lockUser(token, userId);
      } else {
        await _apiService.unlockUser(token, userId);
      }
      final idx = _users.indexWhere((u) => u.id == userId);
      if (idx != -1) {
        _users[idx] = AccountUser(
          id: _users[idx].id,
          name: _users[idx].name,
          email: _users[idx].email,
          role: _users[idx].role,
          status: lock ? 'locked' : 'active',
          avatar: _users[idx].avatar,
          description: _users[idx].description,
          createdAt: _users[idx].createdAt,
          updatedAt: _users[idx].updatedAt,
          lastLogin: _users[idx].lastLogin,
        );
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }
}
