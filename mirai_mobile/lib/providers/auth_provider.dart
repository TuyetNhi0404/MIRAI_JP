import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/google_auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final GoogleAuthService _googleAuthService = GoogleAuthService();

  UserModel? _user;
  String? _accessToken;
  String? _refreshToken;
  bool _isLoading = false;
  bool _isInitialized = false;

  UserModel? get user => _user;
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  bool get isAuthenticated => _accessToken != null;

  AuthProvider() {
    loadSession();
  }

  // Load persistent session on app launch
  Future<void> loadSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      _accessToken = prefs.getString('accessToken');
      _refreshToken = prefs.getString('refreshToken');

      final String? userJson = prefs.getString('user');
      if (userJson != null) {
        _user = UserModel.fromJson(jsonDecode(userJson));
      }

      // If we have a refresh token, validate/refresh the session
      if (_refreshToken != null) {
        try {
          final String newAccessToken = await _apiService.refreshToken(_refreshToken!);
          _accessToken = newAccessToken;
          await prefs.setString('accessToken', newAccessToken);
        } catch (_) {
          // Token expired or invalid, clear session
          await clearSession();
        }
      } else {
        await clearSession();
      }
    } catch (e) {
      await clearSession();
    } finally {
      _isLoading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  // Register Account
  Future<void> register(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.register(email, password);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Traditional email/password login
  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      await _saveSession(response);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Google authentication
  Future<void> loginWithGoogle() async {
    _isLoading = true;
    notifyListeners();

    try {
      final String? googleToken = await _googleAuthService.signIn();
      if (googleToken == null) {
        // User cancelled sign-in
        _isLoading = false;
        notifyListeners();
        return;
      }

      final response = await _apiService.googleLogin(googleToken);
      await _saveSession(response);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Helper to persist credentials
  Future<void> _saveSession(Map<String, dynamic> data) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    _accessToken = data['accessToken'] as String?;
    _refreshToken = data['refreshToken'] as String?;
    
    if (data['user'] != null) {
      _user = UserModel.fromJson(data['user']);
      await prefs.setString('user', jsonEncode(_user!.toJson()));
    }

    if (_accessToken != null) {
      await prefs.setString('accessToken', _accessToken!);
    }
    if (_refreshToken != null) {
      await prefs.setString('refreshToken', _refreshToken!);
    }

    _isLoading = false;
    notifyListeners();
  }

  // Logout session
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      if (_accessToken != null) {
        await _apiService.logout(_accessToken);
      }
    } catch (_) {
      // Ignore backend errors on logout to allow clean state local logout
    }

    try {
      await _googleAuthService.signOut();
    } catch (_) {}

    await clearSession();
    _isLoading = false;
    notifyListeners();
  }

  // Update local user details and sync to SharedPreferences
  Future<void> updateLocalUser(UserModel updatedUser) async {
    _user = updatedUser;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString('user', jsonEncode(_user!.toJson()));
    notifyListeners();
  }

  // Reset states and clear cache
  Future<void> clearSession() async {
    _user = null;
    _accessToken = null;
    _refreshToken = null;

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    await prefs.remove('user');
  }
}
